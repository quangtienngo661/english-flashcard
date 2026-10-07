import { Inject, Injectable } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { normalizeEmail } from '../../common/email/normalize-email.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { MailBudget } from '../mailer/mail-budget.service.js';
import { MailDispatcher, type MailJob } from '../mailer/mail-dispatcher.service.js';
import { isValidTimeZone } from '../profile/timezone.js';
import { SessionService, type IssuedSession } from '../sessions/session.service.js';
import { withUserLock } from '../user-lock.js';
import type { LoginBody, RegisterBody } from './auth.schemas.js';
import { decideCredential } from './credential-decision.js';
import { OtpService } from './otp.service.js';
import { PasswordHasher } from './password-hasher.service.js';
import { checkPasswordPolicy, normalizePassword } from './password-policy.js';

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
  ) {}

  async register(body: RegisterBody, res: Response): Promise<IssuedSession> {
    const email = normalizeEmail(body.email);
    if (!email) throw this.validationFailed();
    const violations = checkPasswordPolicy(body.password);
    if (violations.length > 0) throw this.validationFailed({ violations });
    if (!isValidTimeZone(body.timezone)) throw this.validationFailed();
    await this.budget.assertAvailable();
    const hash = await this.hasher.hash(body.password);
    // A preallocated ID lets even a new account follow the lock-first protocol.
    const userId = randomUUID();
    let session: IssuedSession;
    try {
      session = await this.prisma.$transaction(async (tx) => {
        await withUserLock(tx, userId);
        const now = this.clock.now();
        await tx.user.create({ data: { id: userId, email, timezone: body.timezone, createdAt: now, updatedAt: now } });
        await tx.passwordCredential.create({ data: { userId, hash, updatedAt: now } });
        return this.sessions.startChain(tx, { userId, client: body.client, deviceLabel: body.device_label });
      }, transactionOptions);
    } catch (error) {
      if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ProblemDetailsException({ status: 409, title: 'Email taken', type: 'email-taken' });
      }
      throw error;
    }
    const job: MailJob = async () => this.otp.noteIssued(userId, 'verify_email', await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      return this.otp.issueInTx(tx, userId, 'verify_email');
    }, transactionOptions));
    this.dispatcher.afterResponse(res, [job]);
    return session;
  }

  async login(body: LoginBody): Promise<IssuedSession> {
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
      const before = await tx.user.findUnique({ where: { id: account.id }, select: { loginLockedUntil: true } });
      const kind = await decideCredential(tx, { userId: account.id, verifiedHash, passwordMatched }, this.clock);
      if (kind !== 'ok') {
        // Distinguish a newly established lock for logging from a request that
        // merely observed an existing lock. No extra public outcome is needed.
        const current = kind === 'locked' ? await tx.user.findUnique({ where: { id: account.id } }) : null;
        return { kind, newlyLocked: kind === 'locked' && current?.loginLockedUntil !== null
          && current?.loginLockedUntil?.getTime() !== before?.loginLockedUntil?.getTime() };
      }
      return { kind, session: await this.sessions.startChain(tx, {
        userId: account.id, client: body.client, deviceLabel: body.device_label,
      }) };
    }, transactionOptions);
    if (outcome.kind !== 'ok') {
      this.logger.info('login_failed', { user_id: account.id });
      if (outcome.newlyLocked) this.logger.warn('login_locked', { user_id: account.id });
      throw this.invalidCredentials();
    }
    return outcome.session;
  }

  private validationFailed(extensions?: Record<string, unknown>): ProblemDetailsException {
    return new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed', extensions });
  }
  private invalidCredentials(): ProblemDetailsException {
    return new ProblemDetailsException({ status: 401, title: 'Invalid credentials', type: 'invalid-credentials' });
  }
}
