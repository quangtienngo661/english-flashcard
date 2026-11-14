import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { userRef, type UserRef } from '../../common/user-ref.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { AI_SYSTEM_ACTOR_ID } from '../ai.constants.js';
import type { AiOperation } from '../ai.types.js';
import { EXPECTED_OPERATIONS } from './expected.js';

export type SetView = {
  id: string; operation: AiOperation; version: number; held_out_ratio: number; frozen_by: string; frozen_by_user: UserRef; frozen_at: string;
  dev_count: number; held_out_count: number; revealed_count: number;
};

/** `input` and `expected` only for a dev item or a held-out one somebody revealed (R7). */
export type SetItemView = {
  example_id: string; position: number; split: string; revealed_at: string | null; in_working_set: boolean;
  input: unknown | null; expected: unknown | null;
};

type SetRow = { id: string; operation: string; version: number; heldOutRatio: { toString(): string }; frozenBy: string; frozenAt: Date };

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);
const problem = (status: number, type: string, title: string, extensions?: Record<string, unknown>) =>
  new ProblemDetailsException({ status, type, title, ...(extensions ? { extensions } : {}) });
const isUniqueViolation = (error: unknown): boolean => error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';

/** The frozen versions of an operation's example set (design §5.1 "Chốt phiên bản", D9). A frozen version never changes. */
@Injectable()
export class EvalSetsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  /**
   * Snapshots the working set as the next version. Refused (422) when an example of the four operations has no expected answer, or when
   * no example is held-out (B1); two admins freezing at the same moment end in the unique index, the second getting 409 (B37).
   */
  async freeze(actorId: string, op: AiOperation): Promise<SetView> {
    const ratio = (await this.settings.get()).ai.evalHeldOutRatio;
    let set: SetRow;
    let items: Array<{ split: string }>;
    try {
      ({ set, items } = await this.prisma.$transaction(async (tx) => {
        const examples = await tx.aiEvalExample.findMany({ where: { operation: op }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
        const missing = EXPECTED_OPERATIONS.includes(op) ? examples.filter((example) => example.expected === null).map((example) => example.id) : [];
        const noHeldOut = !examples.some((example) => example.split === 'held_out');
        if (missing.length > 0 || noHeldOut) {
          throw problem(422, 'eval-set-incomplete', 'The example set is not complete', { missing_expected: missing, no_held_out: noHeldOut });
        }
        const latest = await tx.aiEvalSet.findFirst({ where: { operation: op }, orderBy: { version: 'desc' }, select: { version: true } });
        const created = await tx.aiEvalSet.create({ data: {
          operation: op, version: (latest?.version ?? 0) + 1, heldOutRatio: ratio, frozenBy: actorId,
        } });
        await tx.aiEvalSetItem.createMany({ data: examples.map((example, position) => ({
          setId: created.id, exampleId: example.id, position, split: example.split, input: example.input as Prisma.InputJsonValue,
          ...(example.expected === null ? {} : { expected: example.expected as Prisma.InputJsonValue }),
        })) });
        return { set: created, items: examples };
      }));
    } catch (error) {
      if (isUniqueViolation(error)) throw problem(409, 'eval-set-conflict', 'Another version was frozen at the same time');
      throw error;
    }
    const emails = await this.identity.emailsOf([set.frozenBy]);
    const heldOut = items.filter((item) => item.split === 'held_out').length;
    return this.view(set, emails, { dev: items.length - heldOut, held_out: heldOut, revealed: 0 });
  }

  /** Every version of the operation, newest first, with how many items are dev, held-out and revealed. */
  async list(op: AiOperation): Promise<{ items: SetView[] }> {
    const rows = await this.prisma.aiEvalSet.findMany({ where: { operation: op }, orderBy: { version: 'desc' } });
    const counts = await this.counts(rows.map((row) => row.id));
    const emails = await this.identity.emailsOf(rows.map((row) => row.frozenBy));
    return { items: rows.map((row) => this.view(row, emails, counts.get(row.id) ?? { dev: 0, held_out: 0, revealed: 0 })) };
  }

  async get(id: string): Promise<SetView & { items: SetItemView[] }> {
    const row = await this.prisma.aiEvalSet.findUnique({ where: { id } });
    if (!row) throw problem(404, 'not-found', 'Not found');
    const items = await this.prisma.aiEvalSetItem.findMany({ where: { setId: id }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    const working = await this.prisma.aiEvalExample.findMany({ where: { id: { in: items.map((item) => item.exampleId) } }, select: { id: true } });
    const inWorkingSet = new Set(working.map((example) => example.id));
    const counts = await this.counts([id]);
    const emails = await this.identity.emailsOf([row.frozenBy]);
    return {
      ...this.view(row, emails, counts.get(id) ?? { dev: 0, held_out: 0, revealed: 0 }),
      items: items.map((item) => {
        const shown = item.split === 'dev' || item.revealedAt !== null;
        return {
          example_id: item.exampleId, position: item.position, split: item.split, revealed_at: item.revealedAt?.toISOString() ?? null,
          in_working_set: inWorkingSet.has(item.exampleId), input: shown ? item.input : null, expected: shown ? item.expected : null,
        };
      }),
    };
  }

  /** The newest version (the publish gate of a later milestone reuses it), or null when none was frozen. */
  async latest(op: AiOperation): Promise<{ id: string; version: number } | null> {
    const row = await this.prisma.aiEvalSet.findFirst({ where: { operation: op }, orderBy: { version: 'desc' }, select: { id: true, version: true } });
    return row ? { id: row.id, version: row.version } : null;
  }

  private async counts(setIds: string[]): Promise<Map<string, { dev: number; held_out: number; revealed: number }>> {
    const result = new Map<string, { dev: number; held_out: number; revealed: number }>();
    if (setIds.length === 0) return result;
    const bySplit = await this.prisma.aiEvalSetItem.groupBy({ by: ['setId', 'split'], where: { setId: { in: setIds } }, _count: { _all: true } });
    const revealed = await this.prisma.aiEvalSetItem.groupBy({
      by: ['setId'], where: { setId: { in: setIds }, split: 'held_out', revealedAt: { not: null } }, _count: { _all: true },
    });
    for (const setId of setIds) result.set(setId, { dev: 0, held_out: 0, revealed: 0 });
    for (const group of bySplit) {
      const entry = result.get(group.setId)!;
      if (group.split === 'held_out') entry.held_out = group._count._all;
      else entry.dev = group._count._all;
    }
    for (const group of revealed) result.get(group.setId)!.revealed = group._count._all;
    return result;
  }

  private view(row: SetRow, emails: ReadonlyMap<string, string>, counts: { dev: number; held_out: number; revealed: number }): SetView {
    return {
      id: row.id, operation: row.operation as AiOperation, version: row.version, held_out_ratio: Number(row.heldOutRatio.toString()),
      frozen_by: row.frozenBy, frozen_by_user: userRef(row.frozenBy, emails, SYSTEM_IDS), frozen_at: row.frozenAt.toISOString(),
      dev_count: counts.dev, held_out_count: counts.held_out, revealed_count: counts.revealed,
    };
  }
}
