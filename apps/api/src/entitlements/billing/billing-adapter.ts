import type { BillingEnvironment } from '../entitlements.types.js';
import type { EventType, FetchedState, NormalizedEvent } from './billing.types.js';

/** What a webhook route hands an adapter: the exact bytes received, before any JSON parsing (R16). */
export type BillingRequest = {
  method: 'GET' | 'POST';
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  rawBody: Buffer;
};

/**
 * One signed provider event. `event` is null when a §9.3 field is missing (`missing` names them); `appUserId` is null unless
 * the value is a lower-case uuid, so a garbage id ends as "unknown user", never as a database error.
 */
export type ParsedEvent = {
  externalEventId: string;
  type: EventType;
  environment: BillingEnvironment;
  externalSubscriptionId: string;
  appUserId: string | null;
  occurredAt: Date;
  transactionId: string | null;
  event: NormalizedEvent | null;
  missing: string[];
  raw: unknown;
};

/**
 * One provider (design §9.1). `verify` returns `ok: false` only for a wrong signature; a signed entry of a type Wordmet does
 * not use is counted in `skipped` and still acked, since providers resend anything that gets a 4xx. The three optional
 * methods exist only where the provider supports them; callers never hold a lock while calling one (R6).
 */
export abstract class BillingAdapter {
  abstract readonly provider: string;
  abstract verify(req: BillingRequest): Promise<{ ok: true; events: ParsedEvent[]; skipped: number } | { ok: false }>;
  abstract ack(result: { received: number }): { status: number; body?: unknown };
  fetchState?(externalSubscriptionId: string): Promise<FetchedState | null>;
  endTrialNow?(externalSubscriptionId: string): Promise<void>;
  cancelAtPeriodEnd?(externalSubscriptionId: string): Promise<void>;
}

/** `billing_events.dedupe_key` (design §9.2 step 2). */
export function dedupeKey(provider: string, environment: BillingEnvironment, externalEventId: string): string {
  return `${provider}:${environment}:${externalEventId}`;
}
