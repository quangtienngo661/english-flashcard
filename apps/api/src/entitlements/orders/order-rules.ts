// What happens to an order when money arrives or staff confirm it (launch prep B design §3.4, T1–T14). Pure: no clock, no database.

export type OrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed' | 'needs_review' | 'closed';
export type ReviewReason =
  | 'amount-short' | 'amount-over' | 'late-payment' | 'account-deleted' | 'extra-payment' | 'reconcile-mismatch' | 'provider-mismatch';
export type PaidVia = 'webhook' | 'reconcile' | 'manual';
export type PaymentOutcome = 'opened-period' | 'attached' | 'counted' | 'flagged' | 'refund-needed';
export type ManualRefusal = '409-order-already-paid' | '409-order-closed' | '409-account-deleted' | '409-account-deleting';

/** A payment may arrive this long after the link expired and still count as on time (design §3.4). */
export const LATE_PAYMENT_GRACE_MS = 10 * 60_000;

export type OrderState = {
  status: OrderStatus;
  /** `needs_review`: why. On a paid order: the flag staff have to look at. */
  reviewReason: ReviewReason | null;
  /** Null until the first period opens: the order "has a period" exactly when this is set (a deleted account's periods are gone, its order is not). */
  paidVia: PaidVia | null;
  /** The amount A of the order, in dong. */
  amount: number;
  expiresAt: Date;
  /** The payments through payOS already counted for the order (not staff confirmations), their sum S and their number. */
  payosTotal: number;
  payosCount: number;
  /** Each of those payments: its amount and the moment payOS gave for it (null when it gave none). */
  payosTransfers: Array<{ amount: number; providerTime: string | null }>;
  /** `deleted`: the order's user is not in `users` any more (the order was anonymised). */
  account: 'active' | 'deleting' | 'deleted';
};

export type IncomingPayment = {
  source: 'webhook' | 'reconcile';
  amount: number;
  /** When the transfer happened: payOS's own time, or the time of receipt when it could not be read. */
  at: Date;
  /** The moment as payOS wrote it, or null: with the amount, what tells one transfer from another when the references differ. */
  providerTime: string | null;
};

export type Decision = {
  orderStatus: OrderStatus;
  /** The value to store: the reason of `needs_review`, or the flag of a paid order (kept as it was when this payment adds none). */
  reviewReason: ReviewReason | null;
  paidVia: PaidVia | null;
  openPeriod: boolean;
  outcome: PaymentOutcome | 'ignored';
  /** T1: copy the payer's three fields onto the order, for a refund. */
  saveRefundInfo: boolean;
  /** Set only by `decideManualConfirm` when staff may not confirm. */
  error?: ManualRefusal;
};

const hasPeriod = (state: OrderState) => state.paidVia !== null;

const same = (state: OrderState): Decision => ({
  orderStatus: state.status, reviewReason: state.reviewReason, paidVia: state.paidVia, openPeriod: false, outcome: 'counted', saveRefundInfo: false,
});

/**
 * One payment through payOS, decided by the table of design §3.4. `payment.amount` is this payment alone; the total S the rules
 * compare with the amount is `state.payosTotal + payment.amount`.
 */
export function decideOrderPayment(state: OrderState, payment: IncomingPayment): Decision {
  const keep = same(state);

  // T1: the learner is gone or going. No period, whatever else is true; the money needs a refund.
  if (state.account !== 'active') {
    return hasPeriod(state)
      ? { ...keep, reviewReason: 'account-deleted', outcome: 'refund-needed', saveRefundInfo: true }
      : { ...keep, orderStatus: 'needs_review', reviewReason: 'account-deleted', outcome: 'refund-needed', saveRefundInfo: true };
  }

  // T6: staff closed the order, and money still arrives. It goes back to waiting for staff.
  if (state.status === 'closed') return { ...keep, orderStatus: 'needs_review', reviewReason: 'extra-payment' };

  if (hasPeriod(state)) {
    // T7: staff confirmed first, and this is the same transfer arriving through payOS. Attach it; no second period.
    if (state.paidVia === 'manual' && state.payosCount === 0 && payment.amount === state.amount) return { ...keep, outcome: 'attached' };
    // Review I2: the same transfer under another reference (payOS gave the webhook and the job two): same amount, same moment. Already counted.
    if (payment.providerTime !== null && state.payosTransfers.some((t) => t.amount === payment.amount && t.providerTime === payment.providerTime)) {
      return { ...keep, outcome: 'attached' };
    }
    // T9: not the amount of the order, so not a second purchase: a flag for staff.
    if (payment.amount !== state.amount) return { ...keep, reviewReason: 'extra-payment', outcome: 'flagged' };
    // T8: a second transfer of the exact amount, by webhook, is a new purchase: a period that follows the last.
    if (payment.source === 'webhook') return { ...keep, openPeriod: true, outcome: 'opened-period' };
    // T10: the reconcile job found a payment whose key the webhook did not use; never a second period.
    return { ...keep, reviewReason: 'reconcile-mismatch', outcome: 'flagged' };
  }

  // No period yet: T2–T5 by the total.
  const total = state.payosTotal + payment.amount;
  if (total < state.amount) return { ...keep, orderStatus: 'needs_review', reviewReason: 'amount-short' };
  if (total > state.amount) return { ...keep, orderStatus: 'needs_review', reviewReason: 'amount-over' };
  const onTime = state.status === 'pending'
    || (state.status === 'needs_review' && state.reviewReason === 'amount-short')
    || payment.at.getTime() <= state.expiresAt.getTime() + LATE_PAYMENT_GRACE_MS;
  return onTime
    ? { ...keep, orderStatus: 'paid', reviewReason: null, paidVia: payment.source, openPeriod: true, outcome: 'opened-period' }
    : { ...keep, orderStatus: 'needs_review', reviewReason: 'late-payment' };
}

/**
 * Staff press "Đã nhận tiền" (T11–T14). The refusals come in a fixed order: closed, then already has a period, then the learner is gone.
 * Allowed: the order has no period, is not closed, and the learner is there.
 */
export function decideManualConfirm(state: OrderState): Decision {
  const refuse = (error: ManualRefusal): Decision => ({ ...same(state), outcome: 'ignored', error });
  if (state.status === 'closed') return refuse('409-order-closed');
  if (hasPeriod(state)) return refuse('409-order-already-paid');
  if (state.account === 'deleted') return refuse('409-account-deleted');
  if (state.account === 'deleting') return refuse('409-account-deleting');
  return { ...same(state), orderStatus: 'paid', reviewReason: null, paidVia: 'manual', openPeriod: true, outcome: 'opened-period' };
}

/**
 * What to check before a payment counts at all (design §3.4 "Kiểm trước"): `not-success` when payOS did not say success with code
 * 00, `unknown-order` when no order of this environment has the code, `link-mismatch` when the order's link is another. An order
 * that never stored its link id cannot be compared, so its money is accepted. Null: go on.
 */
export function precheckPayment(
  payment: { success: boolean; code: string; paymentLinkId: string; env: 'sandbox' | 'production' },
  order: { paymentLinkId: string | null; environment: 'sandbox' | 'production' } | null,
): 'not-success' | 'unknown-order' | 'link-mismatch' | null {
  if (!payment.success || payment.code !== '00') return 'not-success';
  if (order === null || order.environment !== payment.env) return 'unknown-order';
  if (order.paymentLinkId !== null && order.paymentLinkId !== payment.paymentLinkId) return 'link-mismatch';
  return null;
}

const PAYOS_TIME = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

/** payOS writes `transactionDateTime` as `YYYY-MM-DD HH:mm:ss` with no zone: Vietnam time (ASSUMPTION P9). Anything else → `fallback`. */
export function parsePayosTime(text: string | null, fallback: Date): Date {
  const match = text === null ? null : PAYOS_TIME.exec(text);
  if (match === null) return fallback;
  const parsed = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+07:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}
