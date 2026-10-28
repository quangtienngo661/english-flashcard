/** The admin AI usage of one Vietnam day (design §12.2 row 6). */
export type AiUsageView = {
  date: string; used: number; confirmed: number; reserved: number; cap: number; alert_percent: number | null;
  alert_reached: boolean; enabled: boolean;
};

/** Days shown when the AI dashboard is opened without a range. */
export const AI_USAGE_DEFAULT_DAYS = 30;

/** AI units per cap day for the AI dashboard; `refunds` = units given back in the range. */
export type AiUsageDaysView = {
  from: string; to: string; today: AiUsageView;
  days: Array<{ date: string; ai_practice: number; ai_lookup: number; total: number; learners: number }>;
  refunds: number; days_at_cap: number;
};

/** D36: the admin screen turns yellow once `used ≥ ceil(cap × percent / 100)`; no alert without a percent or with a cap of 0. */
export function alertReached(used: number, cap: number, percent: number | null): boolean {
  return percent !== null && cap > 0 && used >= Math.ceil((cap * percent) / 100);
}
