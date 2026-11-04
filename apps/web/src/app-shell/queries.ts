'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from './session/session-context';

export type Plan = 'free' | 'trial' | 'pro';
export type PoolName = 'practice_sessions' | 'ai_practice' | 'ai_lookup';
export type Pool = { limit: number; used: number; remaining: number; resets_at: string | null };

/** `GET /v1/me/entitlements` (Bước 5 §9; `starts_at` from Task 7). */
export type Entitlements = {
  plan: Plan;
  sources: Array<{
    kind: 'subscription' | 'grant_plan' | 'grant_limits' | 'prepaid';
    id: string;
    status: string | null;
    starts_at: string | null;
    ends_at: string | null;
    renews_at: string | null;
    cancel_at_period_end: boolean | null;
    pending_interval: 'month' | 'year' | null;
  }>;
  pools: Record<PoolName, Pool>;
  features: Record<'ai.practice' | 'ai.lookup', { allowed: boolean; reason: 'plan-required' | null }>;
  ai_available: { enabled: boolean; cap_reached: boolean };
  trial_eligible: boolean;
  /** Launch prep B: paid periods that have not started yet; optional like `account` until the plans page (M2) is the one reader. */
  upcoming_periods?: Array<{ id: string; starts_at: string; ends_at: string }>;
  /** Where the unbroken Pro that covers now ends; null when the learner is not Pro through a grant or a prepaid period. */
  pro_until?: string | null;
};

/** `GET /v1/me/app-config` (design §8.7, Task 7): the admin-editable numbers the screens show. */
export type AppConfig = {
  practice: { max_questions_per_session: number; default_questions_per_session: number };
  reminders: { send_time: string };
  learning: { backlog_after_days: number; groups_per_user: number };
  /** Bước 8: how long payment records are kept after an account is deleted. */
  account?: { transaction_retention_years: number };
  plans: {
    free: { practice_sessions_per_day: number; ai_practice_per_cycle: number; ai_lookup_per_cycle: number };
    trial: { ai_practice_per_cycle: number; ai_lookup_per_cycle: number };
    pro: {
      practice_sessions_per_day: number; ai_practice_per_cycle: number; ai_lookup_per_cycle: number;
      /** Launch prep B: dong per prepaid period of 1, 3 and 12 months. Optional like `account`: the plans page (M2) is the only reader. */
      prices?: { '1': number; '3': number; '12': number };
    };
  };
};

export const ENTITLEMENTS_KEY = ['me', 'entitlements'] as const;
export const APP_CONFIG_KEY = ['me', 'app-config'] as const;

export function useEntitlements() {
  const api = useApi();
  return useQuery({ queryKey: ENTITLEMENTS_KEY, queryFn: () => api.get<Entitlements>('/v1/me/entitlements') });
}

export function useAppConfig() {
  const api = useApi();
  return useQuery({ queryKey: APP_CONFIG_KEY, queryFn: () => api.get<AppConfig>('/v1/me/app-config') });
}
