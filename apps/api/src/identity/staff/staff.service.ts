import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { normalizeEmail } from '../../common/email/normalize-email.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { decodePageToken, encodePageToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { PasswordHasher } from '../auth/password-hasher.service.js';
import { checkPasswordPolicy } from '../auth/password-policy.js';
import type { StaffRole } from '../identity.types.js';
import { MailBudget } from '../../common/mail/mail-budget.service.js';
import { MailDispatcher, sendPrepared } from '../../common/mail/mail-dispatcher.service.js';
import { staffAccountMail } from '../mailer/templates.js';
import { canonicalTimeZone } from '../profile/timezone.js';
import { withUserLock } from '../user-lock.js';
import { generatePassword } from './password-generator.js';
import { idParam, type CreateAccountBody } from './staff.schemas.js';

export type StaffUserView = {
  id: string; email: string; email_verified: boolean; staff_role: StaffRole | null;
  given_name: string | null; family_name: string | null;
};
const staffSelect = {
  id: true, email: true, emailVerifiedAt: true, staffRole: true, givenName: true, familyName: true,
} satisfies Prisma.UserSelect;
type StaffRow = Prisma.UserGetPayload<{ select: typeof staffSelect }>;
const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

function toView(row: StaffRow): StaffUserView {
  return {
    id: row.id, email: row.email, email_verified: row.emailVerifiedAt !== null, staff_role: row.staffRole as StaffRole | null,
    given_name: row.givenName, family_name: row.familyName,
  };
}
function invalidInput(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
}
function roleRule(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 409, title: 'Staff role rule', type: 'staff-role-rule' });
}
export function staffUserNotFound(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
}

@Injectable()
export class StaffService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(AppLogger) private readonly logger: AppLogger,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasher,
    @Inject(MailBudget) private readonly budget: MailBudget,
    @Inject(MailDispatcher) private readonly dispatcher: MailDispatcher,
  ) {}

  /** The password only ever leaves through the mail: never in the response or a log line. */
  async createAccount(actorId: string, body: CreateAccountBody, res: Response): Promise<StaffUserView> {
    const email = normalizeEmail(body.email);
    const timezone = canonicalTimeZone(body.timezone);
    if (!email || timezone === null) throw invalidInput();
    if (body.password !== undefined) {
      const violations = checkPasswordPolicy(body.password);
      if (violations.length > 0) throw new ProblemDetailsException({ status: 400, title: 'Validation failed',
        type: 'validation-failed', extensions: { violations } });
    }
    await this.budget.assertAvailable();
    const password = body.password ?? generatePassword();
    const hash = await this.hasher.hash(password);
    const userId = randomUUID();
    let row: StaffRow;
    try {
      row = await this.prisma.$transaction(async (tx) => {
        await withUserLock(tx, userId);
        const now = this.clock.now();
        const created = await tx.user.create({ data: {
          id: userId, email, timezone, emailVerifiedAt: now, staffRole: body.staff_role,
          mustChangePassword: body.must_change_password, createdAt: now, updatedAt: now,
          givenName: body.given_name ?? null, familyName: body.family_name ?? null,
        }, select: staffSelect });
        await tx.passwordCredential.create({ data: { userId, hash, updatedAt: now } });
        return created;
      }, transactionOptions);
    } catch (error) {
      if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ProblemDetailsException({ status: 409, title: 'Email taken', type: 'email-taken' });
      }
      throw error;
    }
    this.dispatcher.afterResponse(res, [sendPrepared(
      staffAccountMail(email, password, this.config.adminAppUrl, body.must_change_password))]);
    this.logger.info('staff_account_created', { actor_id: actorId, target_id: userId,
      staff_role: body.staff_role, must_change: body.must_change_password });
    return toView(row);
  }

  async findByEmail(email: string): Promise<StaffUserView | null> {
    const normalized = normalizeEmail(email);
    if (!normalized) throw invalidInput();
    const row = await this.prisma.user.findUnique({ where: { email: normalized }, select: staffSelect });
    return row ? toView(row) : null;
  }

  async listStaff(pageSize: number, pageToken?: string): Promise<{ items: StaffUserView[]; next_page_token: string | null }> {
    let afterEmail: string | undefined;
    if (pageToken !== undefined) {
      const cursor = decodePageToken(pageToken);
      if (!cursor || !idParam.safeParse(cursor.id).success) throw invalidInput();
      const row = await this.prisma.user.findUnique({ where: { id: cursor.id }, select: { email: true } });
      if (!row) throw invalidInput();
      afterEmail = row.email;
    }
    // Email is unique, so it is a stable ordering key; demotion of a cursor user is harmless.
    const rows = await this.prisma.user.findMany({
      where: { staffRole: { not: null }, ...(afterEmail !== undefined ? { email: { gt: afterEmail } } : {}) },
      orderBy: { email: 'asc' }, take: pageSize + 1, select: staffSelect,
    });
    const items = rows.slice(0, pageSize).map(toView);
    return { items, next_page_token: rows.length > pageSize ? encodePageToken({ id: items[items.length - 1].id }) : null };
  }

  async setStaffRole(actorId: string, targetId: string, role: StaffRole | null): Promise<StaffUserView> {
    const row = await this.prisma.$transaction(async (tx) => {
      // Role changes never acquire the per-user lock as well (design §4b).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('identity.staff_role', 0))`;
      const target = await tx.user.findUnique({ where: { id: targetId }, select: staffSelect });
      if (!target) throw staffUserNotFound();
      if (role !== null && target.emailVerifiedAt === null) throw roleRule();
      if (target.staffRole === 'admin' && role !== 'admin' && await tx.user.count({ where: { staffRole: 'admin' } }) <= 1) {
        throw roleRule();
      }
      // Expected denials above do not write state; exceptions can safely roll back.
      return tx.user.update({ where: { id: targetId }, data: { staffRole: role }, select: staffSelect });
    }, transactionOptions);
    this.logger.info('staff_role_changed', { actor_id: actorId, target_id: targetId, staff_role: role });
    return toView(row);
  }

  async grantAdminByEmail(email: string): Promise<'granted' | 'not_found' | 'unverified'> {
    const normalized = normalizeEmail(email);
    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('identity.staff_role', 0))`;
      const target = normalized ? await tx.user.findUnique({ where: { email: normalized }, select: staffSelect }) : null;
      if (!target) return { kind: 'not_found' } as const;
      if (target.emailVerifiedAt === null) return { kind: 'unverified' } as const;
      await tx.user.update({ where: { id: target.id }, data: { staffRole: 'admin' }, select: staffSelect });
      return { kind: 'granted', targetId: target.id } as const;
    }, transactionOptions);
    if (outcome.kind === 'granted') {
      this.logger.info('staff_role_changed', { actor_id: null, target_id: outcome.targetId, staff_role: 'admin' });
    }
    return outcome.kind;
  }
}
