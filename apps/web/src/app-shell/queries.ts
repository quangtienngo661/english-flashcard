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
    kind: 'subscription' | 'grant_plan' | 'grant_limits';
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
};

/** `GET /v1/me/app-config` (design §8.7, Task 7): the admin-editable numbers the screens show. */
export type AppConfig = {
  practice: { max_questions_per_session: number; default_questions_per_session: number };
  reminders: { send_time: string };
  learning: { backlog_after_days: number; groups_per_user: number };
  plans: {
    free: { practice_sessions_per_day: number };
    trial: { ai_practice_per_cycle: number; ai_lookup_per_cycle: number };
    pro: { practice_sessions_per_day: number; ai_practice_per_cycle: number; ai_lookup_per_cycle: number };
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
