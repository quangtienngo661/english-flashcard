import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { normalizeEmail } from '../../common/email/normalize-email.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { decideCredential } from '../auth/credential-decision.js';
import { PasswordHasher } from '../auth/password-hasher.service.js';
import { staffUserNotFound } from '../staff/staff.service.js';
import { withUserLock } from '../user-lock.js';
import { AccountDeletionRegistry } from './account-eraser.js';
import { AccountDeletionService, type DeletionOutcome } from './account-deletion.service.js';
import type { AdminDeleteUserBody, DeleteMyAccountBody } from './delete.schemas.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const problem = (status: number, title: string, type: string) => new ProblemDetailsException({ status, title, type });

type PasswordOutcome = { kind: 'ok' | 'wrong' | 'stale' | 'account_locked' }
  | { kind: 'locked'; lockedUntil: Date | null; newlyLocked: boolean };

/** The checks outside the deletion transaction (design §7.2 step 1), then the deletion itself. */
@Injectable()
export class AccountDeletionRequests {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AppLogger) private readonly logger: AppLogger,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasher,
    @Inject(AccountDeletionRegistry) private readonly registry: AccountDeletionRegistry,
    @Inject(AccountDeletionService) private readonly deletion: AccountDeletionService,
  ) {}

  /**
   * A learner deletes their own account. `googleReauthUserId` is the user a valid `google_reauth` cookie names, or null (Task 21).
   * A wrong password is a 400, never a 401: the web transport refreshes and resends every 401, which would count each wrong
   * password twice (plan review P3). It still counts once toward the login lockout (IR6), like a wrong current password.
   */
  async deleteOwn(user: RequestUser, body: DeleteMyAccountBody, ctx: { res: Response; googleReauthUserId: string | null }): Promise<DeletionOutcome> {
    const account = await this.prisma.user.findUnique({ where: { id: user.userId }, include: { passwordCredential: true } });
    if (!account) throw problem(401, 'Invalid token', 'invalid-token');
    if (account.staffRole !== null) throw problem(409, 'Staff account', 'staff-account');
    if (normalizeEmail(body.confirm_email) !== account.email) throw problem(400, 'Confirm email mismatch', 'confirm-email-mismatch');
    if (account.passwordCredential) {
      await this.checkPassword(account.id, account.passwordCredential.hash, body.password);
    } else if (ctx.googleReauthUserId !== account.id) {
      throw problem(403, 'Reauthentication required', 'reauth-required');
    }
    return this.deletion.delete({ userId: account.id, by: 'self', mode: 'normal', res: ctx.res });
  }

  /** An admin deletes another account (D17). */
  async deleteByAdmin(actorId: string, targetId: string, body: AdminDeleteUserBody, res: Response): Promise<DeletionOutcome> {
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { email: true, status: true } });
    if (!target) throw staffUserNotFound();
    if (targetId === actorId) throw problem(409, 'Self delete', 'self-delete');
    if (normalizeEmail(body.confirm_email) !== target.email) throw problem(400, 'Confirm email mismatch', 'confirm-email-mismatch');
    // A deleting account is past this step (B8E43): its plans are already gone or a retry is finishing them.
    const precondition = this.registry.precondition();
    if (target.status !== 'deleting' && await precondition.renewing(this.prisma, targetId)) {
      // D31: when the provider accepts in time the flag is recorded here and the deletion goes on in this request.
      if (await precondition.turnOffRenewalForAdminDelete(targetId) === 'not_supported') {
        throw problem(409, 'Renewal not cancelled', 'renewal-not-cancelled');
      }
    }
    return this.deletion.delete({ userId: targetId, by: 'admin', mode: 'normal', actorId, res });
  }

  private async checkPassword(userId: string, verifiedHash: string, password: string | undefined): Promise<void> {
    if (password === undefined) throw problem(400, 'Invalid current password', 'invalid-current-password');
    const passwordMatched = await this.hasher.verify(verifiedHash, password);
    const outcome = await this.prisma.$transaction(async (tx): Promise<PasswordOutcome> => {
      await withUserLock(tx, userId);
      const before = await tx.user.findUnique({ where: { id: userId }, select: { loginLockedUntil: true } });
      const kind = await decideCredential(tx, { userId, verifiedHash, passwordMatched }, this.clock);
      if (kind !== 'locked') return { kind };
      const locked = await tx.user.findUnique({ where: { id: userId }, select: { loginLockedUntil: true } });
      return {
        kind, lockedUntil: locked?.loginLockedUntil ?? null,
        newlyLocked: locked?.loginLockedUntil?.getTime() !== before?.loginLockedUntil?.getTime(),
      };
    }, transactionOptions);
    if (outcome.kind === 'ok') return;
    if (outcome.kind === 'locked') {
      if (outcome.newlyLocked) {
        // This wrong password established the lock; only later attempts are rate-limited (as in password change).
        this.logger.warn('login_locked', { user_id: userId });
        throw problem(400, 'Invalid current password', 'invalid-current-password');
      }
      const wait = (outcome.lockedUntil?.getTime() ?? this.clock.now().getTime()) - this.clock.now().getTime();
      throw new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited',
        retryAfterSeconds: Math.max(1, Math.ceil(wait / 1000)) });
    }
    throw problem(400, 'Invalid current password', 'invalid-current-password');
  }
}
