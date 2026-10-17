import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { LEVELS, OWNER_SOURCE_ID, type Level } from '../content.constants.js';

export type ImportedLevelInput = {
  entryId: string; sourceId: string; level: Level; extra: Record<string, string> | null;
};
export type EntryLevelView = { id: string; level: Level };

function validateLevel(level: Level): void {
  if (!LEVELS.includes(level)) {
    throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
  }
}

/** Write methods use the caller's transaction and entry-key lock. */
@Injectable()
export class LevelsService {
  constructor(@Inject(Clock) private readonly clock: Clock) {}

  async listLevels(tx: Prisma.TransactionClient, entryId: string, sourceId: string): Promise<EntryLevelView[]> {
    const rows = await tx.entryLevel.findMany({ where: { entryId, sourceId }, select: { id: true, level: true } });
    return rows.map(({ id, level }) => ({ id, level: level as Level }));
  }

  async addImportedLevel(tx: Prisma.TransactionClient, input: ImportedLevelInput): Promise<{ created: boolean; id: string }> {
    validateLevel(input.level);
    const { entryId, sourceId, level, extra } = input;
    const result = await tx.entryLevel.createMany({
      data: {
        entryId, sourceId, level, basis: sourceId === OWNER_SOURCE_ID ? 'editorial' : 'imported',
        ...(extra !== null ? { sourceExtra: extra } : {}), createdAt: this.clock.now(),
      },
      skipDuplicates: true,
    });
    const row = await tx.entryLevel.findUniqueOrThrow({
      where: { entryId_sourceId_level: { entryId, sourceId, level } }, select: { id: true },
    });
    return { created: result.count === 1, id: row.id };
  }

  /** The level shown for an entry: newest editorial/user choice first, then by source priority. */
  async displayedLevel(tx: Prisma.TransactionClient, entryId: string): Promise<Level | null> {
    const [row] = await tx.$queryRaw<Array<{ level: Level }>>`
      SELECT el.level FROM entry_levels el JOIN data_sources ds ON ds.id = el.source_id
      WHERE el.entry_id = ${entryId}::uuid
      ORDER BY (el.basis IN ('editorial', 'user')) DESC,
        CASE WHEN el.basis IN ('editorial', 'user') THEN el.created_at END DESC,
        CASE WHEN el.basis IN ('editorial', 'user') THEN el.id END ASC,
        ds.display_priority ASC, ds.id ASC,
        array_position(ARRAY['A1', 'A2', 'B1', 'B2', 'C1', 'C2']::text[], el.level) ASC
      LIMIT 1`;
    return row?.level ?? null;
  }

  /** D29: an entry with no level takes its form-of base's displayed level (basis derived, owner source). */
  async addDerivedLevel(tx: Prisma.TransactionClient, entryId: string, baseEntryId: string): Promise<{ id: string } | null> {
    if (await tx.entryLevel.findFirst({ where: { entryId }, select: { id: true } })) return null;
    const level = await this.displayedLevel(tx, baseEntryId);
    if (level === null) return null;
    return tx.entryLevel.create({ data: { entryId, level, sourceId: OWNER_SOURCE_ID, basis: 'derived', createdAt: this.clock.now() },
      select: { id: true } });
  }

  async setEditorialLevel(tx: Prisma.TransactionClient, entryId: string, level: Level): Promise<void> {
    validateLevel(level);
    if (!await tx.entry.findUnique({ where: { id: entryId }, select: { id: true } })) {
      throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    }
    await tx.entryLevel.upsert({
      where: { entryId_sourceId_level: { entryId, sourceId: OWNER_SOURCE_ID, level } },
      create: { entryId, sourceId: OWNER_SOURCE_ID, level, basis: 'editorial', createdAt: this.clock.now() },
      // Refresh only the owner's editorial choice when reselecting a level; imported rows stay immutable.
      update: { createdAt: this.clock.now() },
    });
  }
}
