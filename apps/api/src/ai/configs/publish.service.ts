import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { userRef, type UserRef } from '../../common/user-ref.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AI_SYSTEM_ACTOR_ID } from '../ai.constants.js';
import type { AiOperation } from '../ai.types.js';
import { EvalSetsService } from '../eval/eval-sets.service.js';
import { JudgeScoresReader } from '../judge/judge-scores.reader.js';
import type { EvalSplit, ExpectedResult, RuleResult, RunItemStatus } from '../eval/eval.types.js';
import { isComplete, type RunItemResult } from '../eval/run-stats.js';
import { ConfigsService } from './configs.service.js';
import type { ConfigsView, PublishWarning } from './configs.types.js';
import { baselineRequirement, publishWarnings } from './publish-check.js';

/** Body of `POST /v1/admin/ai/configs/{op}/publish`: every key is required, the two run ids may be null (a turn-off, or no baseline needed). */
export const publishSchema = z.strictObject({
  expected_version: z.number().int().min(0),
  candidate_run_id: z.uuid().transform((value) => value.toLowerCase()).nullable(),
  baseline_run_id: z.uuid().transform((value) => value.toLowerCase()).nullable(),
  acknowledge_warnings: z.boolean(),
});
export type PublishBody = z.input<typeof publishSchema>;

/** Body of `POST /v1/admin/ai/configs/{op}/rollback`: the live version the admin was looking at. */
export const rollbackSchema = z.strictObject({ expected_live_version: z.number().int().min(0) });
export type RollbackBody = z.input<typeof rollbackSchema>;

export type PublishCheckView = {
  operation: AiOperation;
  draft: { id: string; number: number; version: number };
  /** The draft has no model: publishing it turns the operation off, with no run needed (D38). */
  turn_off: boolean;
  set: { id: string; version: number } | null;
  candidate_run_id: string | null;
  baseline: { required: boolean; run_id: string | null };
  blockers: Array<'eval-required' | 'baseline-required'>;
  warnings: PublishWarning[];
};

type ConfigRef = { id: string; number: number; model_id: string | null };
export type ConfigEventView = {
  id: string;
  kind: string;
  at: string;
  actor_user: UserRef;
  config: ConfigRef;
  from_config: ConfigRef | null;
  candidate_run_id: string | null;
  baseline_run_id: string | null;
  warnings: PublishWarning[];
};

const problem = (status: number, type: string, title: string, extensions?: Record<string, unknown>) =>
  new ProblemDetailsException({ status, type, title, ...(extensions ? { extensions } : {}) });
const stale = () => problem(409, 'publish-stale', 'The page is out of date');
const invalid = (violations: string[]) => problem(400, 'validation-failed', 'Validation failed', { violations });
const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);
const cursorSchema = z.strictObject({ at: z.iso.datetime(), id: z.string() });

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw invalid(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  return result.data;
}

/** Publish check, publish, rollback and history of the configs of an operation (design §6.3, §6.3b, §6.4). */
@Injectable()
export class PublishService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ConfigsService) private readonly configs: ConfigsService,
    @Inject(EvalSetsService) private readonly sets: EvalSetsService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(JudgeScoresReader) private readonly judgeScores: JudgeScoresReader,
  ) {}

  /**
   * What a publish of the draft needs and would warn about. A draft without a model is a turn-off: no run, no warning (D38). Otherwise the
   * candidate is the draft's newest complete run (at its current version) on the newest frozen set; the baseline the live config's, unless
   * the live config has no model (D37).
   */
  async check(op: AiOperation): Promise<PublishCheckView> {
    const draft = await this.prisma.aiConfig.findFirst({ where: { operation: op, status: 'draft' } });
    if (!draft) throw problem(404, 'not-found', 'Not found');
    const base = { operation: op, draft: { id: draft.id, number: draft.number, version: draft.version } };
    if (draft.modelRef === null) {
      return { ...base, turn_off: true, set: null, candidate_run_id: null, baseline: { required: false, run_id: null }, blockers: [], warnings: [] };
    }
    const pointer = await this.prisma.aiLiveConfig.findUnique({ where: { operation: op } });
    const live = pointer ? await this.prisma.aiConfig.findUnique({ where: { id: pointer.configId } }) : null;
    if (!live) throw problem(404, 'not-found', 'Not found');
    const required = baselineRequirement({ modelRef: live.modelRef }) === 'required';
    const set = await this.sets.latest(op);
    if (!set) {
      return { ...base, turn_off: false, set: null, candidate_run_id: null, baseline: { required, run_id: null }, blockers: ['eval-required'], warnings: [] };
    }
    const candidate = await this.completeRun(draft.id, draft.version, set.id);
    const baseline = required ? await this.completeRun(live.id, live.version, set.id) : null;
    const blockers: PublishCheckView['blockers'] = [];
    if (!candidate) blockers.push('eval-required');
    if (required && !baseline) blockers.push('baseline-required');
    return {
      ...base, turn_off: false, set, candidate_run_id: candidate?.id ?? null, baseline: { required, run_id: baseline?.id ?? null }, blockers,
      warnings: candidate && baseline ? await this.warningsOf(candidate, baseline) : [],
    };
  }

  /** The gate's warnings, the judge criteria included: the judge scores of both runs are read only when both runs exist (no baseline, no judge read). */
  private async warningsOf(candidate: { id: string; items: RunItemResult[] }, baseline: { id: string; items: RunItemResult[] }): Promise<PublishWarning[]> {
    const [judgeCandidate, judgeBaseline] = await Promise.all([this.judgeScores.byRun(candidate.id), this.judgeScores.byRun(baseline.id)]);
    return publishWarnings(candidate.items, baseline.items, { candidate: judgeCandidate, baseline: judgeBaseline });
  }

  /**
   * Makes the draft live. Order (design §6.3 step 4): the draft is there, its version, then the evidence (a turn-off needs none and refuses any),
   * then one transaction guarded by the pointer's version so two publishes at once cannot both win (B31).
   */
  async publish(actorId: string, op: AiOperation, body: PublishBody): Promise<ConfigsView> {
    const input = parse(publishSchema, body);
    const draft = await this.prisma.aiConfig.findFirst({ where: { operation: op, status: 'draft' } });
    if (!draft) throw stale();
    if (draft.version !== input.expected_version) throw problem(409, 'draft-version-conflict', 'The draft changed');
    const pointer = await this.prisma.aiLiveConfig.findUnique({ where: { operation: op } });
    if (!pointer) throw problem(404, 'not-found', 'Not found');
    let acknowledged: PublishWarning[] = [];
    let candidateRunId: string | null = null;
    let baselineRunId: string | null = null;
    if (draft.modelRef === null) {
      if (input.candidate_run_id !== null || input.baseline_run_id !== null) throw stale();
    } else {
      const check = await this.check(op);
      if (check.candidate_run_id === null) throw problem(409, 'eval-required', 'The draft has no complete run on the newest frozen set');
      if (check.baseline.required && check.baseline.run_id === null) throw problem(409, 'baseline-required', 'The live config has no complete run on the newest frozen set');
      if (input.candidate_run_id !== check.candidate_run_id || input.baseline_run_id !== check.baseline.run_id) throw stale();
      if (check.warnings.length > 0 && !input.acknowledge_warnings) throw problem(409, 'publish-warnings', 'The publish has warnings', { warnings: check.warnings });
      acknowledged = check.warnings;
      candidateRunId = check.candidate_run_id;
      baselineRunId = check.baseline.run_id;
    }
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.aiLiveConfig.updateMany({
        where: { operation: op, version: pointer.version },
        data: { configId: draft.id, previousConfigId: pointer.configId, version: { increment: 1 } },
      });
      if (moved.count === 0) throw stale();
      const published = await tx.aiConfig.updateMany({
        where: { id: draft.id, status: 'draft', version: input.expected_version }, data: { status: 'published', publishedBy: actorId, publishedAt: now },
      });
      if (published.count === 0) throw stale();
      await tx.aiConfig.updateMany({ where: { id: pointer.configId }, data: { status: 'retired' } });
      await tx.aiConfigEvent.create({ data: {
        operation: op, kind: 'publish', configId: draft.id, fromConfigId: pointer.configId, candidateRunId, baselineRunId,
        warnings: acknowledged as unknown as Prisma.InputJsonArray, actorId, at: now,
      } });
    });
    return this.configs.get(op);
  }

  /** Puts the config before the live one back (no eval needed). `expected_live_version` keeps a stale page from undoing a newer publish. */
  async rollback(actorId: string, op: AiOperation, body: RollbackBody): Promise<ConfigsView> {
    const input = parse(rollbackSchema, body);
    const pointer = await this.prisma.aiLiveConfig.findUnique({ where: { operation: op } });
    if (!pointer) throw problem(404, 'not-found', 'Not found');
    if (pointer.previousConfigId === null) throw problem(409, 'no-previous', 'There is no earlier config to go back to');
    if (pointer.version !== input.expected_live_version) throw stale();
    const previousId = pointer.previousConfigId;
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.aiLiveConfig.updateMany({
        where: { operation: op, version: pointer.version },
        data: { configId: previousId, previousConfigId: null, version: { increment: 1 } },
      });
      if (moved.count === 0) throw stale();
      await tx.aiConfig.updateMany({ where: { id: pointer.configId }, data: { status: 'retired' } });
      await tx.aiConfig.updateMany({ where: { id: previousId }, data: { status: 'published' } });
      await tx.aiConfigEvent.create({ data: {
        operation: op, kind: 'rollback', configId: previousId, fromConfigId: pointer.configId, candidateRunId: null, baselineRunId: null, warnings: [], actorId, at: now,
      } });
    });
    return this.configs.get(op);
  }

  /** Publishes and rollbacks of the operation, newest first. */
  async history(op: AiOperation, pageSize: number, pageToken: string | undefined) {
    const binding = createHash('sha256').update(JSON.stringify({ route: 'ai-config-history', operation: op })).digest('hex');
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (pageToken !== undefined) {
      const parsed = cursorSchema.safeParse(decodeBoundToken(pageToken, binding));
      if (!parsed.success) throw invalid(['page_token: Invalid page token']);
      cursor = parsed.data;
    }
    const rows = await this.prisma.aiConfigEvent.findMany({
      where: {
        operation: op,
        ...(cursor ? { OR: [{ at: { lt: new Date(cursor.at) } }, { at: new Date(cursor.at), id: { lt: cursor.id } }] } : {}),
      },
      orderBy: [{ at: 'desc' }, { id: 'desc' }], take: pageSize + 1,
    });
    const page = rows.slice(0, pageSize);
    const configIds = [...new Set(page.flatMap((row) => [row.configId, ...(row.fromConfigId ? [row.fromConfigId] : [])]))];
    const [configs, emails] = await Promise.all([
      configIds.length > 0 ? this.prisma.aiConfig.findMany({ where: { id: { in: configIds } }, include: { model: true } }) : [],
      this.identity.emailsOf(page.map((row) => row.actorId)),
    ]);
    const refs = new Map<string, ConfigRef>(configs.map((config) => [config.id, { id: config.id, number: config.number, model_id: config.model?.modelId ?? null }]));
    const last = page.at(-1);
    const items: ConfigEventView[] = page.map((row) => ({
      id: row.id, kind: row.kind, at: row.at.toISOString(), actor_user: userRef(row.actorId, emails, SYSTEM_IDS),
      config: refs.get(row.configId) ?? { id: row.configId, number: 0, model_id: null },
      from_config: row.fromConfigId ? (refs.get(row.fromConfigId) ?? null) : null,
      candidate_run_id: row.candidateRunId, baseline_run_id: row.baselineRunId, warnings: row.warnings as unknown as PublishWarning[],
    }));
    return {
      items,
      next_page_token: rows.length > pageSize && last ? encodeBoundToken({ at: last.at.toISOString(), id: last.id }, binding) : null,
    };
  }

  /** The newest complete run ("xong trọn", design §5.3) of a config at a version on a set, with its items; null when there is none. */
  private async completeRun(configId: string, configVersion: number, setId: string): Promise<{ id: string; items: RunItemResult[] } | null> {
    const runs = await this.prisma.aiEvalRun.findMany({
      // A run "deleted" while it held labels is hidden and answers 404, so it is no evidence either (nhóm B M3).
      where: { configId, configVersion, setId, status: 'finished', hiddenAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (runs.length === 0) return null;
    const rows = await this.prisma.aiEvalRunItem.findMany({ where: { runId: { in: runs.map((run) => run.id) } }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    for (const run of runs) {
      const items: RunItemResult[] = rows.filter((row) => row.runId === run.id).map((row) => ({
        exampleId: row.exampleId, position: row.position, split: row.split as EvalSplit, status: row.status as RunItemStatus,
        rule: row.rule as RuleResult | null, expectedResult: row.expectedResult as ExpectedResult | null,
      }));
      if (isComplete('finished', items)) return { id: run.id, items };
    }
    return null;
  }
}
