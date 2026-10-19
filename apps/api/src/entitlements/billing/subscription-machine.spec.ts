import { describe, expect, it } from 'vitest';
import type { SubscriptionStatus } from '../entitlements.types.js';
import { EVENT_TYPES, eventKind, type EventType, type NormalizedEvent, type SubscriptionState } from './billing.types.js';
import { effectiveStatus } from '../rules/plan-rules.js';
import { applyEvent, applyFetched, startsTrial } from './subscription-machine.js';

const at = (iso: string) => new Date(iso);
const OCCURRED = at('2026-11-15T10:00:00Z');
const ctx = { now: OCCURRED, graceDays: 7, trialAllowed: true };

const common = {
  provider: 'fake',
  environment: 'sandbox' as const,
  externalEventId: 'evt-1',
  externalSubscriptionId: 'sub-1',
  appUserId: '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10',
  occurredAt: OCCURRED,
};

function event(type: EventType, fields: Record<string, unknown> = {}): NormalizedEvent {
  return { ...common, type, ...fields } as NormalizedEvent;
}

// One event per type, the fields of design §9.3 (D37: a charge carries its transaction id).
const EVENTS: Record<EventType, NormalizedEvent> = {
  subscription_started: event('subscription_started', {
    interval: 'year',
    currentPeriodStart: OCCURRED,
    currentPeriodEnd: at('2027-11-15T10:00:00Z'),
    trialEndsAt: null,
    paymentFingerprint: 'fp-new',
    transactionId: 'tx-new',
  }),
  renewed: event('renewed', {
    transactionId: 'tx-new',
    interval: 'month',
    currentPeriodStart: at('2026-12-01T00:00:00Z'),
    currentPeriodEnd: at('2027-01-01T00:00:00Z'),
  }),
  renewal_failed: event('renewal_failed', { graceEndsAt: null }),
  grace_ended: event('grace_ended'),
  cancel_scheduled: event('cancel_scheduled'),
  cancel_unscheduled: event('cancel_unscheduled'),
  expired: event('expired'),
  revoked: event('revoked'),
  refunded: event('refunded', { transactionId: 'tx-current', amount: null }),
  refund_reversed: event('refund_reversed', { transactionId: 'tx-current' }),
  plan_changed: event('plan_changed', {
    interval: 'year',
    currentPeriodStart: OCCURRED,
    currentPeriodEnd: at('2027-11-15T10:00:00Z'),
    transactionId: 'tx-year',
  }),
  plan_change_scheduled: event('plan_change_scheduled', { interval: 'year' }),
  plan_change_canceled: event('plan_change_canceled'),
};

const ACTIVE: SubscriptionState = {
  status: 'active',
  interval: 'month',
  trialEndsAt: null,
  trialDenied: false,
  paymentFingerprint: 'fp-old',
  currentPeriodStart: at('2026-11-01T00:00:00Z'),
  currentPeriodEnd: at('2026-12-01T00:00:00Z'),
  graceEndsAt: null,
  cancelAtPeriodEnd: false,
  pendingInterval: null,
  quotaAnchorAt: at('2026-11-01T00:00:00Z'),
  currentTransactionId: 'tx-current',
};

const ROWS: Record<SubscriptionStatus, SubscriptionState> = {
  trialing: {
    ...ACTIVE,
    status: 'trialing',
    trialEndsAt: at('2026-11-17T00:00:00Z'),
    currentPeriodStart: at('2026-11-10T00:00:00Z'),
    currentPeriodEnd: at('2026-11-17T00:00:00Z'),
    quotaAnchorAt: at('2026-11-10T00:00:00Z'),
    currentTransactionId: null,
  },
  active: ACTIVE,
  grace: { ...ACTIVE, status: 'grace', graceEndsAt: at('2026-12-08T00:00:00Z') },
  on_hold: { ...ACTIVE, status: 'on_hold' },
  expired: { ...ACTIVE, status: 'expired' },
  revoked: { ...ACTIVE, status: 'revoked' },
};

// Columns set before the event so a cell that clears them shows it.
const GIVEN: Partial<Record<EventType, Partial<SubscriptionState>>> = {
  cancel_unscheduled: { cancelAtPeriodEnd: true },
  plan_change_canceled: { pendingInterval: 'year' },
};

type From = SubscriptionStatus | 'none';
type Cell =
  | { kind: 'record'; log: string | null }
  | { kind: 'change'; set: Partial<SubscriptionState>; anchorReset?: boolean; log?: string | null }
  | { kind: 'create'; row: SubscriptionState; log?: string | null };

const RECORD: Cell = { kind: 'record', log: 'billing_event_recorded' };
const KEEP: Cell = { kind: 'record', log: null };
const to = (set: Partial<SubscriptionState>, anchorReset = false): Cell => ({ kind: 'change', set, anchorReset });

const started = EVENTS.subscription_started as Extract<NormalizedEvent, { type: 'subscription_started' }>;
const renewed = EVENTS.renewed as Extract<NormalizedEvent, { type: 'renewed' }>;
const planChanged = EVENTS.plan_changed as Extract<NormalizedEvent, { type: 'plan_changed' }>;

const REACTIVATED: Partial<SubscriptionState> = {
  status: 'active',
  interval: 'year',
  trialEndsAt: null,
  paymentFingerprint: 'fp-new',
  currentPeriodStart: started.currentPeriodStart,
  currentPeriodEnd: started.currentPeriodEnd,
  graceEndsAt: null,
  cancelAtPeriodEnd: false,
  pendingInterval: null,
  quotaAnchorAt: OCCURRED,
  currentTransactionId: 'tx-new',
};
const RENEWED_PERIOD: Partial<SubscriptionState> = {
  status: 'active',
  interval: 'month',
  pendingInterval: null,
  currentPeriodStart: renewed.currentPeriodStart,
  currentPeriodEnd: renewed.currentPeriodEnd,
  currentTransactionId: 'tx-new',
  graceEndsAt: null,
};
const RENEWED_NEW_ANCHOR = { ...RENEWED_PERIOD, quotaAnchorAt: renewed.currentPeriodStart };
const PLAN_CHANGED: Partial<SubscriptionState> = {
  interval: 'year',
  currentPeriodStart: planChanged.currentPeriodStart,
  currentPeriodEnd: planChanged.currentPeriodEnd,
  currentTransactionId: 'tx-year',
};

// Design §9.4, "Bảng đủ: trạng thái × sự kiện": 13 events × 7 columns.
const MATRIX: Record<EventType, Record<From, Cell>> = {
  subscription_started: {
    none: {
      kind: 'create',
      row: {
        status: 'active',
        interval: 'year',
        trialEndsAt: null,
        trialDenied: false,
        paymentFingerprint: 'fp-new',
        currentPeriodStart: started.currentPeriodStart,
        currentPeriodEnd: started.currentPeriodEnd,
        graceEndsAt: null,
        cancelAtPeriodEnd: false,
        pendingInterval: null,
        quotaAnchorAt: OCCURRED,
        currentTransactionId: 'tx-new',
      },
    },
    trialing: RECORD,
    active: RECORD,
    grace: RECORD,
    on_hold: RECORD,
    expired: to(REACTIVATED, true),
    revoked: to(REACTIVATED, true),
  },
  renewed: {
    none: {
      kind: 'create',
      log: 'billing_started_missing',
      row: {
        status: 'active',
        interval: 'month',
        trialEndsAt: null,
        trialDenied: false,
        paymentFingerprint: null,
        currentPeriodStart: renewed.currentPeriodStart,
        currentPeriodEnd: renewed.currentPeriodEnd,
        graceEndsAt: null,
        cancelAtPeriodEnd: false,
        pendingInterval: null,
        quotaAnchorAt: renewed.currentPeriodStart,
        currentTransactionId: 'tx-new',
      },
    },
    trialing: to(RENEWED_NEW_ANCHOR, true),
    active: to(RENEWED_PERIOD),
    grace: to(RENEWED_PERIOD),
    on_hold: to(RENEWED_PERIOD),
    expired: to(RENEWED_NEW_ANCHOR, true),
    revoked: to(RENEWED_NEW_ANCHOR, true),
  },
  renewal_failed: {
    none: RECORD,
    // grace_ends_at = max(occurred_at, current_period_end) + 7 days.
    trialing: to({ status: 'grace', graceEndsAt: at('2026-11-24T00:00:00Z') }),
    active: to({ status: 'grace', graceEndsAt: at('2026-12-08T00:00:00Z') }),
    grace: KEEP,
    on_hold: KEEP,
    expired: RECORD,
    revoked: RECORD,
  },
  grace_ended: {
    none: RECORD,
    trialing: to({ status: 'on_hold' }),
    active: to({ status: 'on_hold' }),
    grace: to({ status: 'on_hold' }),
    on_hold: KEEP,
    expired: RECORD,
    revoked: RECORD,
  },
  cancel_scheduled: {
    none: RECORD,
    trialing: to({ cancelAtPeriodEnd: true }),
    active: to({ cancelAtPeriodEnd: true }),
    grace: to({ cancelAtPeriodEnd: true }),
    on_hold: to({ cancelAtPeriodEnd: true }),
    expired: RECORD,
    revoked: RECORD,
  },
  cancel_unscheduled: {
    none: RECORD,
    trialing: to({ cancelAtPeriodEnd: false }),
    active: to({ cancelAtPeriodEnd: false }),
    grace: to({ cancelAtPeriodEnd: false }),
    on_hold: to({ cancelAtPeriodEnd: false }),
    expired: RECORD,
    revoked: RECORD,
  },
  expired: {
    none: RECORD,
    trialing: to({ status: 'expired' }),
    active: to({ status: 'expired' }),
    grace: to({ status: 'expired' }),
    on_hold: to({ status: 'expired' }),
    expired: KEEP,
    revoked: KEEP,
  },
  revoked: {
    none: RECORD,
    trialing: to({ status: 'revoked' }),
    active: to({ status: 'revoked' }),
    grace: to({ status: 'revoked' }),
    on_hold: to({ status: 'revoked' }),
    expired: to({ status: 'revoked' }),
    revoked: KEEP,
  },
  refunded: {
    none: RECORD,
    trialing: RECORD,
    active: to({ status: 'revoked' }),
    grace: to({ status: 'revoked' }),
    on_hold: to({ status: 'revoked' }),
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
    revoked: to({ status: 'active' }),
  },
  plan_changed: {
    none: RECORD,
    trialing: to({ interval: 'year' }),
    active: to(PLAN_CHANGED),
    // D40: an upgrade paid while in grace leaves grace; the yearly period is the first paid one, so a new anchor.
    grace: to({ ...PLAN_CHANGED, status: 'active', graceEndsAt: null, quotaAnchorAt: planChanged.currentPeriodStart }, true),
    on_hold: RECORD,
    expired: RECORD,
    revoked: RECORD,
  },
  plan_change_scheduled: {
    none: RECORD,
    trialing: to({ pendingInterval: 'year' }),
    active: to({ pendingInterval: 'year' }),
    grace: to({ pendingInterval: 'year' }),
    on_hold: RECORD,
    expired: RECORD,
    revoked: RECORD,
  },
  plan_change_canceled: {
    none: RECORD,
    trialing: to({ pendingInterval: null }),
    active: to({ pendingInterval: null }),
    grace: to({ pendingInterval: null }),
    on_hold: to({ pendingInterval: null }),
    expired: RECORD,
    revoked: RECORD,
  },
};

const FROM: From[] = ['none', 'trialing', 'active', 'grace', 'on_hold', 'expired', 'revoked'];
const CELLS = EVENT_TYPES.flatMap((type) => FROM.map((from) => [type, from, MATRIX[type][from]] as const));

describe('applyEvent — design §9.4 matrix', () => {
  it('has 13 event types and 91 cells (D35: no payment_succeeded)', () => {
    expect(EVENT_TYPES).toHaveLength(13);
    expect(EVENT_TYPES).not.toContain('payment_succeeded');
    expect(CELLS).toHaveLength(91);
  });

  it.each(CELLS)('R3: %s on %s', (type, from, cell) => {
    const state = from === 'none' ? null : { ...ROWS[from], ...GIVEN[type] };
    const result = applyEvent(state, EVENTS[type], ctx);

    if (cell.kind === 'record') {
      expect(result).toEqual({ next: state, outcome: 'recorded', anchorReset: false, log: cell.log });
    } else if (cell.kind === 'create') {
      expect(result).toEqual({ next: cell.row, outcome: 'changed', anchorReset: true, log: cell.log ?? null });
    } else {
      expect(result).toEqual({
        next: { ...state, ...cell.set },
        outcome: 'changed',
        anchorReset: cell.anchorReset ?? false,
        log: cell.log ?? null,
      });
    }
  });
});

describe('applyEvent — details the matrix leaves to the code', () => {
  it('B5E47: renewal_failed 15/11 with grace 7 → grace_ends_at 22/11', () => {
    const state = { ...ACTIVE, currentPeriodEnd: at('2026-11-15T00:00:00Z') };
    const failed = { ...EVENTS.renewal_failed, occurredAt: at('2026-11-15T00:00:00Z') };
    const { next } = applyEvent(state, failed, ctx);
    expect(next?.status).toBe('grace');
    expect(next?.graceEndsAt).toEqual(at('2026-11-22T00:00:00Z'));
  });

  it('D23: renewal_failed with a grace end sent by the store uses it', () => {
    const failed = event('renewal_failed', { graceEndsAt: at('2026-11-30T00:00:00Z') });
    const { next } = applyEvent(ACTIVE, failed, ctx);
    expect(next?.graceEndsAt).toEqual(at('2026-11-30T00:00:00Z'));
  });

  it('renewal_failed on grace keeps the status and takes a later store grace end, not an earlier one', () => {
    const grace = ROWS.grace;
    const later = applyEvent(grace, event('renewal_failed', { graceEndsAt: at('2026-12-20T00:00:00Z') }), ctx);
    expect(later).toMatchObject({ outcome: 'changed', next: { status: 'grace', graceEndsAt: at('2026-12-20T00:00:00Z') } });
    const earlier = applyEvent(grace, event('renewal_failed', { graceEndsAt: at('2026-12-01T00:00:00Z') }), ctx);
    expect(earlier).toEqual({ next: grace, outcome: 'recorded', anchorReset: false, log: null });
  });

  it('B5E53: plan_change_scheduled then renewed → interval month, anchor kept', () => {
    const year: SubscriptionState = {
      ...ACTIVE,
      interval: 'year',
      currentPeriodStart: at('2026-01-10T00:00:00Z'),
      currentPeriodEnd: at('2027-01-10T00:00:00Z'),
      quotaAnchorAt: at('2026-01-10T00:00:00Z'),
    };
    const scheduled = applyEvent(year, event('plan_change_scheduled', { interval: 'month' }), ctx);
    expect(scheduled.next).toMatchObject({ interval: 'year', pendingInterval: 'month' });

    const renewal = event('renewed', {
      transactionId: 'tx-month-1',
      interval: 'month',
      currentPeriodStart: at('2027-01-10T00:00:00Z'),
      currentPeriodEnd: at('2027-02-10T00:00:00Z'),
    });
    const result = applyEvent(scheduled.next, renewal, ctx);
    expect(result.next).toMatchObject({
      status: 'active',
      interval: 'month',
      pendingInterval: null,
      quotaAnchorAt: at('2026-01-10T00:00:00Z'),
    });
    expect(result.anchorReset).toBe(false);
  });

  it('B5E105 (D40): grace since 1/11 (end 8/11), plan_changed year y1 on 5/11 → active, no grace end, yearly, y1, anchor 5/11; still Pro after 8/11', () => {
    const grace: SubscriptionState = {
      ...ACTIVE,
      status: 'grace',
      currentPeriodStart: at('2026-10-01T00:00:00Z'),
      currentPeriodEnd: at('2026-11-01T00:00:00Z'),
      graceEndsAt: at('2026-11-08T00:00:00Z'),
      quotaAnchorAt: at('2026-10-01T00:00:00Z'),
    };
    const upgrade = event('plan_changed', {
      occurredAt: at('2026-11-05T00:00:00Z'),
      interval: 'year',
      currentPeriodStart: at('2026-11-05T00:00:00Z'),
      currentPeriodEnd: at('2027-11-05T00:00:00Z'),
      transactionId: 'y1',
    });
    const result = applyEvent(grace, upgrade, { ...ctx, now: at('2026-11-05T00:00:00Z') });
    expect(result).toEqual({
      outcome: 'changed',
      anchorReset: true,
      log: null,
      next: {
        ...grace,
        status: 'active',
        graceEndsAt: null,
        interval: 'year',
        currentPeriodStart: at('2026-11-05T00:00:00Z'),
        currentPeriodEnd: at('2027-11-05T00:00:00Z'),
        currentTransactionId: 'y1',
        quotaAnchorAt: at('2026-11-05T00:00:00Z'),
      },
    });
    const source = { ...result.next!, id: 's', provider: 'fake', externalSubscriptionId: 'x' };
    expect(effectiveStatus(source, at('2026-11-09T00:00:00Z'), 7)).toEqual({ status: 'active', overdue: false });
  });

  it('B5E54: plan_changed keeps the anchor', () => {
    const result = applyEvent(ACTIVE, EVENTS.plan_changed, ctx);
    expect(result.next?.quotaAnchorAt).toEqual(ACTIVE.quotaAnchorAt);
    expect(result.next?.interval).toBe('year');
    expect(result.anchorReset).toBe(false);
  });

  it('B5E70: renewed after cancel_scheduled keeps cancel_at_period_end', () => {
    const cancelled = applyEvent(ACTIVE, EVENTS.cancel_scheduled, ctx).next;
    const result = applyEvent(cancelled, EVENTS.renewed, ctx);
    expect(result.next).toMatchObject({ status: 'active', cancelAtPeriodEnd: true });
  });

  // A renewal of a period older than the stored one arrives late: it is recorded and changes nothing (review D1, Important 1).
  const olderRenewal = event('renewed', {
    transactionId: 'tx-old',
    interval: 'month',
    currentPeriodStart: at('2026-11-01T00:00:00Z'),
    currentPeriodEnd: at('2026-11-30T00:00:00Z'),
  });

  it.each(['trialing', 'active', 'grace', 'on_hold', 'expired', 'revoked'] as const)(
    'renewed for an older period on %s → recorded, nothing changes (no Pro back after a refund, no grace cleared)',
    (from) => {
      const state = { ...ROWS[from], currentPeriodEnd: at('2026-12-01T00:00:00Z'), trialDenied: from === 'trialing' };
      expect(applyEvent(state, olderRenewal, ctx)).toEqual({
        next: state,
        outcome: 'recorded',
        anchorReset: false,
        log: 'billing_event_recorded',
      });
    },
  );

  it('a renewal ending exactly at the stored period end still applies (the same period renewed again is a replay of the provider truth)', () => {
    const sameEnd = event('renewed', {
      transactionId: 'tx-same',
      interval: 'month',
      currentPeriodStart: at('2026-11-01T00:00:00Z'),
      currentPeriodEnd: at('2026-12-01T00:00:00Z'),
    });
    expect(applyEvent(ROWS.grace, sameEnd, ctx)).toMatchObject({
      outcome: 'changed',
      next: { status: 'active', graceEndsAt: null, currentTransactionId: 'tx-same' },
    });
  });

  it('review D1 sequence: refunded current renewal, then a late older renewal → still revoked', () => {
    const renewedRow = applyEvent(ACTIVE, EVENTS.renewed, ctx).next;
    const revoked = applyEvent(renewedRow, event('refunded', { transactionId: 'tx-new', amount: null }), ctx).next;
    expect(revoked?.status).toBe('revoked');
    expect(applyEvent(revoked, olderRenewal, ctx).next).toEqual(revoked);
  });

  it('B5E86: a partial refund of the current transaction → revoked', () => {
    const result = applyEvent(ACTIVE, event('refunded', { transactionId: 'tx-current', amount: 1.5 }), ctx);
    expect(result).toMatchObject({ outcome: 'changed', next: { status: 'revoked' } });
  });

  it('B5E87: a refund of another transaction → recorded, still active', () => {
    const result = applyEvent(ACTIVE, event('refunded', { transactionId: 'tx-other', amount: null }), ctx);
    expect(result).toEqual({ next: ACTIVE, outcome: 'recorded', anchorReset: false, log: 'billing_event_recorded' });
  });

  it('B5E87 (D37): started month with m1, plan_changed year with y1: refund of m1 → recorded; refund of y1 → revoked', () => {
    const month = applyEvent(
      null,
      event('subscription_started', {
        interval: 'month',
        currentPeriodStart: at('2026-11-01T00:00:00Z'),
        currentPeriodEnd: at('2026-12-01T00:00:00Z'),
        trialEndsAt: null,
        paymentFingerprint: null,
        transactionId: 'm1',
      }),
      ctx,
    ).next;
    const year = applyEvent(
      month,
      event('plan_changed', {
        interval: 'year',
        currentPeriodStart: at('2026-11-10T00:00:00Z'),
        currentPeriodEnd: at('2027-11-10T00:00:00Z'),
        transactionId: 'y1',
      }),
      ctx,
    ).next;

    const refundMonth = applyEvent(year, event('refunded', { transactionId: 'm1', amount: 2 }), ctx);
    expect(refundMonth).toMatchObject({ outcome: 'recorded', next: { status: 'active', interval: 'year' } });
    const refundYear = applyEvent(year, event('refunded', { transactionId: 'y1', amount: null }), ctx);
    expect(refundYear).toMatchObject({ outcome: 'changed', next: { status: 'revoked' } });
  });

  it('B5E93: refunded while current_transaction_id is null → recorded, log billing_refund_unmatched, still active', () => {
    const state = { ...ACTIVE, currentTransactionId: null };
    const result = applyEvent(state, EVENTS.refunded, ctx);
    expect(result).toEqual({ next: state, outcome: 'recorded', anchorReset: false, log: 'billing_refund_unmatched' });
  });

  it('subscription_started without a trial sets current_transaction_id', () => {
    expect(applyEvent(null, EVENTS.subscription_started, ctx).next?.currentTransactionId).toBe('tx-new');
    expect(applyEvent(ROWS.revoked, EVENTS.subscription_started, ctx).next?.currentTransactionId).toBe('tx-new');
  });

  const trialStart = event('subscription_started', {
    interval: 'month',
    currentPeriodStart: OCCURRED,
    currentPeriodEnd: at('2026-11-22T10:00:00Z'),
    trialEndsAt: at('2026-11-22T10:00:00Z'),
    paymentFingerprint: 'fp-card',
    transactionId: null,
  });

  it.each([
    [true, false],
    [false, true],
  ])('D30: a trial start with trialAllowed %s → trialing, trial_denied %s, no transaction, anchor = start', (allowed, denied) => {
    const result = applyEvent(null, trialStart, { ...ctx, trialAllowed: allowed });
    expect(result).toMatchObject({
      outcome: 'changed',
      anchorReset: true,
      next: {
        status: 'trialing',
        trialDenied: denied,
        trialEndsAt: at('2026-11-22T10:00:00Z'),
        paymentFingerprint: 'fp-card',
        currentTransactionId: null,
        quotaAnchorAt: OCCURRED,
      },
    });
  });

  it('a reactivation from expired with a trial → trialing, trial_denied from the context, the old transaction dropped', () => {
    const result = applyEvent(ROWS.expired, trialStart, { ...ctx, trialAllowed: false });
    expect(result).toMatchObject({
      outcome: 'changed',
      anchorReset: true,
      next: { status: 'trialing', trialDenied: true, currentTransactionId: null, quotaAnchorAt: OCCURRED },
    });
  });

  it('refund_reversed on revoked after the period ended → expired; for another transaction → recorded', () => {
    const late = { ...ctx, now: at('2026-12-02T00:00:00Z') };
    expect(applyEvent(ROWS.revoked, EVENTS.refund_reversed, late).next?.status).toBe('expired');
    const other = applyEvent(ROWS.revoked, event('refund_reversed', { transactionId: 'tx-other' }), ctx);
    expect(other).toEqual({ next: ROWS.revoked, outcome: 'recorded', anchorReset: false, log: 'billing_event_recorded' });
  });
});

describe('startsTrial', () => {
  const withTrial = event('subscription_started', {
    interval: 'month',
    currentPeriodStart: OCCURRED,
    currentPeriodEnd: at('2026-11-22T10:00:00Z'),
    trialEndsAt: at('2026-11-22T10:00:00Z'),
    paymentFingerprint: null,
    transactionId: null,
  });

  it.each([
    ['none', true],
    ['expired', true],
    ['revoked', true],
    ['trialing', false],
    ['active', false],
    ['grace', false],
    ['on_hold', false],
  ] as const)('plan review #3: subscription_started with a trial on %s → %s', (from, expected) => {
    expect(startsTrial(from === 'none' ? null : ROWS[from], withTrial)).toBe(expected);
  });

  it('subscription_started without trialEndsAt or another type never starts a trial', () => {
    expect(startsTrial(null, EVENTS.subscription_started)).toBe(false);
    expect(startsTrial(null, EVENTS.renewed)).toBe(false);
  });
});

describe('applyFetched', () => {
  const fetched = {
    interval: 'year' as const,
    currentPeriodStart: at('2026-12-01T00:00:00Z'),
    currentPeriodEnd: at('2027-12-01T00:00:00Z'),
    trialEndsAt: at('2026-11-08T00:00:00Z'),
    cancelAtPeriodEnd: true,
  };

  it('overwrites the six fetched columns and, leaving grace, clears grace_ends_at; nothing else', () => {
    const state: SubscriptionState = { ...ROWS.grace, cancelAtPeriodEnd: false, pendingInterval: 'year' };
    const result = applyFetched(state, { ...fetched, status: 'on_hold' });
    expect(result).toEqual({ ...state, ...fetched, status: 'on_hold', graceEndsAt: null, currentTransactionId: null });
  });

  it.each([
    ['active → grace: no grace end yet (effectiveStatus applies the D23 default)', 'active', 'grace', null],
    ['grace → grace: keeps the stored grace end', 'grace', 'grace', at('2026-12-08T00:00:00Z')],
    ['grace → active: clears the old grace end', 'grace', 'active', null],
  ] as const)('coordinator ruling: %s', (_name, from, to, graceEndsAt) => {
    const state: SubscriptionState = { ...ROWS[from], graceEndsAt: at('2026-12-08T00:00:00Z') };
    expect(applyFetched(state, { ...fetched, status: to })).toEqual({
      ...state, ...fetched, status: to, graceEndsAt, currentTransactionId: null,
    });
  });

  it('Q-C2 (b): a null date from the provider never overwrites a stored one (never a silent Pro forever)', () => {
    const state: SubscriptionState = { ...ROWS.trialing };
    const result = applyFetched(state, {
      status: 'trialing', interval: 'month', currentPeriodStart: null, currentPeriodEnd: null, trialEndsAt: null, cancelAtPeriodEnd: false,
    });
    expect(result).toMatchObject({
      currentPeriodStart: state.currentPeriodStart, currentPeriodEnd: state.currentPeriodEnd, trialEndsAt: state.trialEndsAt,
    });
  });

  it('Q-C2 (c): a fetched period that differs from the stored one clears current_transaction_id; the same period keeps it', () => {
    const moved = applyFetched(ACTIVE, { ...fetched, status: 'active' });
    expect(moved.currentTransactionId).toBeNull();
    const refund = applyEvent(moved, event('refunded', { transactionId: 'tx-current', amount: null }), ctx);
    expect(refund).toMatchObject({ outcome: 'recorded', log: 'billing_refund_unmatched', next: { status: 'active' } });

    const same = applyFetched(ACTIVE, {
      status: 'active', interval: 'month', currentPeriodStart: ACTIVE.currentPeriodStart, currentPeriodEnd: ACTIVE.currentPeriodEnd,
      trialEndsAt: null, cancelAtPeriodEnd: true,
    });
    expect(same).toEqual({ ...ACTIVE, cancelAtPeriodEnd: true });
  });
});

describe('eventKind', () => {
  it.each(EVENT_TYPES.map((type) => [type, type === 'renewed' || type === 'refunded' ? 'additive' : 'state']))(
    'R1: %s is %s',
    (type, kind) => {
      expect(eventKind(type as EventType)).toBe(kind);
    },
  );
});
