import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { permissionsFor, type Permission, type StaffRole, type SupportedLanguage } from '../identity.types.js';
import type { UpdateProfileBody } from './profile.schemas.js';
import { isValidTimeZone } from './timezone.js';

export interface Profile {
  id: string;
  email: string;
  email_verified: boolean;
  native_language: SupportedLanguage | null;
  timezone: string;
  staff_role: StaffRole | null;
  permissions: Permission[];
}

const profileSelect = {
  id: true, email: true, emailVerifiedAt: true, nativeLanguage: true, timezone: true, staffRole: true,
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
  };
}

@Injectable()
export class IdentityService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async getProfile(userId: string): Promise<Profile | null> {
    const row = await this.prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
    return row ? toProfile(row) : null;
  }

  async isEmailVerified(userId: string): Promise<boolean> {
    const row = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
    return row !== null && row.emailVerifiedAt !== null;
  }

  async updateProfile(userId: string, body: UpdateProfileBody): Promise<Profile | null> {
    if (body.timezone !== undefined && !isValidTimeZone(body.timezone)) {
      throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
    }
    if (body.native_language === undefined && body.timezone === undefined) return this.getProfile(userId);
    try {
      // One partial update changes only profile fields and returns the stored profile.
      const row = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(body.native_language !== undefined ? { nativeLanguage: body.native_language } : {}),
          ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
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
}
