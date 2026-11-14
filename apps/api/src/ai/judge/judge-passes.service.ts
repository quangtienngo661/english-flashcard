import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { userRef, type UserRef } from '../../common/user-ref.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_SYSTEM_ACTOR_ID } from '../ai.constants.js';
import { AI_OPERATIONS, type AiOperation, type AiProviderName } from '../ai.types.js';
import { EvalQueue } from '../eval/eval-queue.service.js';
import { AdminSpend } from '../runner/admin-spend.service.js';
import { toSelection, type Selection } from '../runner/to-selection.js';
import { JudgePassesRepository, type NewPassItem, type PassRow } from './judge-passes.repository.js';
import { JudgeScoresReader } from './judge-scores.reader.js';
import type { JudgePassKind, JudgePassStatus, JudgeSubject } from './judge.types.js';

/** Body of `POST /v1/admin/ai/eval/runs/:id/judge-passes`. */
export const createPassSchema = z.strictObject({ judge_id: z.uuid().transform((value) => value.toLowerCase()) });
export type CreatePassBody = z.input<typeof createPassSchema>;

/** A judge that can start now, with the selection its newest revision runs. */
export type StartableJudge = { judgeId: string; judgeRevisionId: string; revision: number; operation: AiOperation; selection: Selection };

export type JudgePassView = {
  id: string;
  kind: JudgePassKind;
  operation: AiOperation;
  eval_run_id: string | null;
  judge: { id: string; name: string };
  judge_revision: { id: string; revision: number; model: { provider: string; model_id: string } | null };
  status: JudgePassStatus;
  error: string | null;
  total: number | null;
  judged: number;
  /** Subjects of this pass whose score has no verdict ("không chấm được"). */
  unjudged: number;
  cost_usd: string | null;
  started_by_user: UserRef;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

const problem = (status: number, type: string, title: string) => new ProblemDetailsException({ status, type, title });
const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});
const running = () => problem(409, 'judge-pass-running', 'A judge pass of this revision is already queued or running');
const prismaCode = (error: unknown): unknown => (error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined);

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

/**
 * Judge passes (nhóm B design §5.4, D14, D17): one pass of one judge revision over the outputs of an eval run, or over real questions another
 * module hands in. Creating a pass only inserts rows and asks the queue; no provider is called here (design §4.4).
 */
@Injectable()
export class JudgePassesService {
  constructor(
    @Inject(JudgePassesRepository) private readonly passes: JudgePassesRepository,
    @Inject(JudgeScoresReader) private readonly scores: JudgeScoresReader,
    @Inject(AdminSpend) private readonly spend: AdminSpend,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(EvalQueue) private readonly queue: EvalQueue,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  /**
   * The refusals of every way to start a pass, in this order: unknown judge 404, inactive 400, an operation it does not score 400, no model
   * 409, provider not configured 409, unpriced model or usd cap reached 409, a queued or running pass of that revision 409 (B16, B22).
   */
  async startable(judgeId: string, op: AiOperation, now: Date): Promise<StartableJudge> {
    const found = await this.passes.judgeOf(judgeId);
    if (!found) throw problem(404, 'not-found', 'Not found');
    const { judge, revision } = found;
    if (!judge.active) throw invalid(['judge_id: judge is not active']);
    if (!judge.operations.includes(op)) throw invalid([`judge_id: judge does not score ${op}`]);
    if (!revision.model) throw problem(409, 'model-not-set', 'The judge has no model');
    if (!this.registry.get(revision.model.provider as AiProviderName)) throw problem(409, 'provider-not-configured', 'Provider not configured');
    const selection = toSelection('judge', revision, revision.model);
    await this.spend.assertCanStart(selection.price, now);
    if (await this.passes.hasActive(revision.id)) throw running();
    return { judgeId: judge.id, judgeRevisionId: revision.id, revision: revision.revision, operation: op, selection };
  }

  /** Judges the outputs of a finished or failed run that the newest revision of the judge has not judged completely (B15, Review focus 3). */
  async createForRun(actorId: string, runId: string, body: CreatePassBody): Promise<JudgePassView> {
    const parsed = createPassSchema.safeParse(body);
    if (!parsed.success) throw invalid(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
    const run = await this.passes.runOf(runId);
    if (!run || run.hiddenAt !== null) throw problem(404, 'not-found', 'Not found');
    if (run.status === 'queued' || run.status === 'running') throw problem(409, 'run-active', 'The run is still going');
    const operation = run.operation as AiOperation;
    const now = this.clock.now();
    const judge = await this.startable(parsed.data.judge_id, operation, now);
    // A succeeded item can lack its input (an old result whose example was deleted before nhóm B); the judge needs both sides.
    const items = (await this.passes.runItems(runId)).filter((item) => item.input !== null && item.output !== null);
    const judged = await this.scores.judgedSubjects(judge.judgeRevisionId, items.map((item) => item.id));
    const subjects: NewPassItem[] = items.filter((item) => !judged.has(item.id)).map((item, position) => ({
      position, subjectKind: 'eval_item', subjectId: item.id, input: item.input as Record<string, unknown>, output: item.output as Record<string, unknown>, context: null,
    }));
    const id = await this.insert({
      judgeRevisionId: judge.judgeRevisionId, kind: 'eval_run', operation, evalRunId: runId, filters: null, limit: null, startedBy: actorId,
    }, subjects, now);
    return this.get(id);
  }

  /** A pass over real questions another module chose (M4): one operation, named in `filters.operation`. Returns once the rows exist. */
  async createReal(args: {
    judgeId: string; kind: 'real'; filters: Record<string, unknown>; subjects: JudgeSubject[]; actorId: string;
  }): Promise<{ passId: string }> {
    const operation = z.enum(AI_OPERATIONS).safeParse(args.filters.operation);
    if (!operation.success) throw invalid([`filters.operation: expected one of the operations, got ${JSON.stringify(args.filters.operation) ?? 'nothing'}`]);
    const now = this.clock.now();
    const judge = await this.startable(args.judgeId, operation.data, now);
    const judged = await this.scores.judgedSubjects(judge.judgeRevisionId, args.subjects.map((subject) => subject.subjectId));
    const subjects: NewPassItem[] = args.subjects.filter((subject) => !judged.has(subject.subjectId)).map((subject, position) => ({
      position, subjectKind: 'real_question', subjectId: subject.subjectId, input: subject.input, output: subject.output, context: subject.context,
    }));
    const limit = Number.isInteger(args.filters.limit) ? (args.filters.limit as number) : null;
    const passId = await this.insert({
      judgeRevisionId: judge.judgeRevisionId, kind: 'real', operation: operation.data, evalRunId: null, filters: args.filters, limit, startedBy: args.actorId,
    }, subjects, now);
    return { passId };
  }

  async get(passId: string): Promise<JudgePassView> {
    const [view] = await this.views([passId]);
    if (!view) throw problem(404, 'not-found', 'Not found');
    return view;
  }

  /** Views of several passes in the order of `ids` (an unknown id is left out), with one lookup of the people and one of the counts. */
  async views(ids: string[]): Promise<JudgePassView[]> {
    const rows = await this.passes.find(ids);
    if (rows.length === 0) return [];
    const [emails, unjudged] = await Promise.all([this.identity.emailsOf(rows.map((row) => row.startedBy)), this.passes.unjudgedCounts(rows.map((row) => row.id))]);
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [view(row, unjudged.get(id) ?? 0, emails)] : [];
    });
  }

  /** Inserts the pass: with nothing to judge it ends at once, otherwise it is queued and the queue asked (a Redis outage leaves it for the hourly job). */
  private async insert(
    base: { judgeRevisionId: string; kind: JudgePassKind; operation: AiOperation; evalRunId: string | null; filters: Record<string, unknown> | null; limit: number | null; startedBy: string },
    subjects: NewPassItem[],
    now: Date,
  ): Promise<string> {
    let id: string;
    try {
      id = await this.passes.create({ ...base, status: subjects.length === 0 ? 'finished' : 'queued', total: subjects.length }, subjects, now);
    } catch (error) {
      // Two starts at once: the partial unique index (B16) lets only one in.
      if (prismaCode(error) === 'P2002') throw running();
      throw error;
    }
    if (subjects.length > 0) await this.queue.enqueueJudgePass(id);
    return id;
  }
}

function view(row: PassRow, unjudged: number, emails: ReadonlyMap<string, string>): JudgePassView {
  return {
    id: row.id, kind: row.kind as JudgePassKind, operation: row.operation as AiOperation, eval_run_id: row.evalRunId,
    judge: { id: row.revision.judge.id, name: row.revision.judge.name },
    judge_revision: {
      id: row.revision.id, revision: row.revision.revision,
      model: row.revision.model ? { provider: row.revision.model.provider, model_id: row.revision.model.modelId } : null,
    },
    status: row.status as JudgePassStatus, error: row.error, total: row.total, judged: row.judged, unjudged, cost_usd: row.costUsd?.toFixed(8) ?? null,
    started_by_user: userRef(row.startedBy, emails, SYSTEM_IDS), created_at: row.createdAt.toISOString(),
    started_at: row.startedAt?.toISOString() ?? null, finished_at: row.finishedAt?.toISOString() ?? null,
  };
}
