import { timingSafeEqual } from 'node:crypto';
import type { BillingEnvironment } from '../../entitlements.types.js';
import type { ParsedEvent } from '../billing-adapter.js';
import type { OrderPaymentPayload } from '../billing.types.js';
import { signPayosData } from './payos-signature.js';

// payOS's webhook body and what Wordmet keeps of it (launch prep B design §3.3, §3.12).

/**
 * The body payOS POSTs. Only `data` is signed, so every field is untrusted until `verifyPayosBody` has passed, and the
 * top-level `success` and `code` are read by the applier, not here (design §3.4).
 */
export type PayosWebhook = {
  code?: unknown;
  desc?: unknown;
  success?: unknown;
  data: Record<string, unknown>;
  signature: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The raw bytes → the parsed body, when its signature is right. `ok: false` for anything that is not a payOS body with a
 * signature that matches `data` under the Checksum Key: not JSON, no `data` object, no signature, a signature of another
 * length, or an empty key (an unset key must never accept a body signed with the empty key). The two signatures are
 * compared in constant time.
 */
export function verifyPayosBody(rawBody: Buffer, checksumKey: string): { ok: true; body: PayosWebhook } | { ok: false } {
  if (checksumKey.length === 0) return { ok: false };
  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return { ok: false };
  }
  if (!isRecord(json) || !isRecord(json.data) || typeof json.signature !== 'string' || json.signature === '') return { ok: false };
  const expected = Buffer.from(signPayosData(json.data, checksumKey));
  const given = Buffer.from(json.signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false };
  return { ok: true, body: json as PayosWebhook };
}

/** The fields `raw` never keeps: who sent the money and which virtual account it went through (design §3.12). */
const PERSONAL_FIELD = /^(counterAccount|virtualAccount)/;

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);

/**
 * A verified body → the event the inbox stores. The event is the payment `<orderCode>:<reference>`, with no user and no
 * subscription: the applier finds the order, and through it the learner, under lock. Null when the body has no usable
 * order code or reference, since the inbox cannot dedupe it (the adapter counts it as skipped). `event` is null, with the
 * missing names, when the amount or the link id is missing, which the applier ignores as `missing-fields`.
 * `raw` is the body without the payer's and the virtual account's fields; `payload.payer` lives only until the applier has used it.
 */
export function toParsedEvent(body: PayosWebhook, environment: BillingEnvironment, receivedAt: Date = new Date()): ParsedEvent | null {
  const { orderCode, reference, amount, paymentLinkId } = body.data;
  if (typeof orderCode !== 'number' || !Number.isSafeInteger(orderCode) || typeof reference !== 'string' || reference === '') return null;
  const missing: string[] = [];
  if (typeof amount !== 'number' || !Number.isFinite(amount)) missing.push('amount');
  if (typeof paymentLinkId !== 'string' || paymentLinkId === '') missing.push('paymentLinkId');
  const identity = `${orderCode}:${reference}`;
  const payload: OrderPaymentPayload | null = missing.length > 0 ? null : {
    orderCode,
    paymentLinkId: paymentLinkId as string,
    amount: amount as number,
    reference,
    transactionDateTime: text(body.data.transactionDateTime),
    source: 'webhook',
    success: body.success === true,
    code: typeof body.data.code === 'string' ? body.data.code : '',
    payer: {
      counterAccountName: text(body.data.counterAccountName),
      counterAccountNumber: text(body.data.counterAccountNumber),
      counterAccountBankName: text(body.data.counterAccountBankName),
    },
  };
  return {
    externalEventId: identity,
    type: 'payment_succeeded',
    environment,
    externalSubscriptionId: null,
    appUserId: null,
    occurredAt: receivedAt,
    transactionId: identity,
    event: payload,
    missing,
    raw: { ...body, data: Object.fromEntries(Object.entries(body.data).filter(([key]) => !PERSONAL_FIELD.test(key))) },
  };
}
