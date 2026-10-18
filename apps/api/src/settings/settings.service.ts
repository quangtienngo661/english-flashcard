import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../common/clock/clock.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { decodePageToken, encodePageToken } from '../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../common/problem-details/problem-details.exception.js';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import { IdentityService } from '../identity/profile/identity.service.js';
import {
  applyPatch, changedFields, crossFieldViolations, withDefaults,
  type AppSettings, type SettingsValuesPatch,
} from './settings.definitions.js';

const GLOBAL_KEY = 'global';
const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

export type SettingChangeView = {
  key: string; old_value: unknown; new_value: unknown; changed_by: { id: string; email: string | null }; changed_at: string;
};

const versionConflict = () => new ProblemDetailsException({ status: 409, title: 'Version conflict', type: 'version-conflict' });
const invalidInput = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });

function isUniqueViolation(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';
}

@Injectable()
export class SettingsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}

  /** Current values; the defaults until an admin first saves. */
  async get(): Promise<AppSettings> {
    return (await this.current()).values;
  }

  async current(): Promise<{ version: number; values: AppSettings }> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: GLOBAL_KEY } });
    return { version: row?.version ?? 0, values: withDefaults(row?.value) };
  }

  async update(actorId: string, version: number, patch: SettingsValuesPatch): Promise<{ version: number; values: AppSettings }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.appSetting.findUnique({ where: { key: GLOBAL_KEY } });
        if ((row?.version ?? 0) !== version) throw versionConflict();
        const before = withDefaults(row?.value);
        const after = applyPatch(before, patch);
        const violations = crossFieldViolations(after);
        if (violations.length) {
          throw new ProblemDetailsException({
            status: 400, title: 'Validation failed', type: 'validation-failed', extensions: { violations },
          });
        }
        const now = this.clock.now();
        const data = { value: after, version: version + 1, updatedBy: actorId, updatedAt: now };
        if (row) {
          // The version guard makes a concurrent save of the same version update nothing.
          const { count } = await tx.appSetting.updateMany({ where: { key: GLOBAL_KEY, version }, data });
          if (count === 0) throw versionConflict();
        } else {
          await tx.appSetting.create({ data: { key: GLOBAL_KEY, ...data } });
        }
        const changes = changedFields(before, after);
        if (changes.length) {
          await tx.appSettingChange.createMany({ data: changes.map(({ key, oldValue, newValue }) => ({
            // The columns are required Json: an empty value ("để trống") is stored as JSON null.
            key, oldValue: oldValue ?? Prisma.JsonNull, newValue: newValue ?? Prisma.JsonNull, changedBy: actorId, changedAt: now,
          })) });
        }
        return { version: version + 1, values: after };
      }, transactionOptions);
    } catch (error) {
      // Two first saves race on the primary key: the loser saw version 0 too late.
      if (isUniqueViolation(error)) throw versionConflict();
      throw error;
    }
  }

  async history(pageSize: number, pageToken?: string): Promise<{ items: SettingChangeView[]; next_page_token: string | null }> {
    let after: { changedAt: Date; id: string } | undefined;
    if (pageToken !== undefined) {
      const cursor = decodePageToken(pageToken);
      if (!cursor || !/^[0-9a-f-]{36}$/.test(cursor.id)) throw invalidInput();
      const row = await this.prisma.appSettingChange.findUnique({ where: { id: cursor.id }, select: { changedAt: true, id: true } });
      if (!row) throw invalidInput();
      after = row;
    }
    const rows = await this.prisma.appSettingChange.findMany({
      where: after ? { OR: [{ changedAt: { lt: after.changedAt } }, { changedAt: after.changedAt, id: { lt: after.id } }] } : {},
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }], take: pageSize + 1,
    });
    const page = rows.slice(0, pageSize);
    const actorIds = [...new Set(page.map((row) => row.changedBy))];
    const emails = new Map(await Promise.all(actorIds.map(async (id) =>
      [id, (await this.identity.getProfile(id))?.email ?? null] as const)));
    return {
      items: page.map((row) => ({
        key: row.key, old_value: row.oldValue, new_value: row.newValue,
        changed_by: { id: row.changedBy, email: emails.get(row.changedBy) ?? null }, changed_at: row.changedAt.toISOString(),
      })),
      next_page_token: rows.length > pageSize ? encodePageToken({ id: page[page.length - 1].id }) : null,
    };
  }
}
