import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { dateString, dateValue, localDate } from '../../common/time/local-date.js';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { isValidEmailSyntax, normalizeEmail } from '../../common/email/normalize-email.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { decodeBoundToken, decodePageToken, encodeBoundToken, encodePageToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { PasswordHasher } from '../auth/password-hasher.service.js';
import { checkPasswordPolicy } from '../auth/password-policy.js';
import type { StaffRole } from '../identity.types.js';
import { MailBudget } from '../../common/mail/mail-budget.service.js';
import { MailDispatcher, sendPrepared } from '../../common/mail/mail-dispatcher.service.js';
import { adminPasswordResetMail, emailChangedNoticeMail, learnerAccountMail, staffAccountMail } from '../mailer/templates.js';
import { isOldEnough, MIN_AGE } from '../profile/person.js';
import { canonicalTimeZone } from '../profile/timezone.js';
import { SessionService } from '../sessions/session.service.js';
import { withUserLock } from '../user-lock.js';
import { generatePassword } from './password-generator.js';
import { idParam, type CreateAccountBody, type ResetPasswordBody, type UpdateUserBody } from './staff.schemas.js';

export type StaffUserView = {
  id: string; email: string; email_verified: boolean; staff_role: StaffRole | null;
  given_name: string | null; family_name: string | null;
};
export type AdminUserRow = {
  id: string; email: string; given_name: string | null; family_name: string | null; email_verified: boolean;
  staff_role: StaffRole | null; status: 'active' | 'locked' | 'deleting'; created_at: string; last_seen_at: string | null;
  sign_in_methods: Array<'password' | 'google'>;
};
export type AdminUserDetail = AdminUserRow & {
  birth_date: string | null; terms_accepted_at: string | null; terms_version: string | null; locked_at: string | null;
  /** AD18: shown and edited on the admin's user detail. */
  timezone: string;
  locked_by: { id: string; email: string | null } | null; lock_reason: string | null;
};
/** Microsecond UTC text of created_at: the cursor must not lose the digits a JS Date cannot hold. */
const CURSOR_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
type AdminListRow = {
  id: string; email: string; given_name: string | null; family_name: string | null; email_verified_at: Date | null;
  staff_role: string | null; status: string; created_at: Date; cursor_at: string; last_seen_at: Date | null;
  has_password?: boolean; has_google?: boolean;
};
const adminDetailSelect = {
  id: true, email: true, givenName: true, familyName: true, emailVerifiedAt: true, staffRole: true, status: true,
  createdAt: true, lastSeenAt: true, birthDate: true, termsAcceptedAt: true, termsVersion: true, lockedAt: true, timezone: true,
  lockedBy: true, lockReason: true, passwordCredential: { select: { userId: true } }, identities: { select: { provider: true } },
} satisfies Prisma.UserSelect;
function signInMethods(hasPassword: boolean | undefined, hasGoogle: boolean | undefined): Array<'password' | 'google'> {
  return [...(hasPassword ? ['password' as const] : []), ...(hasGoogle ? ['google' as const] : [])];
}
function toAdminRow(row: Omit<AdminListRow, 'cursor_at'>): AdminUserRow {
  return {
    id: row.id, email: row.email, given_name: row.given_name, family_name: row.family_name,
    email_verified: row.email_verified_at !== null, staff_role: row.staff_role as StaffRole | null,
    // Cast once: a new status must not be reported as active.
    status: row.status as AdminUserRow['status'], created_at: row.created_at.toISOString(),
    last_seen_at: row.last_seen_at?.toISOString() ?? null, sign_in_methods: signInMethods(row.has_password, row.has_google),
  };
}
const staffSelect = {
  id: true, email: true, emailVerifiedAt: true, staffRole: true, givenName: true, familyName: true, status: true,
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
/** Design §6.2: nobody edits an account while its deletion is under way. */
function accountDeleting(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 409, title: 'Account deleting', type: 'account-deleting' });
}
function lockRule(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 409, title: 'Lock rule', type: 'lock-rule' });
}
export function staffUserNotFound(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
}

/** Sign-up rule (design Bước 0–3 fixes §8.1): not after today, at least 13. */
function assertBirthDate(birthDate: string, today: string): void {
  if (birthDate > today) {
    throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed',
      extensions: { violations: ['birth_date'] } });
  }
  if (!isOldEnough(birthDate, today, MIN_AGE)) {
    throw new ProblemDetailsException({ status: 400, title: 'Age below minimum', type: 'age-below-minimum' });
  }
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
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  /** The password only ever leaves through the mail: never in the response or a log line. */
  async createAccount(actorId: string, body: CreateAccountBody, res: Response): Promise<StaffUserView> {
    const email = normalizeEmail(body.email);
    const timezone = canonicalTimeZone(body.timezone);
    if (!email || !isValidEmailSyntax(email) || timezone === null) throw invalidInput();
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
    this.dispatcher.afterResponse(res, [sendPrepared(body.staff_role === null
      ? learnerAccountMail(email, password, this.config.learnerAppUrl, body.must_change_password)
      : staffAccountMail(email, password, this.config.adminAppUrl, body.must_change_password))]);
    this.logger.info('staff_account_created', { actor_id: actorId, target_id: userId,
      staff_role: body.staff_role, must_change: body.must_change_password });
    return toView(row);
  }

  /**
   * AD18: the admin edits names, birth date, timezone and email. A new email counts as verified (as on create) and the old
   * address gets a notice; sessions stay. Birth date follows the sign-up rule in the user's (new) zone.
   */
  async updateUser(actorId: string, targetId: string, body: UpdateUserBody, res: Response): Promise<AdminUserDetail> {
    const timezone = body.timezone === undefined ? undefined : canonicalTimeZone(body.timezone);
    const email = body.email === undefined ? undefined : normalizeEmail(body.email);
    if (timezone === null || email === null || (email !== undefined && !isValidEmailSyntax(email))) throw invalidInput();
    const notice = await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, targetId);
      const target = await tx.user.findUnique({ where: { id: targetId }, select: { email: true, timezone: true, status: true } });
      if (!target) throw staffUserNotFound();
      if (target.status === 'deleting') throw accountDeleting();
      if (body.birth_date !== undefined) assertBirthDate(body.birth_date, localDate(timezone ?? target.timezone, this.clock.now()));
      const emailChanged = email !== undefined && email !== target.email;
      if (emailChanged) await this.budget.assertAvailable();
      try {
        await tx.user.update({ where: { id: targetId }, data: {
          ...(body.given_name !== undefined ? { givenName: body.given_name } : {}),
          ...(body.family_name !== undefined ? { familyName: body.family_name } : {}),
          ...(body.birth_date !== undefined ? { birthDate: dateValue(body.birth_date) } : {}),
          ...(timezone !== undefined ? { timezone } : {}),
          ...(emailChanged ? { email, emailVerifiedAt: this.clock.now() } : {}),
        }, select: { id: true } });
      } catch (error) {
        if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          throw new ProblemDetailsException({ status: 409, title: 'Email taken', type: 'email-taken' });
        }
        throw error;
      }
      return emailChanged ? emailChangedNoticeMail(target.email, email!) : null;
    }, transactionOptions);
    if (notice) this.dispatcher.afterResponse(res, [sendPrepared(notice)]);
    // Values may be personal data: field names only.
    this.logger.info('account_updated', { actor_id: actorId, target_id: targetId,
      fields: Object.keys(body).filter((key) => key !== 'email' || notice !== null) });
    return this.getUserDetail(targetId);
  }

  /** AD18: typed or generated; the password leaves only through the mail. Every session is revoked. */
  async resetPassword(actorId: string, targetId: string, body: ResetPasswordBody, res: Response): Promise<AdminUserDetail> {
    if (body.password !== undefined) {
      const violations = checkPasswordPolicy(body.password);
      if (violations.length > 0) throw new ProblemDetailsException({ status: 400, title: 'Validation failed',
        type: 'validation-failed', extensions: { violations } });
    }
    await this.budget.assertAvailable();
    const password = body.password ?? generatePassword();
    const hash = await this.hasher.hash(password);
    const mail = await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, targetId);
      const target = await tx.user.findUnique({ where: { id: targetId }, select: { email: true, staffRole: true, status: true } });
      if (!target) throw staffUserNotFound();
      if (target.status === 'deleting') throw accountDeleting();
      const now = this.clock.now();
      await tx.passwordCredential.upsert({ where: { userId: targetId }, update: { hash, updatedAt: now },
        create: { userId: targetId, hash, updatedAt: now } });
      await tx.user.update({ where: { id: targetId }, data: { mustChangePassword: body.must_change_password }, select: { id: true } });
      await this.sessions.revokeAllForUser(tx, targetId, 'admin_password_reset');
      const url = target.staffRole === null ? this.config.learnerAppUrl : this.config.adminAppUrl;
      return adminPasswordResetMail(target.email, password, url, body.must_change_password);
    }, transactionOptions);
    this.dispatcher.afterResponse(res, [sendPrepared(mail)]);
    this.logger.info('account_password_reset', { actor_id: actorId, target_id: targetId, must_change: body.must_change_password });
    return this.getUserDetail(targetId);
  }

  async findByEmail(email: string): Promise<StaffUserView | null> {
    const normalized = normalizeEmail(email);
    if (!normalized) throw invalidInput();
    const row = await this.prisma.user.findUnique({ where: { email: normalized }, select: staffSelect });
    return row ? toView(row) : null;
  }

  async listUsers(query: { q?: string; status?: 'active' | 'locked' | 'deleting'; pageSize: number; pageToken?: string }):
    Promise<{ items: AdminUserRow[]; next_page_token: string | null }> {
    const binding = JSON.stringify([query.q ?? null, query.status ?? null]);
    let cursor: { at: string; id: string } | undefined;
    if (query.pageToken !== undefined) {
      const decoded = decodeBoundToken(query.pageToken, binding);
      if (!decoded || typeof decoded.at !== 'string' || typeof decoded.id !== 'string'
        || !CURSOR_AT.test(decoded.at) || !idParam.safeParse(decoded.id).success) throw invalidInput();
      cursor = { at: decoded.at, id: decoded.id };
    }
    const escaped = query.q?.replace(/[\\%_]/g, '\\$&');
    const pattern = escaped === undefined ? undefined : '%' + escaped + '%';
    const search = pattern === undefined ? Prisma.empty : Prisma.sql`AND (email ILIKE ${pattern} ESCAPE ${'\\'}
      OR given_name ILIKE ${pattern} ESCAPE ${'\\'} OR family_name ILIKE ${pattern} ESCAPE ${'\\'}
      OR coalesce(family_name, '') || ' ' || coalesce(given_name, '') ILIKE ${pattern} ESCAPE ${'\\'})`;
    const status = query.status === undefined ? Prisma.empty : Prisma.sql`AND status = ${query.status}`;
    const after = cursor === undefined ? Prisma.empty
      : Prisma.sql`AND (created_at, id) < (${cursor.at}::timestamptz, ${cursor.id}::uuid)`;
    const rows = await this.prisma.$queryRaw<AdminListRow[]>(Prisma.sql`
      SELECT id, email, given_name, family_name, email_verified_at, staff_role, status, created_at, last_seen_at,
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at,
        EXISTS (SELECT 1 FROM password_credentials pc WHERE pc.user_id = users.id) AS has_password,
        EXISTS (SELECT 1 FROM user_identities ui WHERE ui.user_id = users.id) AS has_google
      FROM users WHERE TRUE ${search} ${status} ${after}
      ORDER BY created_at DESC, id DESC LIMIT ${query.pageSize + 1}`);
    const page = rows.slice(0, query.pageSize);
    const last = page[page.length - 1];
    return {
      items: page.map(toAdminRow),
      next_page_token: rows.length > query.pageSize
        ? encodeBoundToken({ at: last.cursor_at, id: last.id }, binding) : null,
    };
  }

  /** True when no other admin would be left (the rule the delete and `setStaffRole` apply under their lock); only a hint for the screen. */
  async isLastAdmin(id: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { staffRole: 'admin', status: { not: 'deleting' }, id: { not: id } } })) === 0;
  }

  async getUserDetail(id: string): Promise<AdminUserDetail> {
    const row = await this.prisma.user.findUnique({ where: { id }, select: adminDetailSelect });
    if (!row) throw staffUserNotFound();
    const locker = row.lockedBy === null ? null
      : await this.prisma.user.findUnique({ where: { id: row.lockedBy }, select: { email: true } });
    return {
      ...toAdminRow({ id: row.id, email: row.email, given_name: row.givenName, family_name: row.familyName,
        email_verified_at: row.emailVerifiedAt, staff_role: row.staffRole, status: row.status,
        created_at: row.createdAt, last_seen_at: row.lastSeenAt,
        has_password: row.passwordCredential !== null, has_google: row.identities.length > 0 }),
      birth_date: row.birthDate === null ? null : dateString(row.birthDate),
      terms_accepted_at: row.termsAcceptedAt?.toISOString() ?? null, terms_version: row.termsVersion, timezone: row.timezone,
      locked_at: row.lockedAt?.toISOString() ?? null,
      locked_by: row.lockedBy === null ? null : { id: row.lockedBy, email: locker?.email ?? null },
      lock_reason: row.lockReason,
    };
  }

  /**
   * Holds only the target's user lock (never the staff-role lock), the same lock login, refresh, password change,
   * reset and OTP issuance take, so each of them sees either the whole lock or none of it (FE9, FE10).
   */
  async lockUser(actorId: string, targetId: string, reason: string): Promise<AdminUserDetail> {
    const changed = await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, targetId);
      const target = await tx.user.findUnique({ where: { id: targetId }, select: { staffRole: true, status: true } });
      if (!target) throw staffUserNotFound();
      if (target.status === 'deleting') throw accountDeleting();
      if (targetId === actorId || target.staffRole === 'admin') throw lockRule();
      if (target.status === 'locked') return false;
      const now = this.clock.now();
      // Conditional write (B1-3): a promotion to admin runs under the staff-role lock, not this user lock, so the role is
      // re-checked on the row as it is now (Postgres re-evaluates the WHERE after waiting for a concurrent update).
      const { count } = await tx.user.updateMany({
        where: { id: targetId, OR: [{ staffRole: null }, { staffRole: { not: 'admin' } }] },
        data: { status: 'locked', lockedAt: now, lockedBy: actorId, lockReason: reason },
      });
      if (count === 0) throw lockRule();
      await this.sessions.revokeAllForUser(tx, targetId, 'locked');
      await tx.otpCode.updateMany({ where: { userId: targetId, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: now } });
      return true;
    }, transactionOptions);
    // The reason may hold personal data: ids only.
    if (changed) this.logger.info('account_locked', { actor_id: actorId, target_id: targetId });
    return this.getUserDetail(targetId);
  }

  /** Old sessions stay revoked: the user signs in again. */
  async unlockUser(actorId: string, targetId: string): Promise<AdminUserDetail> {
    const changed = await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, targetId);
      const target = await tx.user.findUnique({ where: { id: targetId }, select: { status: true } });
      if (!target) throw staffUserNotFound();
      if (target.status === 'deleting') throw accountDeleting();
      if (target.status === 'active') return false;
      await tx.user.update({ where: { id: targetId }, data: {
        status: 'active', lockedAt: null, lockedBy: null, lockReason: null,
      }, select: { id: true } });
      return true;
    }, transactionOptions);
    if (changed) this.logger.info('account_unlocked', { actor_id: actorId, target_id: targetId });
    return this.getUserDetail(targetId);
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
      if (target.status === 'deleting') throw accountDeleting();
      if (role !== null && (target.emailVerifiedAt === null || target.status === 'locked')) throw roleRule();
      if (target.staffRole === 'admin' && role !== 'admin' && await tx.user.count({ where: { staffRole: 'admin', status: { not: 'deleting' } } }) <= 1) {
        throw roleRule();
      }
      // Expected denials above do not write state; exceptions can safely roll back. A promotion also checks the status as it
      // is now: a lock holds the user lock, not this one (B1-3), so it may have landed after the read above.
      const { count } = await tx.user.updateMany({
        where: { id: targetId, ...(role !== null ? { status: { notIn: ['locked', 'deleting'] } } : {}) },
        data: { staffRole: role },
      });
      if (count === 0) throw roleRule();
      return tx.user.findUniqueOrThrow({ where: { id: targetId }, select: staffSelect });
    }, transactionOptions);
    this.logger.info('staff_role_changed', { actor_id: actorId, target_id: targetId, staff_role: role });
    return toView(row);
  }

  async grantAdminByEmail(email: string): Promise<'granted' | 'not_found' | 'unverified' | 'locked' | 'deleting'> {
    const normalized = normalizeEmail(email);
    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('identity.staff_role', 0))`;
      const target = normalized ? await tx.user.findUnique({ where: { email: normalized }, select: staffSelect }) : null;
      if (!target) return { kind: 'not_found' } as const;
      if (target.emailVerifiedAt === null) return { kind: 'unverified' } as const;
      // The same rules as setStaffRole: a locked account is never promoted, a deleting one is never edited (B1-4).
      if (target.status === 'deleting') return { kind: 'deleting' } as const;
      if (target.status === 'locked') return { kind: 'locked' } as const;
      const { count } = await tx.user.updateMany({
        where: { id: target.id, status: { notIn: ['locked', 'deleting'] } }, data: { staffRole: 'admin' },
      });
      if (count === 0) return { kind: 'locked' } as const;
      return { kind: 'granted', targetId: target.id } as const;
    }, transactionOptions);
    if (outcome.kind === 'granted') {
      this.logger.info('staff_role_changed', { actor_id: null, target_id: outcome.targetId, staff_role: 'admin' });
    }
    return outcome.kind;
  }
}
