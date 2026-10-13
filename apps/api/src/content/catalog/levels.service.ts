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
