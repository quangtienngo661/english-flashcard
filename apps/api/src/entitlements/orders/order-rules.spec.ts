import { describe, expect, it } from 'vitest';
import {
  decideManualConfirm, decideOrderPayment, parsePayosTime, precheckPayment, type IncomingPayment, type OrderState, type OrderStatus,
} from './order-rules.js';

const at = (iso: string) => new Date(iso);
const EXPIRES = at('2026-11-05T03:17:00.000Z');
const A = 199000;

const order = (over: Partial<OrderState> = {}): OrderState => ({
  status: 'pending', reviewReason: null, paidVia: null, amount: A, expiresAt: EXPIRES, payosTotal: 0, payosCount: 0, payosTransfers: [], account: 'active', ...over,
});
const pay = (over: Partial<IncomingPayment> = {}): IncomingPayment => ({ source: 'webhook', amount: A, at: at('2026-11-05T03:02:00.000Z'), providerTime: null, ...over });
/** A paid order: the first period is open, so `paid_via` is set. */
const paid = (over: Partial<OrderState> = {}) => order({ status: 'paid', paidVia: 'webhook', payosTotal: A, payosCount: 1, ...over });

describe('decideOrderPayment — design §3.4, one row of the table at a time', () => {
  describe('T1: the learner is gone or going', () => {
    it('an order with no period → needs_review account-deleted, no period, the payer is saved for the refund, the payment needs a refund', () => {
      for (const account of ['deleted', 'deleting'] as const) {
        expect(decideOrderPayment(order({ account }), pay()), account).toMatchObject({
          orderStatus: 'needs_review', reviewReason: 'account-deleted', openPeriod: false, outcome: 'refund-needed', saveRefundInfo: true,
        });
      }
    });

    it('an order that already has a period keeps its status and gets the flag account-deleted', () => {
      expect(decideOrderPayment(paid({ account: 'deleted' }), pay({ amount: 50000 }))).toMatchObject({
        orderStatus: 'paid', reviewReason: 'account-deleted', openPeriod: false, outcome: 'refund-needed', saveRefundInfo: true,
      });
    });

    it('wins over every other row: also for a closed order and for an order the right amount would have paid', () => {
      expect(decideOrderPayment(order({ status: 'closed', account: 'deleted' }), pay())).toMatchObject({ orderStatus: 'needs_review', reviewReason: 'account-deleted', openPeriod: false });
      expect(decideOrderPayment(order({ status: 'expired', account: 'deleting' }), pay())).toMatchObject({ openPeriod: false, outcome: 'refund-needed' });
    });
  });

  describe('T2: an order with no period, the total reaches the amount, on time → paid, one period', () => {
    const statuses: OrderStatus[] = ['pending', 'failed', 'expired', 'cancelled', 'needs_review'];
    for (const status of statuses) {
      it(`${status}: paid, opened-period, paid_via follows the source, the review reason is cleared`, () => {
        const reviewReason = status === 'needs_review' ? ('amount-short' as const) : null;
        for (const source of ['webhook', 'reconcile'] as const) {
          expect(decideOrderPayment(order({ status, reviewReason }), pay({ source })), `${status} ${source}`).toMatchObject({
            orderStatus: 'paid', reviewReason: null, paidVia: source, openPeriod: true, outcome: 'opened-period',
          });
        }
      });
    }

    it('LB1E11: an expired order and money whose provider time is within 10 minutes after the expiry → paid; exactly 10 minutes is on time', () => {
      for (const status of ['expired', 'failed', 'cancelled'] as const) {
        expect(decideOrderPayment(order({ status }), pay({ at: at('2026-11-05T03:27:00.000Z') })), status).toMatchObject({ orderStatus: 'paid', openPeriod: true });
      }
    });

    it('a pending order takes the money whenever it arrives (the job has not closed it yet)', () => {
      expect(decideOrderPayment(order(), pay({ at: at('2026-11-06T10:00:00.000Z') }))).toMatchObject({ orderStatus: 'paid', openPeriod: true });
    });

    it('LB1E9: needs_review amount-short and the payment that brings the total to the amount → paid, however late', () => {
      const result = decideOrderPayment(order({ status: 'needs_review', reviewReason: 'amount-short', payosTotal: 100000, payosCount: 1 }),
        pay({ amount: 99000, at: at('2026-11-07T00:00:00.000Z') }));
      expect(result).toMatchObject({ orderStatus: 'paid', reviewReason: null, openPeriod: true, outcome: 'opened-period' });
    });

    it('LB1E24: a payment found by the reconcile job counts on time by its provider time, not by when the job ran', () => {
      expect(decideOrderPayment(order({ status: 'expired' }), pay({ source: 'reconcile', at: at('2026-11-05T03:20:00.000Z') })))
        .toMatchObject({ orderStatus: 'paid', paidVia: 'reconcile', openPeriod: true });
    });
  });

  describe('T3: the total is right but late', () => {
    it('LB1E12: no period, provider time more than 10 minutes after the expiry → needs_review late-payment, counted, no period', () => {
      for (const status of ['expired', 'failed', 'cancelled'] as const) {
        expect(decideOrderPayment(order({ status }), pay({ at: at('2026-11-05T03:27:00.001Z') })), status).toMatchObject({
          orderStatus: 'needs_review', reviewReason: 'late-payment', openPeriod: false, outcome: 'counted',
        });
      }
    });

    it('a needs_review order for another reason does not get the amount-short pass: late is late', () => {
      expect(decideOrderPayment(order({ status: 'needs_review', reviewReason: 'late-payment' }), pay({ at: at('2026-11-06T00:00:00.000Z') })))
        .toMatchObject({ orderStatus: 'needs_review', reviewReason: 'late-payment', openPeriod: false });
    });
  });

  describe('T4, T5: the total is not the amount', () => {
    it('T4: less → needs_review amount-short, counted (LB1E9 first transfer); more short money keeps it there', () => {
      expect(decideOrderPayment(order(), pay({ amount: 100000 }))).toMatchObject({
        orderStatus: 'needs_review', reviewReason: 'amount-short', openPeriod: false, outcome: 'counted',
      });
      expect(decideOrderPayment(order({ status: 'needs_review', reviewReason: 'amount-short', payosTotal: 100000, payosCount: 1 }), pay({ amount: 50000 })))
        .toMatchObject({ orderStatus: 'needs_review', reviewReason: 'amount-short', openPeriod: false });
    });

    it('T5 (LB1E10): more → needs_review amount-over, counted, no period', () => {
      expect(decideOrderPayment(order(), pay({ amount: 398000 }))).toMatchObject({
        orderStatus: 'needs_review', reviewReason: 'amount-over', openPeriod: false, outcome: 'counted',
      });
    });

    it('the totals are of the order, not of the single payment: 100.000 then 150.000 is over', () => {
      expect(decideOrderPayment(order({ status: 'needs_review', reviewReason: 'amount-short', payosTotal: 100000, payosCount: 1 }), pay({ amount: 150000 })))
        .toMatchObject({ reviewReason: 'amount-over', openPeriod: false });
    });
  });

  describe('T6: a closed order gets money', () => {
    it('→ needs_review extra-payment (back to waiting for staff), counted, no period', () => {
      expect(decideOrderPayment(order({ status: 'closed', reviewReason: null }), pay())).toMatchObject({
        orderStatus: 'needs_review', reviewReason: 'extra-payment', openPeriod: false, outcome: 'counted',
      });
    });
  });

  describe('orders that already have a period', () => {
    it('T7 (LB1E3): paid by staff, no payOS money yet, exactly the amount → attached to the confirmation, no period, no flag', () => {
      for (const source of ['webhook', 'reconcile'] as const) {
        expect(decideOrderPayment(paid({ paidVia: 'manual', payosTotal: 0, payosCount: 0 }), pay({ source })), source).toMatchObject({
          orderStatus: 'paid', reviewReason: null, openPeriod: false, outcome: 'attached',
        });
      }
    });

    it('T9 (LB1E4): the same state but another amount → flagged extra-payment, no period, the order stays paid', () => {
      expect(decideOrderPayment(paid({ paidVia: 'manual', payosTotal: 0, payosCount: 0 }), pay({ amount: 100000 }))).toMatchObject({
        orderStatus: 'paid', reviewReason: 'extra-payment', openPeriod: false, outcome: 'flagged',
      });
    });

    it('T8 (LB1E7): paid through payOS, a second transfer of exactly the amount by webhook → a period that follows, outcome opened-period, the order stays paid', () => {
      expect(decideOrderPayment(paid(), pay())).toMatchObject({ orderStatus: 'paid', openPeriod: true, outcome: 'opened-period' });
    });

    it('T8 also when staff paid and a first payOS payment was already attached: the second one is a new purchase', () => {
      expect(decideOrderPayment(paid({ paidVia: 'manual', payosTotal: A, payosCount: 1 }), pay())).toMatchObject({ openPeriod: true, outcome: 'opened-period' });
    });

    it('T9 (LB1E8): paid, a payOS payment of another amount → flagged extra-payment, no period', () => {
      expect(decideOrderPayment(paid(), pay({ amount: 50000 }))).toMatchObject({
        orderStatus: 'paid', reviewReason: 'extra-payment', openPeriod: false, outcome: 'flagged',
      });
      expect(decideOrderPayment(paid(), pay({ amount: 398000, source: 'reconcile' }))).toMatchObject({ reviewReason: 'extra-payment', openPeriod: false });
    });

    it('T10 (LB1E14): paid, the reconcile job brings a payment whose key was not seen → flagged reconcile-mismatch, no second period', () => {
      expect(decideOrderPayment(paid(), pay({ source: 'reconcile' }))).toMatchObject({
        orderStatus: 'paid', reviewReason: 'reconcile-mismatch', openPeriod: false, outcome: 'flagged',
      });
    });

    // Review I2: payOS gave the return-page check and the webhook two different references for one transfer. The key then differs, so only the
    // amount and the moment tell the two apart from a second purchase.
    const TIME = '2026-11-05 10:02:00';
    it('I2: paid by the job, the webhook brings the same transfer (same amount, same time) under another reference → attached, no second period, no flag', () => {
      const state = paid({ paidVia: 'reconcile', payosTransfers: [{ amount: A, providerTime: TIME }] });
      expect(decideOrderPayment(state, pay({ source: 'webhook', providerTime: TIME }))).toMatchObject({
        orderStatus: 'paid', reviewReason: null, openPeriod: false, outcome: 'attached',
      });
    });

    it('I2 the other way round: paid by the webhook, the job lists the same transfer under another reference → attached, not a reconcile-mismatch flag', () => {
      const state = paid({ payosTransfers: [{ amount: A, providerTime: TIME }] });
      expect(decideOrderPayment(state, pay({ source: 'reconcile', providerTime: TIME }))).toMatchObject({
        reviewReason: null, openPeriod: false, outcome: 'attached',
      });
    });

    it('I2: a transfer of the same amount at another moment is still a second purchase (T8); so is one with no time on either side', () => {
      const state = paid({ payosTransfers: [{ amount: A, providerTime: TIME }] });
      expect(decideOrderPayment(state, pay({ providerTime: '2026-11-05 11:30:00' }))).toMatchObject({ openPeriod: true, outcome: 'opened-period' });
      expect(decideOrderPayment(state, pay({ providerTime: null }))).toMatchObject({ openPeriod: true, outcome: 'opened-period' });
      expect(decideOrderPayment(paid({ payosTransfers: [{ amount: A, providerTime: null }] }), pay({ providerTime: null }))).toMatchObject({ openPeriod: true });
    });

    it('a flag set before is not cleared by a payment that adds nothing (attached keeps the reason it had)', () => {
      expect(decideOrderPayment(paid({ paidVia: 'manual', payosTotal: 0, payosCount: 0, reviewReason: 'extra-payment' }), pay())).toMatchObject({
        reviewReason: 'extra-payment', outcome: 'attached',
      });
    });
  });

  it('never opens a period for money of a payment that did not make the total reach the amount, whatever the status', () => {
    const statuses: OrderStatus[] = ['pending', 'failed', 'expired', 'cancelled', 'needs_review', 'closed'];
    for (const status of statuses) {
      for (const amount of [1, A - 1, A + 1]) {
        expect(decideOrderPayment(order({ status, reviewReason: status === 'needs_review' ? 'amount-short' : null }), pay({ amount })).openPeriod, `${status} ${amount}`).toBe(false);
      }
    }
  });
});

describe('precheckPayment (design §3.4 "Kiểm trước")', () => {
  const link = 'link-1';
  const known = { paymentLinkId: link, environment: 'production' as const };
  const base = { success: true, code: '00', paymentLinkId: link, env: 'production' as const };

  it('passes a successful payment for a known order with the same link', () => {
    expect(precheckPayment(base, known)).toBeNull();
  });

  it('LB1E21: success false or a code other than 00 → not-success', () => {
    expect(precheckPayment({ ...base, success: false }, known)).toBe('not-success');
    expect(precheckPayment({ ...base, code: '01' }, known)).toBe('not-success');
    expect(precheckPayment({ ...base, code: '' }, known)).toBe('not-success');
  });

  it('LB1E20: no such order (payOS’s test webhook, orderCode 123) → unknown-order; so is an order of the other environment', () => {
    expect(precheckPayment(base, null)).toBe('unknown-order');
    expect(precheckPayment(base, { ...known, environment: 'sandbox' })).toBe('unknown-order');
  });

  it('LB1E21: a link id that is not the order’s → link-mismatch', () => {
    expect(precheckPayment({ ...base, paymentLinkId: 'another' }, known)).toBe('link-mismatch');
  });

  it('an order that never stored its link id (the create call failed on our side) cannot be compared, so the money is accepted', () => {
    expect(precheckPayment({ ...base, paymentLinkId: 'any' }, { ...known, paymentLinkId: null })).toBeNull();
  });

  it('not-success wins over unknown-order (a failed payment for an unknown order is just not a payment)', () => {
    expect(precheckPayment({ ...base, success: false }, null)).toBe('not-success');
  });
});

describe('parsePayosTime (ASSUMPTION P9: Vietnam time)', () => {
  const fallback = at('2026-11-05T03:02:07.000Z');

  it('reads YYYY-MM-DD HH:mm:ss as Vietnam time', () => {
    expect(parsePayosTime('2026-11-05 10:02:00', fallback).toISOString()).toBe('2026-11-05T03:02:00.000Z');
    expect(parsePayosTime('2026-01-01 00:00:00', fallback).toISOString()).toBe('2025-12-31T17:00:00.000Z');
  });

  it('falls back to the time of receipt when it is missing or not that shape', () => {
    for (const bad of [null, '', 'yesterday', '2026-11-05', '2026-13-45 99:99:99', '2026-11-05T10:02:00+07:00']) {
      expect(parsePayosTime(bad, fallback), String(bad)).toBe(fallback);
    }
  });
});

describe('decideManualConfirm — T11 to T14', () => {
  it('T11: no period, not closed, learner there → paid by hand, a period opens', () => {
    for (const status of ['pending', 'failed', 'expired', 'cancelled', 'needs_review'] as const) {
      const decision = decideManualConfirm(order({ status, reviewReason: status === 'needs_review' ? 'amount-over' : null }));
      expect(decision, status).toMatchObject({ orderStatus: 'paid', reviewReason: null, paidVia: 'manual', openPeriod: true, outcome: 'opened-period' });
      expect(decision, status).not.toHaveProperty('error');
    }
  });

  it('T12 (LB1E5, LB1E6): an order that already has a period → 409 order-already-paid, nothing else', () => {
    expect(decideManualConfirm(paid())).toMatchObject({ error: '409-order-already-paid', openPeriod: false, outcome: 'ignored' });
    expect(decideManualConfirm(paid({ paidVia: 'manual' }))).toMatchObject({ error: '409-order-already-paid' });
  });

  it('T13: a closed order → 409 order-closed', () => {
    expect(decideManualConfirm(order({ status: 'closed' }))).toMatchObject({ error: '409-order-closed', openPeriod: false });
  });

  it('T14 (LB1E40): the learner is deleted or going → 409 account-deleted or account-deleting', () => {
    expect(decideManualConfirm(order({ account: 'deleted' }))).toMatchObject({ error: '409-account-deleted' });
    expect(decideManualConfirm(order({ account: 'deleting' }))).toMatchObject({ error: '409-account-deleting' });
    expect(decideManualConfirm(order({ status: 'needs_review', reviewReason: 'account-deleted', account: 'deleted' }))).toMatchObject({ error: '409-account-deleted' });
  });

  it('closed beats already paid beats the account (a fixed order for the refusals)', () => {
    expect(decideManualConfirm(order({ status: 'closed', account: 'deleted' }))).toMatchObject({ error: '409-order-closed' });
    expect(decideManualConfirm(paid({ account: 'deleted' }))).toMatchObject({ error: '409-order-already-paid' });
  });
});
