import type { Entitlements } from '@/app-shell/queries';

/**
 * The last moment of Pro (M7.2): 1 ms before `pro_until`, else before a staff grant's `ends_at`, else before a subscription's
 * `renews_at ?? ends_at`; `null` when none exists. Ends are exclusive midnights, so end − 1 ms is the last day (DB35).
 */
export function proLastDay(entitlements: Entitlements): string | null {
  const grant = entitlements.sources.find((s) => s.kind === 'grant_plan' && s.ends_at);
  const subscription = entitlements.sources.find((s) => s.kind === 'subscription' && (s.renews_at ?? s.ends_at));
  const end = entitlements.pro_until ?? grant?.ends_at ?? subscription?.renews_at ?? subscription?.ends_at ?? null;
  return end === null ? null : new Date(new Date(end).getTime() - 1).toISOString();
}
