import type { ApiClient } from '../../api/client';

/** One registration week (Monday–Sunday, Vietnam time); `d7` / `d30` count the members still "đang học" on day +7 / +30, `null` while unknown. */
export type RetentionCohort = { week_start: string; size: number; d7: number | null; d30: number | null };

/**
 * `GET /v1/admin/learning/retention` (`ai.view`; API nhóm B M6): counts only. `from` is the Monday of the first week listed, so it can be
 * earlier than the `from` that was asked for. `window_days` is the setting that decides who is "đang học", for today's numbers and for D7 / D30.
 */
export type Retention = {
  from: string;
  to: string;
  window_days: number;
  today: { date: string; active: number; stopped: number };
  cohorts: RetentionCohort[];
};

export const retentionKey = (from: string, to: string) => ['dashboard', 'retention', from, to] as const;

export const getRetention = (api: ApiClient, from: string, to: string) =>
  api.get<Retention>(`/v1/admin/learning/retention?${new URLSearchParams({ from, to }).toString()}`);
