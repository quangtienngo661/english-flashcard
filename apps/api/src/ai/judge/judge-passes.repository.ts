import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { AiOperation } from '../ai.types.js';
import type { ModelRow } from '../runner/to-selection.js';
import type { JudgePassKind, JudgePassStatus, SubjectKind } from './judge.types.js';

/** A pass to insert. `status` is `queued`, or `finished` when there is nothing to judge (then `total` is 0). */
export type NewPass = {
  judgeRevisionId: string;
  kind: JudgePassKind;
  operation: AiOperation;
  evalRunId: string | null;
  filters: Record<string, unknown> | null;
  limit: number | null;
  status: 'queued' | 'finished';
  /** Null while the pass waits for its run to finish (it takes its snapshot then). */
  total: number | null;
  startedBy: string;
};

export type NewPassItem = {
  position: number;
  subjectKind: SubjectKind;
  subjectId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  context: { session_words: string[] } | null;
};

/** A judge and its newest revision with the model that revision names, as a pass needs them to start. */
export type JudgeAndRevision = {
  judge: { id: string; name: string; operations: string[]; active: boolean };
  revision: { id: string; revision: number; effort: string | null; thinking: string | null; maxOutputTokens: number | null; model: ModelRow | null };
};

export type RunToJudge = { id: string; operation: string; status: string; hiddenAt: Date | null };
export type RunItemToJudge = { id: string; input: unknown; output: unknown };

export type PassRow = {
  id: string; kind: string; operation: string; evalRunId: string | null; status: string; error: string | null; total: number | null;
  judged: number; costUsd: { toFixed(digits: number): string } | null; startedBy: string; createdAt: Date; startedAt: Date | null; finishedAt: Date | null;
  revision: {
    id: string; revision: number; judge: { id: string; name: string }; model: { provider: string; modelId: string } | null;
  };
};

const ACTIVE: JudgePassStatus[] = ['queued', 'running'];

/** What passes and the things they read are stored as (`ai_judge_passes`, `ai_judge_pass_items`); the job's own statements join this class in M3-T9. */
@Injectable()
export class JudgePassesRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** The pass and its items in one transaction; the partial unique index of B16 reaches the caller as P2002. Returns the pass id. */
  async create(pass: NewPass, items: NewPassItem[], now: Date): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.aiJudgePass.create({
        data: {
          judgeRevisionId: pass.judgeRevisionId, kind: pass.kind, operation: pass.operation, evalRunId: pass.evalRunId,
          ...(pass.filters === null ? {} : { filters: pass.filters as Prisma.InputJsonObject }),
          ...(pass.limit === null ? {} : { limit: pass.limit }),
          status: pass.status, total: pass.total, startedBy: pass.startedBy,
          // A pass with nothing to judge ends the moment it is made.
          ...(pass.status === 'finished' ? { startedAt: now, finishedAt: now } : {}),
        },
      });
      if (items.length > 0) {
        await tx.aiJudgePassItem.createMany({ data: items.map((item) => ({
          passId: row.id, position: item.position, subjectKind: item.subjectKind, subjectId: item.subjectId,
          input: item.input as Prisma.InputJsonObject, output: item.output as Prisma.InputJsonObject,
          // A Json column takes no plain null: the key is left out and the column stays SQL NULL.
          ...(item.context === null ? {} : { context: item.context as Prisma.InputJsonObject }),
        })) });
      }
      return row.id;
    });
  }

  async judgeOf(judgeId: string): Promise<JudgeAndRevision | null> {
    const judge = await this.prisma.aiJudge.findUnique({ where: { id: judgeId } });
    if (!judge) return null;
    const revision = await this.prisma.aiJudgeRevision.findFirst({ where: { judgeId }, orderBy: { revision: 'desc' }, include: { model: true } });
    if (!revision) return null;
    return {
      judge: { id: judge.id, name: judge.name, operations: judge.operations, active: judge.active },
      revision: {
        id: revision.id, revision: revision.revision, effort: revision.effort, thinking: revision.thinking, maxOutputTokens: revision.maxOutputTokens,
        model: revision.model as ModelRow | null,
      },
    };
  }

  /** Is a pass of this revision queued or running (B16)? */
  async hasActive(judgeRevisionId: string): Promise<boolean> {
    return (await this.prisma.aiJudgePass.findFirst({ where: { judgeRevisionId, status: { in: ACTIVE } }, select: { id: true } })) !== null;
  }

  async runOf(runId: string): Promise<RunToJudge | null> {
    const run = await this.prisma.aiEvalRun.findUnique({ where: { id: runId }, select: { id: true, operation: true, status: true, hiddenAt: true } });
    return run ?? null;
  }

  /** The items of a run that produced an output, in position order; the caller drops those without input (an item migrated from before nhóm B). */
  runItems(runId: string): Promise<RunItemToJudge[]> {
    return this.prisma.aiEvalRunItem.findMany({
      where: { runId, status: 'succeeded' }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { id: true, input: true, output: true },
    });
  }

  async find(ids: string[]): Promise<PassRow[]> {
    if (ids.length === 0) return [];
    return await this.prisma.aiJudgePass.findMany({
      where: { id: { in: ids } }, include: { revision: { include: { judge: true, model: true } } },
    }) as unknown as PassRow[];
  }

  /** Per pass, the subjects with a score that has no verdict ("không chấm được"); a pass with none is absent from the map. */
  async unjudgedCounts(passIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (passIds.length === 0) return counts;
    const rows = await this.prisma.aiJudgeScore.groupBy({ by: ['passId', 'subjectId'], where: { passId: { in: passIds }, verdict: null } });
    for (const { passId } of rows) counts.set(passId, (counts.get(passId) ?? 0) + 1);
    return counts;
  }
}
