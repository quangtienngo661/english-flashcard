import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dayRange, daysOf } from '../../common/time/day-range.js';
import { addDays, daysBetween, localDate, zonedMidnight } from '../../common/time/local-date.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import { HeldOutReader } from '../eval/held-out.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_DAY_ZONE, MODEL_SHUTDOWN_WARNING_DAYS } from '../ai.constants.js';
import { AI_OPERATIONS, AI_PROVIDERS, type AiOperation, type AiPurpose, type AiProviderName, type CallOutcome, type UnavailableReason } from '../ai.types.js';
import { CallLedger } from '../runner/call-ledger.service.js';
import { ReadinessService } from '../runner/readiness.service.js';
import { toSelection } from '../runner/selection.js';
import type { DashboardJudgeRevision, JudgeScoreGroup, LatestEvalView } from './dashboard-quality.js';
import { DashboardQualityService } from './dashboard-quality.service.js';

export const COST_GROUPS = ['day', 'operation', 'model', 'purpose', 'outcome'] as const;
export type CostGroup = (typeof COST_GROUPS)[number];

/** The longest cost range (plan choice 15). */
const COST_RANGE_MAX_DAYS = 366;
const DAY_MS = 86_400_000;

// A fixed SQL expression per group (never built from input), so the grouping key cannot inject SQL.
const GROUP_KEYS: Record<CostGroup, Prisma.Sql> = {
  day: Prisma.raw(`to_char((created_at AT TIME ZONE '${AI_DAY_ZONE}')::date, 'YYYY-MM-DD')`),
  operation: Prisma.raw('operation'),
  model: Prisma.raw(`provider || '/' || model`),
  purpose: Prisma.raw('purpose'),
  outcome: Prisma.raw('outcome'),
};

const SUMS = Prisma.raw(`count(*)::int AS calls, coalesce(sum(input_tokens), 0)::bigint AS input_tokens,
  coalesce(sum(cached_input_tokens), 0)::bigint AS cached_input_tokens, coalesce(sum(output_tokens), 0)::bigint AS output_tokens,
  coalesce(sum(reasoning_tokens), 0)::bigint AS reasoning_tokens, coalesce(sum(cost_usd), 0)::numeric(20, 8)::text AS cost_usd,
  (count(*) FILTER (WHERE NOT cost_known))::int AS unknown_cost_calls`);

type SumRow = {
  calls: number; input_tokens: bigint | number; cached_input_tokens: bigint | number; output_tokens: bigint | number;
  reasoning_tokens: bigint | number; cost_usd: string; unknown_cost_calls: number;
};

export type CostTotals = {
  calls: number; input_tokens: number; cached_input_tokens: number; output_tokens: number; reasoning_tokens: number; cost_usd: string;
  cost_vnd: number; unknown_cost_calls: number;
};

export type StatusReport = {
  operations: Array<{
    operation: AiOperation;
    ready: boolean;
    reason: UnavailableReason | null;
    model: { provider: AiProviderName; model_id: string } | null;
    effort: string | null;
    thinking: 'disabled' | 'between_tools' | null;
    max_output_tokens: number | null;
    last_error: { at: string; outcome: CallOutcome; http_status: number | null; purpose: AiPurpose } | null;
    model_warning: { shutdown_at: string | null; lifecycle: string | null } | null;
  }>;
  /** `calls` counts learner calls (what the daily cap limits); `admin_cost_usd` is what test, eval and judge calls cost today (nhóm B M3). */
  today: {
    calls: number; cap: number | null; failed_calls: number; failed_cost_usd: string; cost_usd: string; cost_vnd: number;
    admin_cost_usd: string; admin_usd_cap: number | null;
  };
  ai_enabled: boolean;
  providers: Record<AiProviderName, boolean>;
};

/** Days shown when the dashboard is opened without a range. */
export const DASHBOARD_DEFAULT_DAYS = 30;

export type DashboardReport = {
  from: string;
  to: string;
  ai_enabled: boolean;
  today: StatusReport['today'];
  operations: Array<Pick<StatusReport['operations'][number], 'operation' | 'ready' | 'reason' | 'model' | 'last_error'>>;
  total: CostTotals;
  days: Array<{ date: string; calls: number; cost_usd: string; cost_vnd: number; learner_calls: number; learner_failed: number }>;
  by_operation: Array<CostTotals & { key: string }>;
  by_model: Array<CostTotals & { key: string }>;
  by_purpose: Array<CostTotals & { key: string }>;
  learner_health: Array<{ operation: string; calls: number; failed: number; p50_ms: number; p95_ms: number; outcomes: Record<string, number> }>;
  /** Nhóm B M5 (design §8): the latest complete eval of each live config, the judge's scores from eval grouped by config and model, and each judge revision's calibration. */
  latest_evals: LatestEvalView[];
  judge_scores: JudgeScoreGroup[];
  judge_revisions: DashboardJudgeRevision[];
};

/** The operation id of an eval call: `eval-<run id>-<example id>` (eval-job.ts). */
const EVAL_OPERATION_ID = /^eval-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** The operation id of a judge call: `judge-<pass id>-<pass item id>` (judge-job.ts); the capture is the pass item. */
const JUDGE_OPERATION_ID = /^judge-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** Where the output a judge call looked at came from: an eval run item (and its example), or a real question. */
type JudgeSource = { kind: 'real' } | { kind: 'eval'; exampleId: string };

const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});

/** Read-only reports for the admin (design §6.4, §12.1 #1, #16, #17). "Today" and every day key are Vietnam days. */
@Injectable()
export class ReportsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(ReadinessService) private readonly readiness: ReadinessService,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(CallLedger) private readonly ledger: CallLedger,
    @Inject(HeldOutReader) private readonly heldOut: HeldOutReader,
    @Inject(DashboardQualityService) private readonly quality: DashboardQualityService,
  ) {}

  async status(now: Date): Promise<StatusReport> {
    const since = zonedMidnight(AI_DAY_ZONE, localDate(AI_DAY_ZONE, now));
    const [settings, rows, checks, calls, [today], lastErrors] = await Promise.all([
      this.settings.get(),
      this.prisma.aiLiveConfig.findMany({ include: { config: { include: { model: true } } } }),
      Promise.all(AI_OPERATIONS.map((op) => this.readiness.check(op, 'learner', now))),
      this.ledger.countToday(now),
      this.prisma.$queryRaw<Array<{ failed_calls: number; failed_cost_usd: string; cost_usd: string; admin_cost_usd: string }>>`
        SELECT (count(*) FILTER (WHERE outcome <> 'succeeded'))::int AS failed_calls,
          coalesce(sum(cost_usd) FILTER (WHERE outcome <> 'succeeded'), 0)::numeric(20, 8)::text AS failed_cost_usd,
          coalesce(sum(cost_usd), 0)::numeric(20, 8)::text AS cost_usd,
          coalesce(sum(cost_usd) FILTER (WHERE purpose IN ('test', 'eval', 'judge')), 0)::numeric(20, 8)::text AS admin_cost_usd
        FROM ai_calls WHERE created_at >= ${since}`,
      // A reason that made no provider call (busy, in_progress, ai-disabled, …) has no ai_calls row, so it never shows here.
      this.prisma.$queryRaw<Array<{ operation: string; created_at: Date; outcome: CallOutcome; http_status: number | null; purpose: AiPurpose }>>`
        SELECT DISTINCT ON (operation) operation, created_at, outcome, http_status, purpose FROM ai_calls
        WHERE outcome <> 'succeeded' ORDER BY operation, created_at DESC, id DESC`,
    ]);
    const warnBefore = now.getTime() + MODEL_SHUTDOWN_WARNING_DAYS * DAY_MS;
    const operations = AI_OPERATIONS.map((operation, index) => {
      // What the operation runs now: the live config (a draft's model is not "used").
      const row = rows.find((item) => item.operation === operation)?.config;
      const model = row?.model ?? null;
      const selection = row && model ? toSelection(operation, row, model) : null;
      const check = checks[index];
      const error = lastErrors.find((item) => item.operation === operation);
      const warned = model !== null && (
        (model.shutdownAt !== null && model.shutdownAt.getTime() <= warnBefore)
        || model.lifecycle === 'deprecated' || model.lifecycle === 'retired');
      return {
        operation,
        ready: check.ready,
        reason: check.ready ? null : check.reason,
        model: selection ? { provider: selection.provider, model_id: selection.modelId } : null,
        effort: selection?.effort ?? null,
        thinking: selection?.thinking ?? null,
        max_output_tokens: selection?.maxOutputTokens ?? null,
        last_error: error ? { at: error.created_at.toISOString(), outcome: error.outcome, http_status: error.http_status, purpose: error.purpose } : null,
        model_warning: warned ? { shutdown_at: model.shutdownAt?.toISOString() ?? null, lifecycle: model.lifecycle } : null,
      };
    });
    const registered = new Set(this.registry.providers());
    return {
      operations,
      today: {
        calls, cap: settings.ai.dailyProviderCallsCap, failed_calls: today.failed_calls, failed_cost_usd: today.failed_cost_usd,
        cost_usd: today.cost_usd, cost_vnd: Math.round(Number(today.cost_usd) * settings.ai.usdVndRate),
        admin_cost_usd: today.admin_cost_usd, admin_usd_cap: settings.ai.adminDailyUsdCap,
      },
      ai_enabled: settings.entitlements.aiEnabled,
      providers: Object.fromEntries(AI_PROVIDERS.map((provider) => [provider, registered.has(provider)])) as Record<AiProviderName, boolean>,
    };
  }

  async costs(
    query: { from?: string; to?: string; group_by: CostGroup },
    now: Date,
  ): Promise<{ items: Array<CostTotals & { key: string }>; total: CostTotals }> {
    const today = localDate(AI_DAY_ZONE, now);
    const from = query.from ?? today;
    const to = query.to ?? today;
    if (from > to) throw invalid(['from: Must not be after to']);
    if (daysBetween(from, to) + 1 > COST_RANGE_MAX_DAYS) throw invalid([`to: The range must be at most ${COST_RANGE_MAX_DAYS} days`]);
    const start = zonedMidnight(AI_DAY_ZONE, from);
    const end = zonedMidnight(AI_DAY_ZONE, addDays(to, 1));
    const key = GROUP_KEYS[query.group_by];
    const [grouped, [total], settings] = await Promise.all([
      this.prisma.$queryRaw<Array<SumRow & { key: string }>>(Prisma.sql`
        SELECT ${key} AS key, ${SUMS} FROM ai_calls WHERE created_at >= ${start} AND created_at < ${end}
        GROUP BY 1 ORDER BY 1`),
      this.prisma.$queryRaw<SumRow[]>(Prisma.sql`SELECT ${SUMS} FROM ai_calls WHERE created_at >= ${start} AND created_at < ${end}`),
      this.settings.get(),
    ]);
    const rate = settings.ai.usdVndRate;
    return { items: grouped.map((row) => ({ key: row.key, ...totals(row, rate) })), total: totals(total, rate) };
  }

  /**
   * The AI dashboard (owner 28/10/2026, `ai.view`): only totals, never the content of a call. Health counts learner calls only;
   * cost counts every purpose, as the costs report does. Days with no call are listed as zero. The eval and judge blocks (nhóm B M5) are
   * read by `DashboardQualityService`; they do not depend on the range (the latest eval, the newest frozen set).
   */
  async dashboard(query: { from?: string; to?: string }, now: Date): Promise<DashboardReport> {
    const range = dayRange(query, AI_DAY_ZONE, now, DASHBOARD_DEFAULT_DAYS);
    const costsOf = (group_by: CostGroup) => this.costs({ from: range.from, to: range.to, group_by }, now);
    const learnerOnly = Prisma.sql`purpose = 'learner' AND created_at >= ${range.start} AND created_at < ${range.end}`;
    const [status, byDay, byOperation, byModel, byPurpose, health, outcomes, learnerDays, latestEvals, judgeScores, judgeRevisions] = await Promise.all([
      this.status(now), costsOf('day'), costsOf('operation'), costsOf('model'), costsOf('purpose'),
      this.prisma.$queryRaw<Array<{ operation: string; calls: number; failed: number; p50_ms: number; p95_ms: number }>>(Prisma.sql`
        SELECT operation, count(*)::int AS calls, (count(*) FILTER (WHERE outcome <> 'succeeded'))::int AS failed,
          round(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms))::int AS p50_ms,
          round(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms))::int AS p95_ms
        FROM ai_calls WHERE ${learnerOnly} GROUP BY 1 ORDER BY 1`),
      this.prisma.$queryRaw<Array<{ operation: string; outcome: string; calls: number }>>(Prisma.sql`
        SELECT operation, outcome, count(*)::int AS calls FROM ai_calls WHERE ${learnerOnly} GROUP BY 1, 2 ORDER BY 1, 2`),
      this.prisma.$queryRaw<Array<{ key: string; calls: number; failed: number }>>(Prisma.sql`
        SELECT ${GROUP_KEYS.day} AS key, count(*)::int AS calls, (count(*) FILTER (WHERE outcome <> 'succeeded'))::int AS failed
        FROM ai_calls WHERE ${learnerOnly} GROUP BY 1 ORDER BY 1`),
      this.quality.latestEvals(), this.quality.evalJudgeGroups(), this.quality.judgeRevisions(),
    ]);
    const costByDay = new Map(byDay.items.map((item) => [item.key, item]));
    const learnerByDay = new Map(learnerDays.map((row) => [row.key, row]));
    return {
      from: range.from,
      to: range.to,
      ai_enabled: status.ai_enabled,
      today: status.today,
      operations: status.operations.map(({ operation, ready, reason, model, last_error }) => ({ operation, ready, reason, model, last_error })),
      total: byDay.total,
      days: daysOf(range).map((date) => {
        const cost = costByDay.get(date);
        const learner = learnerByDay.get(date);
        return {
          date, calls: cost?.calls ?? 0, cost_usd: cost?.cost_usd ?? '0.00000000', cost_vnd: cost?.cost_vnd ?? 0,
          learner_calls: learner?.calls ?? 0, learner_failed: learner?.failed ?? 0,
        };
      }),
      by_operation: byOperation.items,
      by_model: byModel.items,
      by_purpose: byPurpose.items,
      learner_health: health.map((row) => ({
        ...row,
        outcomes: Object.fromEntries(outcomes.filter((item) => item.operation === row.operation).map((item) => [item.outcome, item.calls])),
      })),
      latest_evals: latestEvals,
      judge_scores: judgeScores,
      judge_revisions: judgeRevisions,
    };
  }

  /** The pass items of judge calls, with where each came from; an item that is gone is absent. */
  private async judgeSources(passItemIds: string[]): Promise<Map<string, JudgeSource>> {
    const sources = new Map<string, JudgeSource>();
    const ids = [...new Set(passItemIds)];
    if (ids.length === 0) return sources;
    const items = await this.prisma.aiJudgePassItem.findMany({ where: { id: { in: ids } }, select: { id: true, subjectKind: true, subjectId: true } });
    const runItemIds = items.filter((item) => item.subjectKind === 'eval_item').map((item) => item.subjectId);
    const runItems = runItemIds.length > 0 ? await this.prisma.aiEvalRunItem.findMany({ where: { id: { in: runItemIds } }, select: { id: true, exampleId: true } }) : [];
    const exampleOf = new Map(runItems.map((item) => [item.id, item.exampleId]));
    for (const item of items) {
      if (item.subjectKind === 'real_question') sources.set(item.id, { kind: 'real' });
      else {
        const exampleId = exampleOf.get(item.subjectId);
        if (exampleId !== undefined) sources.set(item.id, { kind: 'eval', exampleId });
      }
    }
    return sources;
  }

  /**
   * The request and response of the newest succeeded learner attempt of each operation id whose content is still kept (contract §4: what Practice
   * copied into an eval example, and what a real-question judge needs). An id with none is absent; nothing else about the call leaves here.
   */
  async callContents(operationIds: string[], now: Date): Promise<Map<string, { request: unknown; response: string | null }>> {
    const result = new Map<string, { request: unknown; response: string | null }>();
    const ids = [...new Set(operationIds)];
    if (ids.length === 0) return result;
    const calls = await this.prisma.aiCall.findMany({
      where: { operationId: { in: ids }, purpose: 'learner', outcome: 'succeeded' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, operationId: true },
    });
    if (calls.length === 0) return result;
    const contents = await this.prisma.aiCallContent.findMany({ where: { callId: { in: calls.map((call) => call.id) }, expiresAt: { gt: now } } });
    const byCall = new Map(contents.map((content) => [content.callId, content]));
    // Newest first: the first call of an id that still has its content is the answer.
    for (const call of calls) {
      const content = byCall.get(call.id);
      if (content && !result.has(call.operationId)) result.set(call.operationId, { request: content.request, response: content.response });
    }
    return result;
  }

  /** Every call of one operation id, oldest first, with its content while it is kept (design §12.1 #17). */
  async calls(operationId: string, now: Date) {
    const rows = await this.prisma.aiCall.findMany({ where: { operationId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    if (rows.length === 0) return { items: [] };
    const contents = await this.prisma.aiCallContent.findMany({
      where: { callId: { in: rows.map((row) => row.id) }, expiresAt: { gt: now } },
    });
    const byCall = new Map(contents.map((content) => [content.callId, content]));
    // An eval call of an example that is still held-out shows no content (design §5.1, R7); nor does a judge call that looked at its output.
    const evalExample = (row: { purpose: string; operationId: string }) => (row.purpose === 'eval' ? EVAL_OPERATION_ID.exec(row.operationId)?.[1] : undefined);
    const judgeItem = (row: { purpose: string; operationId: string }) => (row.purpose === 'judge' ? JUDGE_OPERATION_ID.exec(row.operationId)?.[1] : undefined);
    const sources = await this.judgeSources(rows.flatMap((row) => judgeItem(row) ?? []));
    const judgeExamples = [...new Set(rows.flatMap((row) => judgeItem(row) ?? []))].flatMap((item) => {
      const source = sources.get(item);
      return source?.kind === 'eval' ? [source.exampleId] : [];
    });
    const evalIds = [...rows.flatMap((row) => evalExample(row) ?? []), ...judgeExamples];
    const hidden = evalIds.length > 0 ? await this.heldOut.hiddenIds(evalIds) : new Set<string>();
    return {
      items: rows.map((row) => {
        const exampleId = evalExample(row);
        const item = judgeItem(row);
        const source = item === undefined ? undefined : sources.get(item);
        // A judge call whose output cannot be traced (its run was deleted, and the items with it) is hidden too: nothing says it was not held-out.
        const heldOut = (exampleId !== undefined && hidden.has(exampleId))
          || (item !== undefined && (source === undefined || (source.kind === 'eval' && hidden.has(source.exampleId))));
        const content = heldOut ? undefined : byCall.get(row.id);
        return {
          id: row.id, attempt: row.attempt, purpose: row.purpose, operation: row.operation, provider: row.provider, model: row.model,
          effort: row.effort, thinking: row.thinking, max_output_tokens: row.maxOutputTokens, prompt_revision: row.promptRevision,
          outcome: row.outcome, http_status: row.httpStatus, provider_error_code: row.providerErrorCode, latency_ms: row.latencyMs,
          input_tokens: row.inputTokens, cached_input_tokens: row.cachedInputTokens, output_tokens: row.outputTokens,
          reasoning_tokens: row.reasoningTokens, cost_usd: row.costUsd === null ? null : row.costUsd.toFixed(8), cost_known: row.costKnown,
          created_at: row.createdAt.toISOString(), held_out: heldOut,
          content: content
            ? { request: content.request, response: content.response, expires_at: content.expiresAt.toISOString() }
            : null,
        };
      }),
    };
  }
}

function totals(row: SumRow, rate: number): CostTotals {
  return {
    calls: row.calls,
    input_tokens: Number(row.input_tokens),
    cached_input_tokens: Number(row.cached_input_tokens),
    output_tokens: Number(row.output_tokens),
    reasoning_tokens: Number(row.reasoning_tokens),
    cost_usd: row.cost_usd,
    cost_vnd: Math.round(Number(row.cost_usd) * rate),
    unknown_cost_calls: row.unknown_cost_calls,
  };
}
