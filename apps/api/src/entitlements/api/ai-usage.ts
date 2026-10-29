import type { ProUsageSpread } from '../rules/pro-usage.js';

/** The admin AI usage of one Vietnam day (design §12.2 row 6). */
export type AiUsageView = {
  date: string; used: number; confirmed: number; reserved: number; cap: number; alert_percent: number | null;
  alert_reached: boolean; enabled: boolean;
};

/** Days shown when the AI dashboard is opened without a range. */
export const AI_USAGE_DEFAULT_DAYS = 30;

/**
 * AI units per cap day for the AI dashboard; `refunds` = units given back in the range. `cap` is the day's own cap (the value at the end of that
 * day, nhóm B B44), `at_cap` = `total >= cap`, and `days_at_cap` counts the days with `at_cap`.
 */
export type AiUsageDaysView = {
  from: string; to: string; today: AiUsageView;
  days: Array<{ date: string; ai_practice: number; ai_lookup: number; total: number; learners: number; cap: number; at_cap: boolean }>;
  refunds: number; days_at_cap: number;
};

/** The most Pro learners one read resolves; beyond it the view says `truncated` (the spread then describes the first ones by user id). */
export const AI_USAGE_PRO_LEARNER_CAP = 5000;

/**
 * Where the learners who have the Pro plan now stand against their AI limit in their current cycle (the AI dashboard). Counts of
 * learners only: `buckets` are the largest share of the two pools used (0 %, 1–49 %, 50–79 %, 80–99 %, 100 % or more), and
 * `no_limit` Pro learners have no AI limit above 0, so they are in `pro_learners` but in no bucket.
 */
export type AiUsageProView = ProUsageSpread & { truncated: boolean };

/** D36: the admin screen turns yellow once `used ≥ ceil(cap × percent / 100)`; no alert without a percent or with a cap of 0. */
export function alertReached(used: number, cap: number, percent: number | null): boolean {
  return percent !== null && cap > 0 && used >= Math.ceil((cap * percent) / 100);
}
