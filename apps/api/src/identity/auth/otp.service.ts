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
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { recordOtpFailure } from '../../generated/prisma/sql.js';
import type { OtpPurpose } from '../identity.types.js';
import { MailBudget } from '../../common/mail/mail-budget.service.js';
import { MailDispatcher, type MailJob } from '../../common/mail/mail-dispatcher.service.js';
import type { MailMessage } from '../../common/mail/mailer.js';
import { otpMail, otpLockedMail } from '../mailer/templates.js';
import { withUserLock } from '../user-lock.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const day = 86_400_000;
export type OtpCheckOutcome =
  | { kind: 'ok' }
  | { kind: 'wrong' | 'no_live_code' }
  | { kind: 'locked'; lockedUntil: Date; notice: MailMessage | null };

export function otpLocked(lockedUntil: Date, now: Date): ProblemDetailsException {
  return new ProblemDetailsException({
    status: 429, title: 'Too many requests', type: 'rate-limited',
    retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000)),
  });
}

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
    // A locked account gets nothing, answered exactly like an unknown address (design §4.5).
    if (!user || user.status !== 'active' || (purpose === 'verify_email' && user.emailVerifiedAt !== null)) return null;
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

  async tryLimitEmail(email: string): Promise<boolean> {
    try {
      await this.limitEmail(email);
      return true;
    } catch (error) {
      if (error instanceof ProblemDetailsException && error.getStatus() === 429 && error.problemType === 'rate-limited') return false;
      throw error;
    }
  }

  async sendVerifyCodeQuietly(userId: string, email: string, res: Response): Promise<void> {
    if (!await this.tryLimitEmail(email)) return;
    try {
      await this.budget.assertAvailable();
    } catch (error) {
      if (error instanceof ProblemDetailsException && error.getStatus() === 503 && error.problemType === 'mail-unavailable') return;
      throw error;
    }
    const job: MailJob = async () => this.noteIssued(userId, 'verify_email', await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      return this.issueInTx(tx, userId, 'verify_email');
    }, transactionOptions));
    this.dispatcher.afterResponse(res, [job]);
  }

  async requestVerifyEmail(rawEmail: string, res: Response): Promise<void> {
    await this.requestCode(rawEmail, 'verify_email', res);
  }

  async requestPasswordReset(rawEmail: string, res: Response): Promise<void> {
    await this.requestCode(rawEmail, 'reset_password', res);
  }

  private async requestCode(rawEmail: string, purpose: OtpPurpose, res: Response): Promise<void> {
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
        return this.issueInTx(tx, account.id, purpose);
      }, transactionOptions);
      return this.noteIssued(account.id, purpose, message);
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

  private hmac(code: string): Buffer {
    return createHmac('sha256', this.config.otpHmacKey).update(code).digest();
  }

  private async limitEmail(email: string): Promise<void> {
    await this.limiter.hit('auth.otp.email.cooldown', email);
    await this.limiter.hit('auth.otp.email.hourly', email);
  }
}
