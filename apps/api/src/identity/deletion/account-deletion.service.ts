import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { deleteIdempotencyKeysOf } from '../../common/idempotency/erase-idempotency-keys.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { MailDispatcher, sendPrepared } from '../../common/mail/mail-dispatcher.service.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { accountDeletedMail } from '../mailer/templates.js';
import { SessionService } from '../sessions/session.service.js';
import { withUserLock } from '../user-lock.js';
import { AccountDeletionRegistry } from './account-eraser.js';

export type DeletionBy = 'self' | 'admin' | 'cleanup';
/**
 * `normal`: the request of a learner or an admin, or the clean-up job. `resume`: the retry job, Tx B only (P1). `replay`: after a
 * restore from backup, no condition is checked and no mail is sent (design §7.5).
 */
export type DeletionMode = 'normal' | 'resume' | 'replay';
export type DeletionOutcome = 'done' | 'pending' | 'skipped';

export type DeleteInput = {
  userId: string;
  by: DeletionBy;
  mode: DeletionMode;
  /** The admin who asked (`by = 'admin'`): an admin may not delete themselves. */
  actorId?: string;
  /** The request's response: the mail is sent after it closes. Without it the mail goes out at once (jobs). */
  res?: Response;
  /** `by = 'cleanup'`: the cut-off the job selected with; Tx A checks it again under the lock (P4). */
  cleanupCutoff?: Date;
};

const TX_A = { timeout: 10_000, maxWait: 5_000 };
const TX_B = { timeout: 120_000, maxWait: 5_000 };

const refuse = (status: number, title: string, type: string) => new ProblemDetailsException({ status, title, type });

/** Raised inside Tx A when the target became staff between the hint read and the lock: take the staff lock first and start again. */
class RetryWithStaffLock extends Error {}

type TxAResult = 'go' | 'pending' | 'skipped' | 'gone';

/**
 * Deletes an account in two transactions (design §7.2, D23): Tx A makes it unusable at once, Tx B erases it through the module
 * ports under one random anonymous id. A failing Tx B leaves the account `deleting`; `identity.deletion-retry` runs Tx B again.
 */
@Injectable()
export class AccountDeletionService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AppLogger) private readonly logger: AppLogger,
    @Inject(AccountDeletionRegistry) private readonly registry: AccountDeletionRegistry,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(MailDispatcher) private readonly dispatcher: MailDispatcher,
  ) {}

  async delete(input: DeleteInput): Promise<DeletionOutcome> {
    if (input.mode !== 'resume') {
      const a = await this.txAWithStaffHint(input);
      if (a === 'pending' || a === 'skipped') return a;
      if (a === 'gone') return 'done';
    }
    return this.txB(input);
  }

  private async txAWithStaffHint(input: DeleteInput): Promise<TxAResult> {
    const hint = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { staffRole: true } });
    if (!hint) return 'gone';
    try {
      return await this.txA(input, hint.staffRole !== null);
    } catch (error) {
      if (!(error instanceof RetryWithStaffLock)) throw error;
      return this.txA(input, true);
    }
  }

  private txA(input: DeleteInput, takeStaffLock: boolean): Promise<TxAResult> {
    const { userId, by, mode } = input;
    return this.prisma.$transaction(async (tx): Promise<TxAResult> => {
      // The same order as `setStaffRole`: the staff-role lock before the user lock (two admins deleting each other, B8E40).
      if (takeStaffLock) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('identity.staff_role', 0))`;
      await withUserLock(tx, userId);
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { status: true, staffRole: true, emailVerifiedAt: true, termsAcceptedAt: true, createdAt: true },
      });
      if (!user) return 'gone';
      if (user.staffRole !== null && !takeStaffLock) throw new RetryWithStaffLock();

      if (user.status === 'deleting') {
        // B8E54: a second request of the learner finds it under way. An admin, the job or a replay goes on to Tx B.
        return by === 'self' ? 'pending' : 'go';
      }
      if (mode === 'normal') {
        if (by === 'cleanup') {
          const cutoff = input.cleanupCutoff;
          const stillDue = user.emailVerifiedAt === null && user.staffRole === null
            && (user.status === 'active' || user.status === 'locked')
            && cutoff !== undefined && (user.termsAcceptedAt ?? user.createdAt) < cutoff;
          if (!stillDue) return 'skipped';
        } else if (by === 'self') {
          if (user.staffRole !== null) throw refuse(409, 'Staff account', 'staff-account');
          if (await this.registry.precondition().renewing(tx, userId)) throw refuse(409, 'Subscription renewing', 'subscription-renewing');
        } else {
          if (input.actorId === userId) throw refuse(409, 'Self delete', 'self-delete');
          if (user.staffRole === 'admin') {
            const others = await tx.user.count({ where: { staffRole: 'admin', status: { not: 'deleting' }, id: { not: userId } } });
            if (others === 0) throw refuse(409, 'Last admin', 'last-admin');
          }
        }
      }
      const now = this.clock.now();
      await tx.user.update({ where: { id: userId }, data: { status: 'deleting', deletingSince: now, deletingBy: by }, select: { id: true } });
      await this.sessions.revokeAllForUser(tx, userId, 'account-deleted');
      await tx.otpCode.updateMany({ where: { userId, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: now } });
      return 'go';
    }, TX_A);
  }

  private async txB(input: DeleteInput): Promise<DeletionOutcome> {
    const { userId, mode } = input;
    try {
      const done = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL statement_timeout = '120s'`;
        await withUserLock(tx, userId);
        // Read again: another run (retry, request) may have finished already (B8E29).
        const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true, status: true, deletingBy: true, emailVerifiedAt: true } });
        if (!user) return null;
        if (user.status !== 'deleting') return 'not-deleting' as const;
        const by = (user.deletingBy ?? input.by) as DeletionBy;
        const anonId = randomUUID();
        const options = { checks: mode === 'replay' ? 'skip' : 'normal' } as const;
        for (const eraser of this.registry.erasers()) await eraser.erase(tx, userId, anonId, options);
        await deleteIdempotencyKeysOf(tx, userId);
        await tx.deletedAccount.createMany({ data: [{ userId, deletedAt: this.clock.now(), by }], skipDuplicates: true });
        await tx.user.delete({ where: { id: userId } });
        return { email: user.email, by, verified: user.emailVerifiedAt !== null };
      }, TX_B);
      if (done === 'not-deleting') return 'skipped';
      // An address nobody confirmed may belong to a stranger: no mail to it (final review M4).
      if (done !== null && done.verified && input.mode !== 'replay' && done.by !== 'cleanup') await this.sendDeletedMail(input, done.email);
      this.logger.info('account_deleted', { user_id: userId, by: done?.by ?? input.by });
      return 'done';
    } catch (error) {
      // The account stays `deleting`; the retry job runs Tx B again. The user id only (SR10).
      this.logger.error('account_deletion_failed', error, { user_id: userId });
      return 'pending';
    }
  }

  /** After the commit. A failure here never undoes the deletion (B8E35). */
  private async sendDeletedMail(input: DeleteInput, email: string): Promise<void> {
    try {
      const years = await this.registry.settings().transactionRetentionYears();
      const job = sendPrepared(accountDeletedMail(email, years));
      if (input.res) this.dispatcher.afterResponse(input.res, [job]);
      else this.dispatcher.runNow([job]);
    } catch {
      this.logger.warn('account_deleted_mail_failed', { user_id: input.userId });
    }
  }
}
