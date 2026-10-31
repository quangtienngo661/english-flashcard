import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { AiOperation } from '../ai.types.js';
import type { PromptExample } from '../prompts/prompt-rules.js';
import type { ModelRow } from '../runner/to-selection.js';
import { JudgeScoresReader } from './judge-scores.reader.js';
import type { JudgeCriterion, JudgePassKind, JudgePassStatus, ScoreRow, SubjectKind } from './judge.types.js';

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

/** A pass the worker has taken: what the job needs besides its items and its revision. */
export type PassToRun = { id: string; judgeRevisionId: string; operation: AiOperation; startedBy: string };

/** The revision a pass runs: its criteria and text, its settings and its model (null only if the model is gone, which the foreign key forbids). */
export type RevisionToRun = {
  id: string; revision: number; criteria: JudgeCriterion[]; instructions: string; examples: PromptExample[]; effort: string | null;
  thinking: string | null; maxOutputTokens: number | null; model: ModelRow | null;
};

/** One snapshot item still to judge. */
export type PassItemRow = {
  id: string; position: number; subjectKind: SubjectKind; subjectId: string; input: Record<string, unknown>; output: Record<string, unknown>;
  context: { session_words: string[] } | null;
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

/** What passes and the things they read are stored as (`ai_judge_passes`, `ai_judge_pass_items`, `ai_judge_scores`), the job's statements included. */
@Injectable()
export class JudgePassesRepository {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(JudgeScoresReader) private readonly scores: JudgeScoresReader,
  ) {}

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

  /**
   * The worker takes a queued (or already running) pass that has its snapshot: it becomes `running` with a heartbeat. Null for any other pass,
   * so a second delivery of the job, a cancelled pass or one still waiting for its run does nothing.
   */
  async start(passId: string, now: Date): Promise<PassToRun | null> {
    const [row] = await this.prisma.$queryRaw<Array<{ id: string; judge_revision_id: string; operation: AiOperation; started_by: string }>>`
      UPDATE ai_judge_passes SET status = 'running', started_at = COALESCE(started_at, ${now}), heartbeat_at = ${now}
      WHERE id = ${passId}::uuid AND status IN ('queued', 'running') AND total IS NOT NULL
      RETURNING id, judge_revision_id, operation, started_by`;
    return row ? { id: row.id, judgeRevisionId: row.judge_revision_id, operation: row.operation, startedBy: row.started_by } : null;
  }

  async revisionOf(revisionId: string): Promise<RevisionToRun | null> {
    const row = await this.prisma.aiJudgeRevision.findUnique({ where: { id: revisionId }, include: { model: true } });
    if (!row) return null;
    return {
      id: row.id, revision: row.revision, criteria: row.criteria as JudgeCriterion[], instructions: row.instructions, examples: row.examples as PromptExample[],
      effort: row.effort, thinking: row.thinking, maxOutputTokens: row.maxOutputTokens, model: row.model as ModelRow | null,
    };
  }

  /** The snapshot items that have no score yet, in position order (a resumed pass skips the finished ones). */
  async pendingItems(passId: string): Promise<PassItemRow[]> {
    const rows = await this.prisma.aiJudgePassItem.findMany({ where: { passId, done: false }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    return rows.map((row) => ({
      id: row.id, position: row.position, subjectKind: row.subjectKind as SubjectKind, subjectId: row.subjectId, input: row.input as Record<string, unknown>,
      output: row.output as Record<string, unknown>, context: row.context as { session_words: string[] } | null,
    }));
  }

  /** True only while the pass is `running`; the job asks before each paid call, so a cancelled pass costs no more. */
  async isRunning(passId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ one: number }>>`SELECT 1 AS one FROM ai_judge_passes WHERE id = ${passId}::uuid AND status = 'running'`;
    return rows.length > 0;
  }

  /**
   * One statement, so an item is never half written: the scores of its criteria, the item `done`, the pass's `judged + 1`, its cost and heartbeat,
   * all only while the pass is `running`. A subject is scored once per revision and criterion: an existing score is overwritten only when it has no
   * verdict ("không chấm được"), so asking again pays for what is missing and never changes a verdict (B15).
   */
  async writeScores(
    pass: { id: string; judgeRevisionId: string },
    item: { id: string; subjectKind: SubjectKind; subjectId: string },
    rows: ScoreRow[],
    callId: string | null,
    costUsd: string | null,
    now: Date,
  ): Promise<void> {
    const values = Prisma.join(rows.map((row) => Prisma.sql`(${row.criterion}::text, ${row.verdict}::text, ${row.problem}::text, ${row.reason}::text)`));
    await this.prisma.$executeRaw(Prisma.sql`
      WITH live AS (
        SELECT id FROM ai_judge_passes WHERE id = ${pass.id}::uuid AND status = 'running'
      ), scored AS (
        INSERT INTO ai_judge_scores (judge_revision_id, subject_kind, subject_id, criterion, verdict, problem, reason, pass_id, call_id, created_at)
        SELECT ${pass.judgeRevisionId}::uuid, ${item.subjectKind}, ${item.subjectId}::uuid, v.criterion, v.verdict, v.problem, v.reason,
          live.id, ${callId}::uuid, ${now}
        FROM live, (VALUES ${values}) AS v(criterion, verdict, problem, reason)
        ON CONFLICT (judge_revision_id, subject_kind, subject_id, criterion) DO UPDATE
          SET verdict = EXCLUDED.verdict, problem = EXCLUDED.problem, reason = EXCLUDED.reason, pass_id = EXCLUDED.pass_id,
            call_id = EXCLUDED.call_id, created_at = EXCLUDED.created_at
          WHERE ai_judge_scores.verdict IS NULL
        RETURNING 1
      ), marked AS (
        UPDATE ai_judge_pass_items SET done = true WHERE id = ${item.id}::uuid AND pass_id IN (SELECT id FROM live) RETURNING 1
      )
      UPDATE ai_judge_passes SET judged = judged + 1, cost_usd = COALESCE(cost_usd, 0) + COALESCE(${costUsd}::numeric, 0), heartbeat_at = ${now}
      WHERE id IN (SELECT id FROM live)`);
  }

  async finish(passId: string, now: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_judge_passes SET status = 'finished', finished_at = ${now}, heartbeat_at = ${now} WHERE id = ${passId}::uuid AND status = 'running'`;
  }

  /** The error is a code or a name, never a message that could echo content (as `ai_eval_runs.error`). */
  async fail(passId: string, error: string, now: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_judge_passes SET status = 'failed', error = ${error}, finished_at = ${now}
      WHERE id = ${passId}::uuid AND status IN ('queued', 'running')`;
  }

  /**
   * A run has ended (or the hourly job found it ended): its waiting passes (made with the run, `total` NULL) take their snapshot now. Run
   * `finished` → each waiting pass gets the run's judgeable outputs its revision has not judged, or ends at once when there are none; the ids of the
   * run's passes that now wait for the worker come back. Run `failed` → its queued passes fail with `run-failed`, nothing comes back. Any other
   * state, or a run that is gone → nothing. Two callers at once are safe: the snapshot is claimed by the `total IS NULL` guard in a transaction.
   */
  async release(runId: string, now: Date): Promise<string[]> {
    const run = await this.prisma.aiEvalRun.findUnique({ where: { id: runId }, select: { status: true } });
    if (!run) return [];
    if (run.status === 'failed') {
      await this.prisma.aiJudgePass.updateMany({ where: { evalRunId: runId, status: 'queued' }, data: { status: 'failed', error: 'run-failed', finishedAt: now } });
      return [];
    }
    if (run.status !== 'finished') return [];
    const waiting = await this.prisma.aiJudgePass.findMany({ where: { evalRunId: runId, status: 'queued', total: null }, select: { id: true, judgeRevisionId: true } });
    if (waiting.length > 0) {
      const items = (await this.runItems(runId)).filter((item) => item.input !== null && item.output !== null);
      for (const pass of waiting) {
        const judged = await this.scores.judgedSubjects(pass.judgeRevisionId, items.map((item) => item.id));
        const subjects = items.filter((item) => !judged.has(item.id));
        await this.snapshot(pass.id, subjects, now);
      }
    }
    const queued = await this.prisma.aiJudgePass.findMany({ where: { evalRunId: runId, status: 'queued', total: { gt: 0 } }, select: { id: true }, orderBy: { createdAt: 'asc' } });
    return queued.map((pass) => pass.id);
  }

  private async snapshot(passId: string, subjects: RunItemToJudge[], now: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.aiJudgePass.updateMany({
        where: { id: passId, status: 'queued', total: null },
        data: subjects.length === 0 ? { total: 0, status: 'finished', startedAt: now, finishedAt: now } : { total: subjects.length },
      });
      if (claimed.count === 0 || subjects.length === 0) return;
      await tx.aiJudgePassItem.createMany({ data: subjects.map((item, position) => ({
        passId, position, subjectKind: 'eval_item', subjectId: item.id, input: item.input as Prisma.InputJsonObject, output: item.output as Prisma.InputJsonObject,
      })) });
    });
  }
}
