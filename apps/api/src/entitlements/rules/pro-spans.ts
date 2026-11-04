import type { ProSpan } from '../orders/period-window.js';
import type { GrantSource, PrepaidSource } from './plan-rules.js';

/**
 * The spans of time that count as Pro for the end of a run of Pro (`continuousProUntil`): every plan grant, started or not, and every
 * prepaid period, started or not. A limits grant is not Pro. Subscriptions are left out: no real provider renews one yet (design §3.7).
 */
export function proSpans(grants: GrantSource[], prepaidPeriods: PrepaidSource[]): ProSpan[] {
  return [
    ...grants.filter((grant) => grant.kind === 'plan').map((grant) => ({ startsAt: grant.startsAt, endsAt: grant.endsAt, revokedAt: grant.revokedAt })),
    ...prepaidPeriods.map((period) => ({ startsAt: period.startsAt, endsAt: period.endsAt, revokedAt: period.revokedAt })),
  ];
}
