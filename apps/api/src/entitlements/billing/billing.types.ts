import type { BillingEnvironment, Interval, SubscriptionStatus } from '../entitlements.types.js';

/** The normalized events of an auto-renewing subscription (design §9.3). D35: none of them is a one-time payment; those are `ORDER_EVENT_TYPES`. */
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

/**
 * One-time payments (launch prep B design §3.3): outside `EVENT_TYPES`, so the 13 types, the 91-cell transition matrix and the
 * fake provider's parser stay as they were. The applier hands these to `OrderApplier`, never to the subscription machine.
 */
export const ORDER_EVENT_TYPES = ['payment_succeeded'] as const;
export type OrderEventType = (typeof ORDER_EVENT_TYPES)[number];

/**
 * `billing_events.payload` of a `payment_succeeded` (design §3.12). `payer` is there only until the applier has used it:
 * it copies the three fields to the order only for money that arrives after the account was deleted, and clears them
 * from the event in the same transaction.
 */
export type OrderPaymentPayload = {
  orderCode: number;
  paymentLinkId: string;
  amount: number;
  reference: string;
  /** As payOS wrote it, no time zone (ASSUMPTION P9: Vietnam time); null when absent. */
  transactionDateTime: string | null;
  source: 'webhook' | 'reconcile';
  /** What payOS said; the applier refuses `success !== true` or `code !== '00'` (design §3.4). */
  success: boolean;
  code: string;
  payer: { counterAccountName: string | null; counterAccountNumber: string | null; counterAccountBankName: string | null };
};

/** Additive events always apply and are deduplicated by transaction id; the others are ordered by `occurred_at` (R1). */
export const ADDITIVE_TYPES = ['renewed', 'refunded', 'payment_succeeded'] as const;

export function eventKind(type: EventType | OrderEventType): 'state' | 'additive' {
  return (ADDITIVE_TYPES as readonly string[]).includes(type) ? 'additive' : 'state';
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

/** What a charge cost, when the provider says (learner UI design §8.9): major units and an ISO 4217 code, else null. */
type Money = { amount: number | null; currency: string | null };

/**
 * One event with the §9.3 fields of its type. D37: every charge carries its transaction id — `renewed`, `plan_changed` and a
 * `subscription_started` without a trial; a trial start charges nothing, so its id may be absent.
 */
export type NormalizedEvent = EventBase &
  (
    | ({ type: 'subscription_started'; paymentFingerprint: string | null } & Period & Money &
        ({ trialEndsAt: Date; transactionId: string | null } | { trialEndsAt: null; transactionId: string }))
    | ({ type: 'renewed'; transactionId: string } & Period & Money)
    | { type: 'renewal_failed'; graceEndsAt: Date | null }
    | ({ type: 'refunded'; transactionId: string } & Money)
    | { type: 'refund_reversed'; transactionId: string }
    | ({ type: 'plan_changed'; transactionId: string } & Period & Money)
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
