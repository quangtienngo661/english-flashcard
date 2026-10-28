import type { ApiClient } from '../../api/client';
import type { AiOperation, AiStatus, CostTotals } from '../ai/ai-api';

/** `GET /v1/admin/ai/dashboard` (`ai.view`): health counts learner calls only; cost counts every purpose. */
export type AiDashboard = {
  from: string;
  to: string;
  ai_enabled: boolean;
  today: AiStatus['today'];
  operations: Array<Pick<AiStatus['operations'][number], 'operation' | 'ready' | 'reason' | 'model' | 'last_error'>>;
  total: CostTotals;
  days: Array<{ date: string; calls: number; cost_usd: string; cost_vnd: number; learner_calls: number; learner_failed: number }>;
  by_operation: Array<CostTotals & { key: string }>;
  by_model: Array<CostTotals & { key: string }>;
  by_purpose: Array<CostTotals & { key: string }>;
  learner_health: Array<{ operation: AiOperation; calls: number; failed: number; p50_ms: number; p95_ms: number; outcomes: Record<string, number> }>;
};

/** `GET /v1/admin/practice/ai-quality` (`ai.view`): questions asked, AI requests, reports; totals only. */
export type AiQuality = {
  from: string;
  to: string;
  questions: Array<{ source: string; type: string; asked: number; answered: number; correct: number; skipped: number; hinted: number }>;
  ai_requests: Array<{ type: string; state: string; failure: string | null; count: number }>;
  ai_sessions: Array<{ stopped: string | null; count: number }>;
  reports: Array<{ source: string; total: number; open: number; no_error: number; fixed: number; refunded: number }>;
  ai_report_reasons: Array<{ reason: string; label_vi: string; label_en: string; count: number }>;
  unknown_forms: { new_forms: number; rejected_seen: number };
  word_checks: Array<{ verdict: string; count: number }>;
  /** Per AI question type: valid first answers, and how many of them the rules rejected so the AI was asked again. */
  ai_second_tries: Array<{ type: string; first_answers: number; second_tries: number }>;
};

/** `GET /v1/admin/entitlements/ai-usage/days` (`ai.view`): AI units per cap day against today's cap. */
export type AiUsageDays = {
  from: string;
  to: string;
  today: { date: string; used: number; cap: number; alert_percent: number | null; alert_reached: boolean; enabled: boolean };
  days: Array<{ date: string; ai_practice: number; ai_lookup: number; total: number; learners: number }>;
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
