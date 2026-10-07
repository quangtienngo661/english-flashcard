import { Inject, Injectable } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { normalizeEmail } from '../../common/email/normalize-email.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { recordOtpFailure } from '../../generated/prisma/sql.js';
import type { OtpPurpose } from '../identity.types.js';
import { MailBudget } from '../mailer/mail-budget.service.js';
import { MailDispatcher, sendPrepared, type MailJob } from '../mailer/mail-dispatcher.service.js';
import type { MailMessage } from '../mailer/mailer.js';
import { otpMail, otpLockedMail } from '../mailer/templates.js';
import { withUserLock } from '../user-lock.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const day = 86_400_000;
export type OtpCheckOutcome =
  | { kind: 'ok' }
  | { kind: 'wrong' | 'no_live_code' }
  | { kind: 'locked'; lockedUntil: Date; notice: MailMessage | null };

@Injectable()
export class OtpService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
    @Inject(MailBudget) private readonly budget: MailBudget,
    @Inject(MailDispatcher) private readonly dispatcher: MailDispatcher,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /** Caller must hold withUserLock(tx, userId). Returns mail only after preparing DB state. */
  async issueInTx(tx: Prisma.TransactionClient, userId: string, purpose: OtpPurpose): Promise<MailMessage | null> {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || (purpose === 'verify_email' && user.emailVerifiedAt !== null)) return null;
    const window = await tx.otpFailureWindow.findUnique({ where: { userId_purpose: { userId, purpose } } });
    const now = this.clock.now();
    if (window?.lockedUntil && window.lockedUntil > now) return null;
    await tx.otpCode.updateMany({
      where: { userId, purpose, consumedAt: null, invalidatedAt: null, expiresAt: { gt: now } },
      data: { invalidatedAt: now },
    });
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await tx.otpCode.create({ data: {
      userId, purpose, codeHmac: this.hmac(code).toString('hex'),
      expiresAt: new Date(now.getTime() + 600_000), createdAt: now,
    } });
    return otpMail(user.email, purpose, code);
  }

  /** Design §7 event, logged only after the issuing transaction committed; never carries code or address. */
  noteIssued(userId: string, purpose: OtpPurpose, message: MailMessage | null): MailMessage | null {
    if (message) this.logger.info('otp_sent', { user_id: userId, purpose });
    return message;
  }

  async requestVerifyEmail(user: RequestUser, res: Response): Promise<void> {
    const account = await this.prisma.user.findUnique({ where: { id: user.userId } });
    if (!account) throw this.invalidToken();
    await this.limitEmail(account.email);
    const where = { userId_purpose: { userId: user.userId, purpose: 'verify_email' } };
    const window = await this.prisma.otpFailureWindow.findUnique({ where });
    if (window?.lockedUntil && window.lockedUntil > this.clock.now()) throw this.locked(window.lockedUntil);
    await this.budget.assertAvailable();
    const outcome = await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, user.userId);
      // Re-read the purpose lock after acquiring the user lock: another check may
      // have committed its 21st failure while this request was waiting.
      const current = await tx.otpFailureWindow.findUnique({ where });
      if (current?.lockedUntil && current.lockedUntil > this.clock.now()) {
        return { kind: 'locked' as const, lockedUntil: current.lockedUntil };
      }
      return { kind: 'issued' as const, message: await this.issueInTx(tx, user.userId, 'verify_email') };
    }, transactionOptions);
    if (outcome.kind === 'locked') throw this.locked(outcome.lockedUntil);
    this.dispatcher.afterResponse(res, [sendPrepared(this.noteIssued(user.userId, 'verify_email', outcome.message))]);
  }

  async requestPasswordReset(rawEmail: string, res: Response): Promise<void> {
    const email = normalizeEmail(rawEmail);
    if (!email) {
      throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
    }
    await this.limitEmail(email);
    await this.budget.assertAvailable();
    // No account-specific work occurs until close, including the lookup itself.
    const job: MailJob = async () => {
      const account = await this.prisma.user.findUnique({ where: { email } });
      if (!account) return null;
      const message = await this.prisma.$transaction(async (tx) => {
        await withUserLock(tx, account.id);
        return this.issueInTx(tx, account.id, 'reset_password');
      }, transactionOptions);
      return this.noteIssued(account.id, 'reset_password', message);
    };
    this.dispatcher.afterResponse(res, [job]);
  }

  /** Caller holds the user lock; expected denials are returned so writes can commit. */
  async checkInTx(tx: Prisma.TransactionClient, userId: string, purpose: OtpPurpose, code: string): Promise<OtpCheckOutcome> {
    const window = await tx.otpFailureWindow.findUnique({ where: { userId_purpose: { userId, purpose } } });
    const now = this.clock.now();
    if (window?.lockedUntil && window.lockedUntil > now) {
      return { kind: 'locked', lockedUntil: window.lockedUntil, notice: null };
    }
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) return { kind: 'no_live_code' };
    const live = { userId, purpose, consumedAt: null, invalidatedAt: null, expiresAt: { gt: now }, attempts: { lt: 5 } };
    const row = await tx.otpCode.findFirst({ where: live });
    if (!row) return { kind: 'no_live_code' };
    const digest = this.hmac(trimmed);
    const stored = Buffer.from(row.codeHmac, 'hex');
    const matched = stored.length === digest.length && timingSafeEqual(stored, digest);
    const updated = await tx.otpCode.updateMany({
      where: { ...live, id: row.id },
      data: matched ? { consumedAt: now } : { attempts: { increment: 1 } },
    });
    if (updated.count !== 1) return { kind: 'no_live_code' };
    if (matched) return { kind: 'ok' };
    const [failure] = await tx.$queryRawTyped(recordOtpFailure(userId, purpose, now));
    if (failure.failures === 21) {
      const lockedUntil = new Date(now.getTime() + day);
      await tx.otpFailureWindow.update({ where: { userId_purpose: { userId, purpose } }, data: { lockedUntil } });
      const account = await tx.user.findUnique({ where: { id: userId } });
      return { kind: 'locked', lockedUntil, notice: account ? otpLockedMail(account.email, purpose) : null };
    }
    return { kind: 'wrong' };
  }

  async verifyEmail(user: RequestUser, code: string, res: Response): Promise<{ email_verified: true }> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, user.userId);
      const account = await tx.user.findUnique({ where: { id: user.userId } });
      if (!account) return { kind: 'missing_user' as const };
      if (account.emailVerifiedAt !== null) return { kind: 'already_verified' as const };
      const result = await this.checkInTx(tx, user.userId, 'verify_email', code);
      if (result.kind === 'ok') {
        await tx.user.update({ where: { id: user.userId }, data: { emailVerifiedAt: this.clock.now() } });
      }
      return result;
    }, transactionOptions);
    // Commit has completed. Schedule the one-time lock notice before mapping the denial.
    if (outcome.kind === 'locked' && outcome.notice) {
      this.logger.warn('otp_locked', { user_id: user.userId, purpose: 'verify_email' });
      this.dispatcher.afterResponse(res, [sendPrepared(outcome.notice)]);
    }
    if (outcome.kind === 'missing_user') throw this.invalidToken();
    if (outcome.kind === 'already_verified') {
      throw new ProblemDetailsException({ status: 409, title: 'Email already verified', type: 'email-already-verified' });
    }
    if (outcome.kind === 'locked') throw this.locked(outcome.lockedUntil);
    if (outcome.kind !== 'ok') {
      throw new ProblemDetailsException({ status: 400, title: 'Invalid OTP', type: 'invalid-otp' });
    }
    return { email_verified: true };
  }

  private hmac(code: string): Buffer {
    return createHmac('sha256', this.config.otpHmacKey).update(code).digest();
  }

  private async limitEmail(email: string): Promise<void> {
    await this.limiter.hit('auth.otp.email.cooldown', email);
    await this.limiter.hit('auth.otp.email.hourly', email);
  }

  private locked(lockedUntil: Date): ProblemDetailsException {
    return new ProblemDetailsException({
      status: 429, title: 'Too many requests', type: 'rate-limited',
      retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil.getTime() - this.clock.now().getTime()) / 1000)),
    });
  }

  private invalidToken(): ProblemDetailsException {
    return new ProblemDetailsException({ status: 401, title: 'Invalid token', type: 'invalid-token' });
  }
}
