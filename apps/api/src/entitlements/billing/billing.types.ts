import type { BillingEnvironment, Interval, SubscriptionStatus } from '../entitlements.types.js';

/** The normalized provider events (design §9.3). D35: no `payment_succeeded`. */
export const EVENT_TYPES = [
  'subscription_started',
  'renewed',
  'renewal_failed',
  'grace_ended',
  'cancel_scheduled',
  'cancel_unscheduled',
  'expired',
  'revoked',
  'refunded',
  'refund_reversed',
  'plan_changed',
  'plan_change_scheduled',
  'plan_change_canceled',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Additive events always apply and are deduplicated by transaction id; the others are ordered by `occurred_at` (R1). */
export const ADDITIVE_TYPES = ['renewed', 'refunded'] as const;

export function eventKind(type: EventType): 'state' | 'additive' {
  return (ADDITIVE_TYPES as readonly EventType[]).includes(type) ? 'additive' : 'state';
}

type EventBase = {
  provider: string;
  environment: BillingEnvironment;
  externalEventId: string;
  externalSubscriptionId: string;
  appUserId: string | null;
  occurredAt: Date;
};

type Period = { interval: Interval; currentPeriodStart: Date; currentPeriodEnd: Date };

/**
 * One event with the §9.3 fields of its type. D37: every charge carries its transaction id — `renewed`, `plan_changed` and a
 * `subscription_started` without a trial; a trial start charges nothing, so its id may be absent.
 */
export type NormalizedEvent = EventBase &
  (
    | ({ type: 'subscription_started'; paymentFingerprint: string | null } & Period &
        ({ trialEndsAt: Date; transactionId: string | null } | { trialEndsAt: null; transactionId: string }))
    | ({ type: 'renewed'; transactionId: string } & Period)
    | { type: 'renewal_failed'; graceEndsAt: Date | null }
    | { type: 'refunded'; transactionId: string; amount: number | null }
    | { type: 'refund_reversed'; transactionId: string }
    | ({ type: 'plan_changed'; transactionId: string } & Period)
    | { type: 'plan_change_scheduled'; interval: Interval }
    | { type: 'grace_ended' }
    | { type: 'cancel_scheduled' }
    | { type: 'cancel_unscheduled' }
    | { type: 'expired' }
    | { type: 'revoked' }
    | { type: 'plan_change_canceled' }
  );

/** The `subscriptions` columns the state machine reads and writes; ids, `last_event_at` and timestamps stay with the caller. */
export type SubscriptionState = {
  status: SubscriptionStatus;
  interval: Interval;
  trialEndsAt: Date | null;
  trialDenied: boolean;
  paymentFingerprint: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  graceEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  pendingInterval: Interval | null;
  quotaAnchorAt: Date | null;
  currentTransactionId: string | null;
};

/** The provider's own view of a subscription (`fetchState`, design §9.2). */
export type FetchedState = {
  status: SubscriptionStatus;
  interval: Interval;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
};

const DATE_FIELDS = ['occurredAt', 'currentPeriodStart', 'currentPeriodEnd', 'trialEndsAt', 'graceEndsAt'] as const;

/** A normalized event stored as JSON (`billing_events.payload`, the fake's history) comes back with its dates revived. */
export function eventFromJson(json: unknown): NormalizedEvent {
  const event = { ...(json as Record<string, unknown>) };
  for (const field of DATE_FIELDS) {
    if (typeof event[field] === 'string') event[field] = new Date(event[field]);
  }
  return event as NormalizedEvent;
}
