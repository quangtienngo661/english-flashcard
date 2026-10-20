import { Inject, Injectable } from '@nestjs/common';
import { dateString } from '../../common/time/local-date.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { permissionsFor, type Permission, type StaffRole, type SupportedLanguage } from '../identity.types.js';
import type { UpdateProfileBody } from './profile.schemas.js';
import { canonicalTimeZone, normalizeStoredTimeZone } from './timezone.js';

const NORMALIZE_PAGE_SIZE = 500;

export interface Profile {
  id: string;
  email: string;
  email_verified: boolean;
  native_language: SupportedLanguage | null;
  timezone: string;
  staff_role: StaffRole | null;
  permissions: Permission[];
  must_change_password: boolean;
  given_name: string | null;
  family_name: string | null;
  birth_date: string | null;
}

const profileSelect = {
  id: true, email: true, emailVerifiedAt: true, nativeLanguage: true, timezone: true, staffRole: true,
  mustChangePassword: true, givenName: true, familyName: true, birthDate: true,
} satisfies Prisma.UserSelect;
type ProfileRow = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

function toProfile(row: ProfileRow): Profile {
  const staffRole = row.staffRole as StaffRole | null;
  return {
    id: row.id,
    email: row.email,
    email_verified: row.emailVerifiedAt !== null,
    native_language: row.nativeLanguage as SupportedLanguage | null,
    timezone: row.timezone,
    staff_role: staffRole,
    permissions: permissionsFor(staffRole),
    must_change_password: row.mustChangePassword,
    given_name: row.givenName,
    family_name: row.familyName,
    birth_date: row.birthDate === null ? null : dateString(row.birthDate),
  };
}

export interface ReminderCandidate {
  userId: string;
  timezone: string;
  nativeLanguage: SupportedLanguage | null;
  createdAt: Date;
  lastSeenAt: Date | null;
}

@Injectable()
export class IdentityService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** A caller inside a transaction that holds a lock passes its `tx`, so the read needs no second connection. */
  async getProfile(userId: string, db: Prisma.TransactionClient = this.prisma): Promise<Profile | null> {
    const row = await db.user.findUnique({ where: { id: userId }, select: profileSelect });
    return row ? toProfile(row) : null;
  }

  async isEmailVerified(userId: string): Promise<boolean> {
    const row = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
    return row !== null && row.emailVerifiedAt !== null;
  }

  /** Verified, active users ordered by id, a page at a time; `lastSeenAt` is the last login or session refresh. */
  async listReminderCandidates(input: { afterUserId: string | null; limit: number }): Promise<ReminderCandidate[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        emailVerifiedAt: { not: null }, status: 'active',
        ...(input.afterUserId !== null ? { id: { gt: input.afterUserId } } : {}),
      },
      orderBy: { id: 'asc' }, take: input.limit,
      select: { id: true, timezone: true, nativeLanguage: true, createdAt: true, lastSeenAt: true },
    });
    return rows.map((row) => ({
      userId: row.id, timezone: row.timezone, nativeLanguage: row.nativeLanguage as SupportedLanguage | null,
      createdAt: row.createdAt, lastSeenAt: row.lastSeenAt,
    }));
  }

  /** Addresses of the given users that are verified and active; other and unknown ids are left out. */
  async verifiedEmails(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(userIds)] }, emailVerifiedAt: { not: null }, status: 'active' },
      select: { id: true, email: true },
    });
    return new Map(rows.map((row) => [row.id, row.email]));
  }

  /** Addresses of the given users with no status or verification filter; unknown ids are left out. */
  async emailsOf(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(userIds)] } }, select: { id: true, email: true },
    });
    return new Map(rows.map((row) => [row.id, row.email]));
  }

  async updateProfile(userId: string, body: UpdateProfileBody): Promise<Profile | null> {
    const timezone = body.timezone === undefined ? undefined : canonicalTimeZone(body.timezone);
    if (timezone === null) {
      throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
    }
    if (body.native_language === undefined && timezone === undefined && body.given_name === undefined
      && body.family_name === undefined) return this.getProfile(userId);
    try {
      // One partial update changes only profile fields and returns the stored profile.
      const row = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(body.native_language !== undefined ? { nativeLanguage: body.native_language } : {}),
          ...(timezone !== undefined ? { timezone } : {}),
          ...(body.given_name !== undefined ? { givenName: body.given_name } : {}),
          ...(body.family_name !== undefined ? { familyName: body.family_name } : {}),
        },
        select: profileSelect,
      });
      return toProfile(row);
    } catch (error) {
      // Also handles deletion concurrent with PATCH without turning it into a 500.
      if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2025') return null;
      throw error;
    }
  }

  /**
   * Rewrites every stored `users.timezone` to its canonical name, a page of 500 users by id at a time. A row is written only
   * when its value changes, and only if it still holds the value that was read, so a concurrent PATCH /v1/me is never
   * overwritten. Reads ids and zones only. Safe to run again: a second run changes nothing.
   */
  async normalizeStoredTimeZones(): Promise<{ scanned: number; changed: number }> {
    let scanned = 0;
    let changed = 0;
    let after: string | undefined;
    for (;;) {
      const page = await this.prisma.user.findMany({
        where: after === undefined ? {} : { id: { gt: after } },
        select: { id: true, timezone: true },
        orderBy: { id: 'asc' },
        take: NORMALIZE_PAGE_SIZE,
      });
      for (const { id, timezone } of page) {
        scanned += 1;
        const next = normalizeStoredTimeZone(timezone);
        if (next === timezone) continue;
        changed += (await this.prisma.user.updateMany({ where: { id, timezone }, data: { timezone: next } })).count;
      }
      if (page.length < NORMALIZE_PAGE_SIZE) return { scanned, changed };
      after = page[page.length - 1].id;
    }
  }
}
