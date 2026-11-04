import type { SubscriptionStatus } from '../entitlements.types.js';
import { effectiveStatus, type GrantSource, type SubscriptionSource } from './plan-rules.js';

// When did a source that gave the learner their own AI cycle stop doing so (launch prep A, design 6.3). A Free account's window
// starts after the latest such end inside the calendar month, so uses made while Pro are not charged to the Free allowance.
// Pure functions: the loader provides the rows, `nextEndedAt` is the single rule for the `subscriptions.ended_at` column.

const DAY_MS = 86_400_000;

export type AiSourceEnd = { kind: 'subscription' | 'grant_plan' | 'grant_limits' | 'prepaid_period'; id: string; endedAt: Date };

/** The sources of the learner that are no longer live (expired or revoked subscriptions, revoked or ended grants) and were loaded for this. */
export type EndedSources = { subscriptions: SubscriptionSource[]; grants: GrantSource[] };

/** The fields of a stored subscription `nextEndedAt` needs. */
export type EndedAtFields = {
  status: SubscriptionStatus;
  endedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  graceEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
};

const earlier = (a: Date, b: Date) => (a < b ? a : b);

/**
 * The moment the stored `trialing` / `active` / `grace` row stops being Pro or trial by the time rules of `effectiveStatus`
 * (plan-rules.ts): its end when cancelled at period end, else the end + grace days, and for `grace` its grace end. `null`
 * when the row has no date to say it.
 */
function endByTimeRules(row: EndedAtFields, graceDays: number): Date | null {
  if (row.status === 'grace') {
    return row.graceEndsAt ?? (row.currentPeriodEnd ? new Date(row.currentPeriodEnd.getTime() + graceDays * DAY_MS) : null);
  }
  const end = row.status === 'trialing' ? row.trialEndsAt ?? row.currentPeriodEnd : row.currentPeriodEnd;
  if (!end) return null;
  return row.cancelAtPeriodEnd ? end : new Date(end.getTime() + graceDays * DAY_MS);
}

/**
 * The value of `subscriptions.ended_at` after a write that sets the status to `afterStatus` at `at` (design 6.3.3): `null` while
 * the row is, or is again, Pro or trial; the earlier of `at` and the moment the time rules ended it when it just stopped; the
 * old value when it only moves between ended states.
 */
export function nextEndedAt(before: EndedAtFields, afterStatus: SubscriptionStatus, at: Date, graceDays: number): Date | null {
  if (afterStatus === 'trialing' || afterStatus === 'active' || afterStatus === 'grace') return null;
  if (before.status === 'trialing' || before.status === 'active' || before.status === 'grace') {
    const byRules = endByTimeRules(before, graceDays);
    return byRules === null ? at : earlier(at, byRules);
  }
  return before.endedAt;
}

function subscriptionEnd(sub: SubscriptionSource, now: Date, graceDays: number): Date | null {
  if (sub.status === 'on_hold' || sub.status === 'expired' || sub.status === 'revoked') {
    const endedAt = sub.endedAt ?? null;
    if (endedAt === null) return null;
    // A trial that was denied (D30) never gave a cycle: it ended on its own, before any payment could follow it.
    if (sub.trialDenied && sub.trialEndsAt !== null && endedAt <= sub.trialEndsAt) return null;
    return endedAt;
  }
  if (sub.status === 'trialing' && sub.trialDenied) return null;
  const { status } = effectiveStatus(sub, now, graceDays);
  if (status !== 'expired' && status !== 'on_hold') return null;
  return endByTimeRules({ ...sub, endedAt: sub.endedAt ?? null }, graceDays);
}

function hasAiLimit(grant: GrantSource): boolean {
  return (grant.limits?.ai_practice_per_cycle ?? 0) > 0 || (grant.limits?.ai_lookup_per_cycle ?? 0) > 0;
}

function grantEnd(grant: GrantSource): Date | null {
  const endedAt = grant.revokedAt === null ? grant.endsAt : earlier(grant.endsAt, grant.revokedAt);
  // Revoked before it started: it never gave a cycle (LA3E16).
  return grant.startsAt < endedAt ? endedAt : null;
}

/** Every AI source of the learner that has ended by `now`, with the moment it ended. */
export function aiSourceEnds(input: {
  subscriptions: SubscriptionSource[]; grants: GrantSource[]; ended: EndedSources; graceDays: number; now: Date;
}): AiSourceEnd[] {
  const { now, graceDays } = input;
  const result: AiSourceEnd[] = [];
  for (const sub of [...input.subscriptions, ...input.ended.subscriptions]) {
    const endedAt = subscriptionEnd(sub, now, graceDays);
    if (endedAt !== null && endedAt <= now) result.push({ kind: 'subscription', id: sub.id, endedAt });
  }
  for (const grant of [...input.grants, ...input.ended.grants]) {
    if (grant.kind === 'limits' && !hasAiLimit(grant)) continue;
    const endedAt = grantEnd(grant);
    if (endedAt !== null && endedAt <= now) result.push({ kind: grant.kind === 'plan' ? 'grant_plan' : 'grant_limits', id: grant.id, endedAt });
  }
  return result;
}

/** The latest end inside `[since, now]`, or `null`. */
export function lastAiSourceEnd(ends: AiSourceEnd[], since: Date, now: Date): Date | null {
  let latest: Date | null = null;
  for (const { endedAt } of ends) {
    if (endedAt < since || endedAt > now) continue;
    if (latest === null || endedAt > latest) latest = endedAt;
  }
  return latest;
}
