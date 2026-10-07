import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { normalizeEmail } from '../../common/email/normalize-email.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { MailDispatcher, sendPrepared } from '../mailer/mail-dispatcher.service.js';
import type { MailMessage } from '../mailer/mailer.js';
import { passwordChangedMail, passwordResetMail } from '../mailer/templates.js';
import { SessionService, type IssuedSession } from '../sessions/session.service.js';
import { withUserLock } from '../user-lock.js';
import { decideCredential } from './credential-decision.js';
import { OtpService, type OtpCheckOutcome } from './otp.service.js';
import { PasswordHasher } from './password-hasher.service.js';
import { checkPasswordPolicy } from './password-policy.js';
import type { ChangeBody, ResetBody } from './password.schemas.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
type ChangeOutcome =
  | { kind: 'ok'; session: IssuedSession; message: MailMessage }
  | { kind: 'wrong' | 'stale' | 'invalid_session' }
  | { kind: 'locked'; lockedUntil: Date; newlyLocked: boolean };
type ResetOutcome = Exclude<OtpCheckOutcome, { kind: 'ok' }> | { kind: 'ok'; message: MailMessage };

@Injectable()
export class PasswordService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasher,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(MailDispatcher) private readonly dispatcher: MailDispatcher,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async change(user: RequestUser, body: ChangeBody, res: Response): Promise<IssuedSession> {
    this.assertPolicy(body.new_password);
    const account = await this.prisma.user.findUnique({
      where: { id: user.userId }, include: { passwordCredential: true },
    });
    if (!account) throw this.invalidToken();
    if (!account.passwordCredential) throw this.invalidCurrentPassword();
    const verifiedHash = account.passwordCredential.hash;
    const passwordMatched = await this.hasher.verify(verifiedHash, body.current_password);
    const hash = await this.hasher.hash(body.new_password);
    const outcome = await this.prisma.$transaction(async (tx): Promise<ChangeOutcome> => {
      await withUserLock(tx, user.userId);
      const current = await tx.user.findUnique({ where: { id: user.userId } });
      const chain = await tx.sessionChain.findUnique({ where: { id: user.sessionChainId } });
      if (!current || !chain || chain.userId !== user.userId
        || (chain.clientType !== 'web' && chain.clientType !== 'mobile')) {
        return { kind: 'invalid_session' };
      }
      // Revoked chains can still be named by valid access tokens (design §4).
      // Their transport metadata is sufficient; credential freshness decides the change.
      const kind = await decideCredential(tx, { userId: user.userId, verifiedHash, passwordMatched }, this.clock);
      if (kind === 'locked') {
        const locked = await tx.user.findUnique({ where: { id: user.userId } });
        if (!locked?.loginLockedUntil) throw new Error('Credential lock outcome has no expiry');
        return { kind, lockedUntil: locked.loginLockedUntil,
          newlyLocked: locked.loginLockedUntil.getTime() !== current.loginLockedUntil?.getTime() };
      }
      if (kind !== 'ok') return { kind };
      await tx.passwordCredential.update({ where: { userId: user.userId }, data: { hash, updatedAt: this.clock.now() } });
      await this.sessions.revokeAllForUser(tx, user.userId, 'password_changed');
      const session = await this.sessions.startChain(tx, {
        userId: user.userId, client: chain.clientType, deviceLabel: chain.deviceLabel ?? undefined,
      });
      return { kind, session, message: passwordChangedMail(current.email) };
    }, transactionOptions);
    if (outcome.kind === 'invalid_session') throw this.invalidToken();
    if (outcome.kind === 'locked') {
      if (outcome.newlyLocked) {
        this.logger.warn('login_locked', { user_id: user.userId });
        // This wrong password established the lock; only subsequent attempts are rate-limited.
        throw this.invalidCurrentPassword();
      }
      throw new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited',
        retryAfterSeconds: Math.max(1, Math.ceil((outcome.lockedUntil.getTime() - this.clock.now().getTime()) / 1000)) });
    }
    if (outcome.kind !== 'ok') throw this.invalidCurrentPassword();
    this.dispatcher.afterResponse(res, [sendPrepared(outcome.message)]);
    return outcome.session;
  }

  async reset(body: ResetBody, res: Response): Promise<void> {
    this.assertPolicy(body.new_password);
    const email = normalizeEmail(body.email);
    if (!email) throw this.invalidOtp();
    const account = await this.prisma.user.findUnique({ where: { email } });
    if (!account) throw this.invalidOtp();
    const hash = await this.hasher.hash(body.new_password);
    const outcome = await this.prisma.$transaction(async (tx): Promise<ResetOutcome> => {
      await withUserLock(tx, account.id);
      const current = await tx.user.findUnique({ where: { id: account.id } });
      if (!current) return { kind: 'no_live_code' };
      const result = await this.otp.checkInTx(tx, account.id, 'reset_password', body.code);
      if (result.kind !== 'ok') return result;
      const now = this.clock.now();
      await tx.passwordCredential.upsert({ where: { userId: account.id },
        create: { userId: account.id, hash, updatedAt: now }, update: { hash, updatedAt: now } });
      await this.sessions.revokeAllForUser(tx, account.id, 'password_reset');
      await tx.user.update({ where: { id: account.id }, data: {
        emailVerifiedAt: current.emailVerifiedAt ?? now, failedLoginCount: 0, loginLockedUntil: null,
      } });
      return { kind: 'ok', message: passwordResetMail(current.email) };
    }, transactionOptions);
    // The counted failure and lock have committed. Register the one-time notice
    // before mapping even a locked reset to the same generic invalid-otp error.
    if (outcome.kind === 'locked' && outcome.notice) {
      this.logger.warn('otp_locked', { user_id: account.id, purpose: 'reset_password' });
      this.dispatcher.afterResponse(res, [sendPrepared(outcome.notice)]);
    }
    if (outcome.kind !== 'ok') throw this.invalidOtp();
    this.dispatcher.afterResponse(res, [sendPrepared(outcome.message)]);
  }

  private assertPolicy(password: string): void {
    const violations = checkPasswordPolicy(password);
    if (violations.length > 0) throw new ProblemDetailsException({ status: 400, title: 'Validation failed',
      type: 'validation-failed', extensions: { violations } });
  }
  private invalidCurrentPassword(): ProblemDetailsException {
    return new ProblemDetailsException({ status: 400, title: 'Invalid current password', type: 'invalid-current-password' });
  }
  private invalidOtp(): ProblemDetailsException {
    return new ProblemDetailsException({ status: 400, title: 'Invalid OTP', type: 'invalid-otp' });
  }
  private invalidToken(): ProblemDetailsException {
    return new ProblemDetailsException({ status: 401, title: 'Invalid token', type: 'invalid-token' });
  }
}
