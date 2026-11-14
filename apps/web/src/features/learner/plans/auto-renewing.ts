import type { Entitlements } from '@/app-shell/queries';

type Source = Entitlements['sources'][number];

/**
 * "Auto-renewing" (Bước 8 D11, D28), the same rule as the API's `isAutoRenewing`: a subscription that the provider will charge again
 * unless the learner cancels. `grace` and `on_hold` count (the provider still retries the charge). `status` here is the effective one.
 */
export function isAutoRenewing(source: Pick<Source, 'kind' | 'status' | 'cancel_at_period_end'>): boolean {
  return source.kind === 'subscription'
    && ['trialing', 'active', 'grace', 'on_hold'].includes(source.status ?? '')
    && source.cancel_at_period_end === false;
}

export const subscriptionsOf = (sources: Source[]): Source[] => sources.filter((source) => source.kind === 'subscription');
