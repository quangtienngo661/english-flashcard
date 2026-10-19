// The fake provider's wire format (design §9.1): HMAC-SHA256 over the raw body, a JSON batch of events in snake_case.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Interval } from '../../entitlements.types.js';
import type { BillingRequest, ParsedEvent } from '../billing-adapter.js';
import { EVENT_TYPES, type EventType, type NormalizedEvent } from '../billing.types.js';

export const FAKE_SIGNATURE_HEADER = 'x-fake-signature';

const LOWER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function fakeSign(secret: Buffer, body: Buffer): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

export function fakeVerifySignature(secret: Buffer, body: Buffer, header: string | undefined): boolean {
  if (header === undefined) return false;
  const expected = Buffer.from(fakeSign(secret, body));
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** POST: the raw body and the `X-Fake-Signature` header. GET: query `payload` (base64url of the same JSON) and `signature`. */
export function fakeReadRequest(req: BillingRequest): { body: Buffer; signature: string | undefined } | null {
  if (req.method === 'POST') {
    const header = req.headers[FAKE_SIGNATURE_HEADER];
    return { body: req.rawBody, signature: typeof header === 'string' ? header : undefined };
  }
  const { payload, signature } = req.query;
  if (typeof payload !== 'string') return null;
  return { body: Buffer.from(payload, 'base64url'), signature: typeof signature === 'string' ? signature : undefined };
}

/**
 * `{ "events": [ … ] }` → parsed events. Null only when the body is not that shape. An entry of an unknown type, or without
 * the id, environment, subscription id or occurred_at that storing it needs, is skipped and counted.
 */
export function fakeParse(body: Buffer): { events: ParsedEvent[]; skipped: number } | null {
  let json: unknown;
  try {
    json = JSON.parse(body.toString('utf8'));
  } catch {
    return null;
  }
  if (!isRecord(json) || !Array.isArray(json.events)) return null;
  const events: ParsedEvent[] = [];
  let skipped = 0;
  for (const entry of json.events) {
    const parsed = parseEntry(entry);
    if (parsed === null) skipped += 1;
    else events.push(parsed);
  }
  return { events, skipped };
}

function parseEntry(entry: unknown): ParsedEvent | null {
  if (!isRecord(entry) || !isEventType(entry.type)) return null;
  const type = entry.type;
  const externalEventId = text(entry.id);
  const environment = entry.environment === 'sandbox' || entry.environment === 'production' ? entry.environment : null;
  const externalSubscriptionId = text(entry.subscription_id);
  const occurredAt = date(entry.occurred_at);
  if (externalEventId === null || environment === null || externalSubscriptionId === null || occurredAt === null) return null;

  const appUserId = typeof entry.app_user_id === 'string' && LOWER_UUID.test(entry.app_user_id) ? entry.app_user_id : null;
  const missing: string[] = [];
  const fields = typeFields(type, entry, missing);
  const common = { provider: 'fake', environment, externalEventId, externalSubscriptionId, appUserId, occurredAt };
  return {
    externalEventId,
    type,
    environment,
    externalSubscriptionId,
    appUserId,
    occurredAt,
    transactionId: text(entry.transaction_id),
    event: missing.length === 0 ? ({ ...common, type, ...fields } as NormalizedEvent) : null,
    missing,
    raw: entry,
  };
}

/** The §9.3 "thêm bắt buộc" fields of one type, camelCase; each missing or malformed one is pushed to `missing`. */
function typeFields(type: EventType, entry: Record<string, unknown>, missing: string[]): Record<string, unknown> {
  const need = <T>(name: string, value: T | null): T | null => {
    if (value === null) missing.push(name);
    return value;
  };
  const optionalDate = (name: string, value: unknown): Date | null =>
    value === undefined || value === null ? null : need(name, date(value));
  const period = () => ({
    interval: need('interval', interval(entry.interval)),
    currentPeriodStart: need('currentPeriodStart', date(entry.current_period_start)),
    currentPeriodEnd: need('currentPeriodEnd', date(entry.current_period_end)),
  });
  const transactionId = () => need('transactionId', text(entry.transaction_id));

  switch (type) {
    case 'subscription_started': {
      const fields = period();
      const trialEndsAt = optionalDate('trialEndsAt', entry.trial_ends_at);
      return {
        ...fields,
        trialEndsAt,
        paymentFingerprint: text(entry.payment_fingerprint),
        // D37: a start without a trial is a charge, so it must name its transaction.
        transactionId: trialEndsAt === null ? transactionId() : text(entry.transaction_id),
      };
    }
    case 'renewed':
    case 'plan_changed':
      return { transactionId: transactionId(), ...period() };
    case 'renewal_failed':
      return { graceEndsAt: optionalDate('graceEndsAt', entry.grace_ends_at) };
    case 'refunded':
      return {
        transactionId: transactionId(),
        amount: typeof entry.amount === 'number' && Number.isFinite(entry.amount) ? entry.amount : null,
      };
    case 'refund_reversed':
      return { transactionId: transactionId() };
    case 'plan_change_scheduled':
      return { interval: need('interval', interval(entry.interval)) };
    default:
      return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function date(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

function interval(value: unknown): Interval | null {
  return value === 'month' || value === 'year' ? value : null;
}
