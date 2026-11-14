import type { SubscriptionStatus } from '../entitlements.types.js';

const RENEWING: ReadonlySet<SubscriptionStatus> = new Set(['trialing', 'active', 'grace', 'on_hold']);

/**
 * "Auto-renewing" (Bước 8 D11, D28): the provider will charge again unless the learner cancels. `grace` and `on_hold` count,
 * because the provider still retries the charge. One function for the delete check, the "Hủy gói" button and `POST …/cancel`.
 */
export function isAutoRenewing(sub: { status: SubscriptionStatus; cancelAtPeriodEnd: boolean }): boolean {
  return RENEWING.has(sub.status) && !sub.cancelAtPeriodEnd;
}
