import type { BillingEnvironment } from '../entitlements.types.js';
import type { EventType, FetchedState, NormalizedEvent, OrderEventType, OrderPaymentPayload } from './billing.types.js';

/** What a webhook route hands an adapter: the exact bytes received, before any JSON parsing (R16). */
export type BillingRequest = {
  method: 'GET' | 'POST';
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  rawBody: Buffer;
};

/**
 * One signed provider event. `event` is null when a §9.3 field is missing (`missing` names them); `appUserId` is null unless
 * the value is a lower-case uuid, so a garbage id ends as "unknown user", never as a database error. A one-time payment
 * (`OrderEventType`) has no subscription and no user in the message: the applier finds the order and the learner under lock.
 */
export type ParsedEvent = {
  externalEventId: string;
  type: EventType | OrderEventType;
  environment: BillingEnvironment;
  externalSubscriptionId: string | null;
  appUserId: string | null;
  occurredAt: Date;
  transactionId: string | null;
  event: NormalizedEvent | OrderPaymentPayload | null;
  missing: string[];
  raw: unknown;
};

/** Who sent the money, as the bank tells payOS (design §3.12). Personal data: never logged, kept only as long as a refund needs it. */
export type Payer = { counterAccountName: string | null; counterAccountNumber: string | null; counterAccountBankName: string | null };

/** What a provider needs to open a one-time payment link (launch prep B design §3.3). */
export type CheckoutOrder = {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  expiresAt: Date;
};

export const CHECKOUT_STATUSES = ['PENDING', 'CANCELLED', 'UNDERPAID', 'PAID', 'EXPIRED', 'PROCESSING', 'FAILED'] as const;

/** The provider's own view of a payment link: the SDK's `PaymentLink` without what Wordmet does not use. */
export type CheckoutState = {
  status: (typeof CHECKOUT_STATUSES)[number];
  amount: number;
  amountPaid: number;
  transactions: Array<{ reference: string; amount: number; transactionDateTime: string; payer: Payer | null }>;
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
  // One-time payments (payOS). MoMo would use `createCheckout` to open the first charge link and `verify` for the charges after it.
  createCheckout?(order: CheckoutOrder): Promise<{ paymentLinkId: string; checkoutUrl: string }>;
  /** Null when the provider has no such link. */
  getCheckout?(orderCode: number): Promise<CheckoutState | null>;
  cancelCheckout?(orderCode: number): Promise<void>;
}

/** `billing_events.dedupe_key` (design §9.2 step 2). */
export function dedupeKey(provider: string, environment: BillingEnvironment, externalEventId: string): string {
  return `${provider}:${environment}:${externalEventId}`;
}
