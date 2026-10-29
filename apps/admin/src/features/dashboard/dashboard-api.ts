import type { ApiClient } from '../../api/client';
import type { AiOperation, AiStatus, CostTotals } from '../ai/ai-api';

/** How many judge scores got each verdict; a score with no verdict ("không chấm được") is `unscored`. */
export type VerdictCounts = { pass: number; fail_major: number; fail_minor: number; unscored: number };

/** The API's `SplitStats` of one half (dev or held-out) of an eval run: counts only. */
export type SplitStats = {
  total: number;
  pending: number;
  skipped: number;
  shape_pass: number;
  shape_fail: number;
  shape_transient: number;
  rule_pass: number;
  rule_fail: number;
  rule_skipped: number;
  rule_not_applicable: number;
  expected_pass: number;
  expected_fail: number;
  expected_none: number;
  failing: number;
};

/**
 * The latest complete eval of an operation's live config on the newest frozen set (design §8.2). `run` is null when there is none (or no
 * frozen set, or no live config). Totals only: no example, item or output; held-out judge results are counts.
 */
export type LatestEval = {
  operation: AiOperation;
  set: { id: string; version: number } | null;
  live: { config_id: string; number: number; model: string | null } | null;
  run: null | {
    id: string;
    created_at: string;
    model: string;
    stats: { dev: SplitStats; held_out: SplitStats };
    judge: Array<{ judge_revision_id: string; criterion: string; dev: VerdictCounts; held_out: VerdictCounts }>;
  };
};

/**
 * One judge revision's scores of one operation and criterion, for one (config number, model) pair and one source (R12: never by number
 * alone). A real question whose `ai_meta` did not say has a null `config_number` / `model`. `first_scored_at` places it on the time axis.
 */
export type JudgeScoreGroup = {
  operation: AiOperation;
  source: 'eval' | 'real';
  config_number: number | null;
  model: string | null;
  judge_revision_id: string;
  criterion: string;
  counts: VerdictCounts;
  first_scored_at: string;
};

/** A saved judge revision that has scored something, with how well each criterion agrees with the owner's labels ("đã / chưa hiệu chỉnh"). */
export type DashboardJudgeRevision = {
  id: string;
  judge_id: string;
  judge_name: string;
  revision: number;
  saved_at: string;
  criteria: Array<{ code: string; labeled: number; agree: number; calibrated: boolean }>;
};

/** The latest finished real-question pass of one operation: one row per judge revision and criterion of that pass. */
export type RealJudgeLatest = {
  operation: AiOperation;
  pass_id: string;
  judge_revision_id: string;
  criterion: string;
  counts: VerdictCounts;
  scored_at: string;
};

/** `GET /v1/admin/ai/dashboard` (`ai.view`): health counts learner calls only; cost counts every purpose. */
export type AiDashboard = {
  from: string;
  to: string;
  ai_enabled: boolean;
  /**
   * `calls` counts learner calls (what the daily cap limits); `admin_cost_usd` / `admin_usd_cap` are what test, eval and judge calls cost
   * today and their cap (nhóm B M3-T5). ASSUMPTION: `features/ai/ai-api.ts` gets the same two fields in M3; the intersection then adds nothing.
   */
  today: AiStatus['today'] & { admin_cost_usd: string; admin_usd_cap: number | null };
  operations: Array<Pick<AiStatus['operations'][number], 'operation' | 'ready' | 'reason' | 'model' | 'last_error'>>;
  total: CostTotals;
  days: Array<{ date: string; calls: number; cost_usd: string; cost_vnd: number; learner_calls: number; learner_failed: number }>;
  by_operation: Array<CostTotals & { key: string }>;
  by_model: Array<CostTotals & { key: string }>;
  by_purpose: Array<CostTotals & { key: string }>;
  learner_health: Array<{ operation: AiOperation; calls: number; failed: number; p50_ms: number; p95_ms: number; outcomes: Record<string, number> }>;
  /** One entry per operation, in the API's operation order. Not range-dependent. */
  latest_evals: LatestEval[];
  /** Eval judge scores on each operation's newest frozen set, ordered by `first_scored_at`, then config number. Not range-dependent. */
  judge_scores: JudgeScoreGroup[];
  /** Only revisions with at least one score, ordered by judge name, then revision. */
  judge_revisions: DashboardJudgeRevision[];
};

/** `GET /v1/admin/practice/ai-quality` (`ai.view`): questions asked, AI requests, reports; totals only. */
export type AiQuality = {
  from: string;
  to: string;
  questions: Array<{ source: string; type: string; asked: number; answered: number; correct: number; skipped: number; hinted: number }>;
  ai_requests: Array<{ type: string; state: string; failure: string | null; count: number }>;
  ai_sessions: Array<{ stopped: string | null; count: number }>;
  reports: Array<{ source: string; total: number; open: number; no_error: number; fixed: number; confirmed: number; refunded: number }>;
  ai_report_reasons: Array<{ reason: string; label_vi: string; label_en: string; count: number }>;
  unknown_forms: { new_forms: number; rejected_seen: number };
  word_checks: Array<{ verdict: string; count: number }>;
  /** Per AI question type: valid first answers, and how many of them the rules rejected so the AI was asked again. */
  ai_second_tries: Array<{ type: string; first_answers: number; second_tries: number }>;
  /** Judge scores of real AI questions made in the range, grouped like `AiDashboard['judge_scores']`; the pair can be null. */
  real_judge_scores: JudgeScoreGroup[];
  /** The latest finished real pass of each operation in the range, one row per criterion; no row for an operation without a finished pass. */
  real_judge_latest: RealJudgeLatest[];
};

/** `GET /v1/admin/entitlements/ai-usage/days` (`ai.view`): AI units per cap day; each day against the cap in force at the end of that day. */
export type AiUsageDays = {
  from: string;
  to: string;
  today: { date: string; used: number; cap: number; alert_percent: number | null; alert_reached: boolean; enabled: boolean };
  days: Array<{ date: string; ai_practice: number; ai_lookup: number; total: number; learners: number; cap: number; at_cap: boolean }>;
  refunds: number;
  days_at_cap: number;
};

/**
 * `GET /v1/admin/entitlements/ai-usage/pro` (`ai.view`): Pro learners by the larger share of their two AI pools used in their
 * current cycle, as counts only. It does not depend on the selected range. `no_limit` Pro learners are in `pro_learners` but in no bucket.
 */
export type AiUsagePro = {
  pro_learners: number;
  no_limit: number;
  truncated: boolean;
  buckets: Array<{ key: '0' | '1-49' | '50-79' | '80-99' | '100'; learners: number }>;
};

export const dashboardKeys = {
  ai: (from: string, to: string) => ['dashboard', 'ai', from, to] as const,
  quality: (from: string, to: string) => ['dashboard', 'quality', from, to] as const,
  usage: (from: string, to: string) => ['dashboard', 'usage', from, to] as const,
  usagePro: () => ['dashboard', 'usage-pro'] as const,
};

const range = (from: string, to: string) => new URLSearchParams({ from, to }).toString();

export const getAiDashboard = (api: ApiClient, from: string, to: string) => api.get<AiDashboard>(`/v1/admin/ai/dashboard?${range(from, to)}`);
export const getAiQuality = (api: ApiClient, from: string, to: string) => api.get<AiQuality>(`/v1/admin/practice/ai-quality?${range(from, to)}`);
export const getAiUsageDays = (api: ApiClient, from: string, to: string) =>
  api.get<AiUsageDays>(`/v1/admin/entitlements/ai-usage/days?${range(from, to)}`);

export const getAiUsagePro = (api: ApiClient) => api.get<AiUsagePro>('/v1/admin/entitlements/ai-usage/pro');

/** `count / total` as a share, or null when nothing was counted (shown as "—", never as 0 %). */
export const share = (count: number, total: number): number | null => (total > 0 ? count / total : null);
