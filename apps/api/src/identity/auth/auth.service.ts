import { Inject, Injectable, Optional } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { isValidEmailSyntax, normalizeEmail } from '../../common/email/normalize-email.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { MailBudget } from '../../common/mail/mail-budget.service.js';
import { MailDispatcher, sendPrepared, type MailJob } from '../../common/mail/mail-dispatcher.service.js';
import { dateValue, localDate } from '../../common/time/local-date.js';
import { MIN_AGE, isOldEnough } from '../profile/person.js';
import { canonicalTimeZone } from '../profile/timezone.js';
import { SessionService, type IssuedSession } from '../sessions/session.service.js';
import { withUserLock } from '../user-lock.js';
import type { LoginBody, RegisterBody } from './auth.schemas.js';
import { clientIpKey } from './client-ip-key.js';
import { accountLocked, decideCredential } from './credential-decision.js';
import { OtpService, otpLocked } from './otp.service.js';
import type { VerifyEmailBody } from './otp.schemas.js';
import { PasswordHasher } from './password-hasher.service.js';
import { checkPasswordPolicy, normalizePassword } from './password-policy.js';
import { TermsVersion } from '../profile/terms-version.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasher,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(MailBudget) private readonly budget: MailBudget,
    @Inject(MailDispatcher) private readonly dispatcher: MailDispatcher,
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(AppLogger) private readonly logger: AppLogger,
    @Optional() @Inject(TermsVersion) private readonly terms?: TermsVersion,
  ) {}

  async register(body: RegisterBody, res: Response): Promise<{ email: string }> {
    const email = normalizeEmail(body.email);
    if (!email || !isValidEmailSyntax(email)) throw this.validationFailed();
    const violations = checkPasswordPolicy(body.password);
    if (violations.length > 0) throw this.validationFailed({ violations });
    const timezone = canonicalTimeZone(body.timezone);
    if (timezone === null) throw this.validationFailed();
    const today = localDate(timezone, this.clock.now());
    if (body.birth_date > today) throw this.validationFailed();
    if (!isOldEnough(body.birth_date, today, MIN_AGE)) {
      this.logger.info('register_rejected_age', { reason: 'below-minimum' });
      throw new ProblemDetailsException({ status: 400, title: 'Age below minimum', type: 'age-below-minimum' });
    }
    await this.budget.assertAvailable();
    const hash = await this.hasher.hash(body.password);
    const termsVersion = await (this.terms?.current() ?? this.config.termsVersion);
    // Count every registration before lookup; a new email still gets its first code.
    const mailAllowed = await this.otp.tryLimitEmail(email);
    // A preallocated ID lets even a new account follow the lock-first protocol.
    const newUserId = randomUUID();
    let outcome: { userId: string; mail: boolean };
    try {
      outcome = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({ where: { email } });
        const userId = existing?.id ?? newUserId;
        await withUserLock(tx, userId);
        const now = this.clock.now();
        const data = {
          timezone, givenName: body.given_name, familyName: body.family_name ?? null,
          birthDate: dateValue(body.birth_date), termsAcceptedAt: now, termsVersion,
          updatedAt: now,
        };
        if (!existing) {
          await tx.user.create({ data: { id: userId, email, ...data, createdAt: now } });
          await tx.passwordCredential.create({ data: { userId, hash, updatedAt: now } });
          return { userId, mail: true };
        }
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (user?.status === 'deleting') throw this.emailTaken('account-deleting');
        if (!user || user.emailVerifiedAt !== null || user.status !== 'active') throw this.emailTaken();
        // No mailbox proof yet: the new password and profile wait until verify-email confirms them (review F3).
        const pending = { passwordHash: hash, givenName: data.givenName, familyName: data.familyName, birthDate: data.birthDate,
          timezone, termsVersion, termsAcceptedAt: now, createdAt: now };
        await tx.pendingRegistration.upsert({ where: { userId }, create: { userId, ...pending }, update: pending });
        return { userId, mail: mailAllowed };
      }, transactionOptions);
    } catch (error) {
      if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw this.emailTaken();
      }
      throw error;
    }
    if (outcome.mail) {
      const { userId } = outcome;
      const job: MailJob = async () => this.otp.noteIssued(userId, 'verify_email', await this.prisma.$transaction(async (tx) => {
        await withUserLock(tx, userId);
        return this.otp.issueInTx(tx, userId, 'verify_email');
      }, transactionOptions));
      this.dispatcher.afterResponse(res, [job]);
    }
    return { email };
  }

  async login(body: LoginBody, res: Response, clientIp?: string): Promise<IssuedSession> {
    const email = normalizeEmail(body.email);
    const failedSubject = { email_hmac: createHmac('sha256', this.config.rateLimitHmacKey)
      .update(email ?? body.email).digest('hex') };
    if ([...normalizePassword(body.password)].length > 128) {
      this.logger.info('login_failed', failedSubject);
      throw this.invalidCredentials();
    }
    const account = email ? await this.prisma.user.findUnique({
      where: { email }, include: { passwordCredential: true },
    }) : null;
    if (!account?.passwordCredential) {
      await this.hasher.verifyDummy(body.password);
      this.logger.info('login_failed', failedSubject);
      throw this.invalidCredentials();
    }
    const verifiedHash = account.passwordCredential.hash;
    const passwordMatched = await this.hasher.verify(verifiedHash, body.password);
    const outcome = await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, account.id);
      const { kind, newlyLocked } = await decideCredential(tx, {
        userId: account.id, verifiedHash, passwordMatched, ipKey: clientIpKey(clientIp, this.config.rateLimitHmacKey),
      }, this.clock);
      // newlyLocked tells a lock this request established (logged) from one it merely observed.
      if (kind !== 'ok') return { kind, newlyLocked };
      const user = await tx.user.findUnique({ where: { id: account.id }, select: { emailVerifiedAt: true } });
      if (user?.emailVerifiedAt === null) return { kind: 'unverified' as const };
      return { kind, session: await this.sessions.startChain(tx, {
        userId: account.id, client: body.client, deviceLabel: body.device_label,
      }) };
    }, transactionOptions);
    if (outcome.kind !== 'ok') {
      this.logger.info('login_failed', outcome.kind === 'account_locked'
        ? { user_id: account.id, reason: 'account_locked' } : { user_id: account.id });
      if (outcome.newlyLocked) this.logger.warn('login_locked', { user_id: account.id });
      // Reached only with the right password: a wrong one on a locked account stays the generic 401.
      if (outcome.kind === 'account_locked') throw accountLocked();
      if (outcome.kind === 'unverified') {
        await this.otp.sendVerifyCodeQuietly(account.id, account.email, res);
        throw new ProblemDetailsException({ status: 403, title: 'Email not verified', type: 'email-not-verified' });
      }
      throw this.invalidCredentials();
    }
    return outcome.session;
  }

  async verifyEmail(body: VerifyEmailBody, res: Response): Promise<IssuedSession> {
    const email = normalizeEmail(body.email);
    if ([...normalizePassword(body.password)].length > 128) throw this.invalidOtp();
    const account = email ? await this.prisma.user.findUnique({
      where: { email }, include: { passwordCredential: true, pendingRegistration: true },
    }) : null;
    if (!account?.passwordCredential) {
      await this.hasher.verifyDummy(body.password);
      throw this.invalidOtp();
    }
    // The current password wins; a pending re-registration's password counts only when it does not match (review F3).
    const pendingHash = account.pendingRegistration?.passwordHash;
    let matched: { hash: string; pending: boolean } | null = null;
    if (await this.hasher.verify(account.passwordCredential.hash, body.password)) matched = { hash: account.passwordCredential.hash, pending: false };
    else if (pendingHash && await this.hasher.verify(pendingHash, body.password)) matched = { hash: pendingHash, pending: true };
    if (!matched) throw this.invalidOtp();
    const { hash: verifiedHash, pending: pendingMatched } = matched;
    const outcome = await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, account.id);
      const current = await tx.user.findUnique({
        where: { id: account.id }, include: { passwordCredential: true, pendingRegistration: true },
      });
      const currentHash = pendingMatched ? current?.pendingRegistration?.passwordHash : current?.passwordCredential?.hash;
      if (!current || currentHash !== verifiedHash
        || current.status !== 'active' || current.emailVerifiedAt !== null) return { kind: 'no_live_code' as const };
      const result = await this.otp.checkInTx(tx, account.id, 'verify_email', body.code);
      if (result.kind !== 'ok') return result;
      const now = this.clock.now();
      const pending = current.pendingRegistration;
      if (pendingMatched && pending) {
        const { givenName, familyName, birthDate, timezone, termsVersion, termsAcceptedAt } = pending;
        await tx.user.update({ where: { id: account.id }, data: {
          givenName, familyName, birthDate, timezone, termsVersion, termsAcceptedAt, emailVerifiedAt: now, updatedAt: now,
        } });
        await tx.passwordCredential.upsert({ where: { userId: account.id },
          create: { userId: account.id, hash: verifiedHash, updatedAt: now }, update: { hash: verifiedHash, updatedAt: now } });
        await this.sessions.revokeAllForUser(tx, account.id, 'reregistered');
        await tx.loginFailure.deleteMany({ where: { userId: account.id } });
      } else {
        await tx.user.update({ where: { id: account.id }, data: { emailVerifiedAt: now } });
      }
      if (pending) await tx.pendingRegistration.deleteMany({ where: { userId: account.id } });
      const session = await this.sessions.startChain(tx, {
        userId: account.id, client: body.client, deviceLabel: body.device_label,
      });
      return { kind: 'ok' as const, session };
    }, transactionOptions);
    if (outcome.kind === 'locked') {
      if (outcome.notice) {
        this.logger.warn('otp_locked', { user_id: account.id, purpose: 'verify_email' });
        this.dispatcher.afterResponse(res, [sendPrepared(outcome.notice)]);
      }
      throw otpLocked(outcome.lockedUntil, this.clock.now());
    }
    if (outcome.kind !== 'ok') throw this.invalidOtp();
    return outcome.session;
  }

  private invalidOtp(): ProblemDetailsException {
    return new ProblemDetailsException({ status: 400, title: 'Invalid OTP', type: 'invalid-otp' });
  }
  private emailTaken(reason?: 'account-deleting'): ProblemDetailsException {
    return new ProblemDetailsException({ status: 409, title: 'Email taken', type: 'email-taken',
      ...(reason ? { extensions: { reason } } : {}) });
  }
  private validationFailed(extensions?: Record<string, unknown>): ProblemDetailsException {
    return new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed', extensions });
  }
  private invalidCredentials(): ProblemDetailsException {
    return new ProblemDetailsException({ status: 401, title: 'Invalid credentials', type: 'invalid-credentials' });
  }
}
