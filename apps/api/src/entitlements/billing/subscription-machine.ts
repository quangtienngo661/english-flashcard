// The subscription state machine (design §9.4, R3): one cell per event type × current status, 91 in all (D35).
import type { SubscriptionStatus } from '../entitlements.types.js';
import type { EventType, FetchedState, NormalizedEvent, SubscriptionState } from './billing.types.js';

type Ctx = { now: Date; graceDays: number; trialAllowed: boolean };

export type ApplyResult = {
  next: SubscriptionState | null;
  outcome: 'changed' | 'recorded';
  anchorReset: boolean;
  log: string | null;
};

const DAY_MS = 86_400_000;

/** "Ghi": the event is stored, the state stays, the applier logs it. */
const RECORD = 'record';
/** "Giữ": the state already says what the event says. */
const KEEP = 'keep';

type Event<T extends EventType> = Extract<NormalizedEvent, { type: T }>;
type Row<E> = {
  none: typeof RECORD | ((event: E, ctx: Ctx) => ApplyResult);
} & Record<SubscriptionStatus, typeof RECORD | typeof KEEP | ((state: SubscriptionState, event: E, ctx: Ctx) => ApplyResult)>;

const changed = (next: SubscriptionState, anchorReset = false, log: string | null = null): ApplyResult => ({
  next,
  outcome: 'changed',
  anchorReset,
  log,
});

const recorded = (state: SubscriptionState | null, log: string | null): ApplyResult => ({
  next: state,
  outcome: 'recorded',
  anchorReset: false,
  log,
});

const set =
  (patch: Partial<SubscriptionState>) =>
  (state: SubscriptionState): ApplyResult =>
    changed({ ...state, ...patch });

/** A new row, or a reactivation from `expired`/`revoked`: anchor = start; a trial is checked against D30 by the caller. */
function started(state: SubscriptionState | null, event: Event<'subscription_started'>, ctx: Ctx): ApplyResult {
  const trial = event.trialEndsAt !== null;
  return changed(
    {
      status: trial ? 'trialing' : 'active',
      interval: event.interval,
      trialEndsAt: event.trialEndsAt,
      trialDenied: trial ? !ctx.trialAllowed : (state?.trialDenied ?? false),
      paymentFingerprint: event.paymentFingerprint ?? state?.paymentFingerprint ?? null,
      currentPeriodStart: event.currentPeriodStart,
      currentPeriodEnd: event.currentPeriodEnd,
      graceEndsAt: null,
      cancelAtPeriodEnd: false,
      pendingInterval: null,
      quotaAnchorAt: event.occurredAt,
      // D37: a start without a trial is a charge; a trial charges nothing yet, so an older period's id is dropped.
      currentTransactionId: trial ? null : event.transactionId,
    },
    true,
  );
}

/**
 * `renewed` is additive: never stale, `current_period_end = max(old, event)`. A renewal of a period that ends before the
 * stored one is a late copy of the past, so it is recorded and changes nothing: it must not give Pro back after a refund
 * of the current period (D34), clear a grace the provider started, or take the current transaction back.
 */
const renewal =
  (newAnchor: boolean) =>
  (state: SubscriptionState, event: Event<'renewed'>): ApplyResult => {
    if (state.currentPeriodEnd !== null && event.currentPeriodEnd < state.currentPeriodEnd) {
      return recorded(state, 'billing_event_recorded');
    }
    const next: SubscriptionState = {
      ...state,
      status: 'active',
      graceEndsAt: null,
      interval: event.interval,
      pendingInterval: null,
      currentPeriodStart: event.currentPeriodStart,
      currentPeriodEnd: event.currentPeriodEnd,
      currentTransactionId: event.transactionId,
      ...(newAnchor && { quotaAnchorAt: event.currentPeriodStart }),
    };
    return changed(next, newAnchor);
  };

/** D23: grace ends at the store's date, else at (the later of the failure and the period end) + `grace_days`. */
function failed(state: SubscriptionState, event: Event<'renewal_failed'>, ctx: Ctx): ApplyResult {
  const from = Math.max(event.occurredAt.getTime(), state.currentPeriodEnd?.getTime() ?? 0);
  return changed({ ...state, status: 'grace', graceEndsAt: event.graceEndsAt ?? new Date(from + ctx.graceDays * DAY_MS) });
}

/** D34, D37: a refund of the current period's transaction revokes; another transaction, or an unknown current one, is recorded. */
function refund(state: SubscriptionState, event: Event<'refunded'>): ApplyResult {
  if (state.currentTransactionId === null) return recorded(state, 'billing_refund_unmatched');
  if (event.transactionId !== state.currentTransactionId) return recorded(state, 'billing_event_recorded');
  return changed({ ...state, status: 'revoked' });
}

const MATRIX: { [T in EventType]: Row<Event<T>> } = {
  subscription_started: {
    none: (event, ctx) => started(null, event, ctx),
    trialing: RECORD,
    active: RECORD,
    grace: RECORD,
    on_hold: RECORD,
    expired: started,
    revoked: started,
  },
  renewed: {
    none: (event) =>
      changed(
        {
          status: 'active',
          interval: event.interval,
          trialEndsAt: null,
          trialDenied: false,
          paymentFingerprint: null,
          currentPeriodStart: event.currentPeriodStart,
          currentPeriodEnd: event.currentPeriodEnd,
          graceEndsAt: null,
          cancelAtPeriodEnd: false,
          pendingInterval: null,
          quotaAnchorAt: event.currentPeriodStart,
          currentTransactionId: event.transactionId,
        },
        true,
        'billing_started_missing',
      ),
    trialing: renewal(true),
    active: renewal(false),
    grace: renewal(false),
    on_hold: renewal(false),
    expired: renewal(true),
    revoked: renewal(true),
  },
  renewal_failed: {
    none: RECORD,
    trialing: failed,
    active: failed,
    grace: (state, event) =>
      event.graceEndsAt !== null && (state.graceEndsAt === null || event.graceEndsAt > state.graceEndsAt)
        ? changed({ ...state, graceEndsAt: event.graceEndsAt })
        : recorded(state, null),
    on_hold: KEEP,
    expired: RECORD,
    revoked: RECORD,
  },
  grace_ended: {
    none: RECORD,
    trialing: set({ status: 'on_hold' }),
    active: set({ status: 'on_hold' }),
    grace: set({ status: 'on_hold' }),
    on_hold: KEEP,
    expired: RECORD,
    revoked: RECORD,
  },
  cancel_scheduled: {
    none: RECORD,
    trialing: set({ cancelAtPeriodEnd: true }),
    active: set({ cancelAtPeriodEnd: true }),
    grace: set({ cancelAtPeriodEnd: true }),
    on_hold: set({ cancelAtPeriodEnd: true }),
    expired: RECORD,
    revoked: RECORD,
  },
  cancel_unscheduled: {
    none: RECORD,
    trialing: set({ cancelAtPeriodEnd: false }),
    active: set({ cancelAtPeriodEnd: false }),
    grace: set({ cancelAtPeriodEnd: false }),
    on_hold: set({ cancelAtPeriodEnd: false }),
    expired: RECORD,
    revoked: RECORD,
  },
  expired: {
    none: RECORD,
    trialing: set({ status: 'expired' }),
    active: set({ status: 'expired' }),
    grace: set({ status: 'expired' }),
    on_hold: set({ status: 'expired' }),
    expired: KEEP,
    revoked: KEEP,
  },
  revoked: {
    none: RECORD,
    trialing: set({ status: 'revoked' }),
    active: set({ status: 'revoked' }),
    grace: set({ status: 'revoked' }),
    on_hold: set({ status: 'revoked' }),
    expired: set({ status: 'revoked' }),
    revoked: KEEP,
  },
  refunded: {
    none: RECORD,
    trialing: RECORD,
    active: refund,
    grace: refund,
    on_hold: refund,
    expired: RECORD,
    revoked: RECORD,
  },
  refund_reversed: {
    none: RECORD,
    trialing: RECORD,
    active: RECORD,
    grace: RECORD,
    on_hold: RECORD,
    expired: RECORD,
    revoked: (state, event, ctx) => {
      if (state.currentTransactionId === null || event.transactionId !== state.currentTransactionId) {
        return recorded(state, 'billing_event_recorded');
      }
      const inPeriod = state.currentPeriodEnd !== null && ctx.now < state.currentPeriodEnd;
      return changed({ ...state, status: inPeriod ? 'active' : 'expired' });
    },
  },
  plan_changed: {
    none: RECORD,
    trialing: (state, event) => changed({ ...state, interval: event.interval }),
    // D25: month → year at once, anchor kept; D37: the new period's transaction is the current one.
    active: (state, event) =>
      changed({
        ...state,
        interval: event.interval,
        currentPeriodStart: event.currentPeriodStart,
        currentPeriodEnd: event.currentPeriodEnd,
        currentTransactionId: event.transactionId,
      }),
    grace: (state, event) =>
      changed({
        ...state,
        interval: event.interval,
        currentPeriodStart: event.currentPeriodStart,
        currentPeriodEnd: event.currentPeriodEnd,
        currentTransactionId: event.transactionId,
      }),
    on_hold: RECORD,
    expired: RECORD,
    revoked: RECORD,
  },
  plan_change_scheduled: {
    none: RECORD,
    trialing: (state, event) => changed({ ...state, pendingInterval: event.interval }),
    active: (state, event) => changed({ ...state, pendingInterval: event.interval }),
    grace: (state, event) => changed({ ...state, pendingInterval: event.interval }),
    on_hold: RECORD,
    expired: RECORD,
    revoked: RECORD,
  },
  plan_change_canceled: {
    none: RECORD,
    trialing: set({ pendingInterval: null }),
    active: set({ pendingInterval: null }),
    grace: set({ pendingInterval: null }),
    on_hold: set({ pendingInterval: null }),
    expired: RECORD,
    revoked: RECORD,
  },
};

/** Applies one event to a subscription row (`null` = no row yet). Pure: the caller stores the result. */
export function applyEvent(state: SubscriptionState | null, event: NormalizedEvent, ctx: Ctx): ApplyResult {
  const row = MATRIX[event.type] as unknown as Row<NormalizedEvent>;
  if (state === null) return row.none === RECORD ? recorded(null, 'billing_event_recorded') : row.none(event, ctx);
  const cell = row[state.status];
  if (cell === RECORD) return recorded(state, 'billing_event_recorded');
  if (cell === KEEP) return recorded(state, null);
  return cell(state, event, ctx);
}

/**
 * True when `applyEvent` will create a trialing row or reactivate one into `trialing` — the only cells that use a trial.
 * A `subscription_started` on a live row is "Ghi" and starts nothing (plan review #3).
 */
export function startsTrial(state: SubscriptionState | null, event: NormalizedEvent): boolean {
  if (event.type !== 'subscription_started' || event.trialEndsAt === null) return false;
  return state === null || state.status === 'expired' || state.status === 'revoked';
}

/**
 * The provider's truth overwrites the six columns of design §9.2 "fetchState". `grace_ends_at` is kept only while the row
 * stays in grace; entering grace by a fetch leaves it null, so `effectiveStatus` applies the D23 default; leaving grace
 * clears an old one. A null date never overwrites a stored one (never a silent Pro forever), and a fetched period that
 * differs from the stored one leaves the current transaction unknown, so a refund only records until `renewed` or
 * `plan_changed` names it (D34, D37). Coordinator rulings Q-C2, 19/10/2026.
 */
export function applyFetched(state: SubscriptionState, fetched: FetchedState): SubscriptionState {
  const currentPeriodStart = fetched.currentPeriodStart ?? state.currentPeriodStart;
  const currentPeriodEnd = fetched.currentPeriodEnd ?? state.currentPeriodEnd;
  const samePeriod = currentPeriodStart?.getTime() === state.currentPeriodStart?.getTime()
    && currentPeriodEnd?.getTime() === state.currentPeriodEnd?.getTime();
  return {
    ...state,
    graceEndsAt: state.status === 'grace' && fetched.status === 'grace' ? state.graceEndsAt : null,
    currentTransactionId: samePeriod ? state.currentTransactionId : null,
    status: fetched.status,
    interval: fetched.interval,
    currentPeriodStart,
    currentPeriodEnd,
    trialEndsAt: fetched.trialEndsAt ?? state.trialEndsAt,
    cancelAtPeriodEnd: fetched.cancelAtPeriodEnd,
  };
}
