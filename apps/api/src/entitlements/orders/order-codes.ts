import type { BillingEnvironment } from '../entitlements.types.js';

// Order identities (launch prep B design §3.4, §3.5). Pure: no clock, no database.

/** `billing_order_code_seq` starts here, so payOS's test webhook (orderCode 123) never matches a real order. */
export const ORDER_CODE_MIN = 1_000_000_000;
/** 32^7 − 1: the largest code whose description still fits 'WM' + 7 base32 characters; below Number.MAX_SAFE_INTEGER. */
export const ORDER_CODE_MAX = 34_359_738_367;

// Crockford base32: no I, L, O, U, so a payer reading the transfer note aloud cannot confuse characters.
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** The text the payer types into the bank transfer: 'WM' + the order code in 7 base32 Crockford characters, zero-padded. */
export function orderDescription(orderCode: number): string {
  if (!Number.isSafeInteger(orderCode) || orderCode < ORDER_CODE_MIN || orderCode > ORDER_CODE_MAX) {
    throw new RangeError(`order code out of range: ${orderCode}`);
  }
  let rest = orderCode;
  let digits = '';
  for (let i = 0; i < 7; i++) {
    digits = CROCKFORD[rest % 32] + digits;
    rest = Math.floor(rest / 32);
  }
  return `WM${digits}`;
}

/** payOS wants `expiredAt` in whole seconds. */
export function expiredAtSeconds(expiresAt: Date): number {
  return Math.floor(expiresAt.getTime() / 1000);
}

/** The identity of money that came through payOS (webhook or reconcile job); also the inbox `dedupe_key` (design §3.4). */
export function paymentKeyPayos(environment: BillingEnvironment, orderCode: number, reference: string): string {
  return `payos:${environment}:${orderCode}:${reference}`;
}

/** The identity of a staff confirmation: at most one per order. */
export function paymentKeyManual(orderId: string): string {
  return `manual:${orderId}`;
}
