import type { BillingEnvironment } from '../entitlements.types.js';

// Order identities (launch prep B design §3.4, §3.5). Pure: no clock, no database.

/** `billing_order_code_seq` starts here, so payOS's test webhook (orderCode 123) never matches a real order. */
export const ORDER_CODE_MIN = 1_000_000_000;
/** 32^7 − 1: the largest code whose description still fits 'WM' + 7 base32 characters; below Number.MAX_SAFE_INTEGER. */
export const ORDER_CODE_MAX = 34_359_738_367;

// Time-based order codes (restore-safety). A database restored from backup rolls a sequence back and would reuse
// codes that payOS already knows; a code derived from the clock never goes back.
// R1: every time-based code is >= ORDER_CODE_TIME_BASE, above every code the old sequence can have issued, so the
//     two schemes never collide.
// R2: at most ORDER_CODES_PER_SECOND codes per second (slots 0..99); the caller picks a free slot, these functions
//     only map (second, slot) to a code and never read the clock.

/** First time-based code; above the old `billing_order_code_seq` range. */
export const ORDER_CODE_TIME_BASE = 1_100_000_000;
/** The instant second 0 starts: 2026-11-17T00:00:00Z. */
export const ORDER_CODE_EPOCH_MS = Date.UTC(2026, 10, 17);
/** Slots per second (R2). */
export const ORDER_CODES_PER_SECOND = 100;

/** Whole seconds from ORDER_CODE_EPOCH_MS to `at`, rounded down. */
export function orderCodeSecond(at: Date): number {
  return Math.floor((at.getTime() - ORDER_CODE_EPOCH_MS) / 1000);
}

/** The code for `slot` (0..99) of `second`. A second is usable only when all its slots fit under ORDER_CODE_MAX. */
export function orderCodeAt(second: number, slot: number): number {
  const lastSecond = Math.floor((ORDER_CODE_MAX - ORDER_CODE_TIME_BASE - (ORDER_CODES_PER_SECOND - 1)) / ORDER_CODES_PER_SECOND);
  if (!Number.isInteger(second) || second < 0 || second > lastSecond) {
    throw new RangeError(`order code second out of range: ${second}`);
  }
  if (!Number.isInteger(slot) || slot < 0 || slot >= ORDER_CODES_PER_SECOND) {
    throw new RangeError(`order code slot out of range: ${slot}`);
  }
  return ORDER_CODE_TIME_BASE + second * ORDER_CODES_PER_SECOND + slot;
}

/** The first and last code of `second` (slots 0 and 99). */
export function orderCodeSlots(second: number): { first: number; last: number } {
  return { first: orderCodeAt(second, 0), last: orderCodeAt(second, ORDER_CODES_PER_SECOND - 1) };
}

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
