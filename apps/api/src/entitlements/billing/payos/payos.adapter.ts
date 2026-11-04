import { Inject, Injectable, Optional, type OnModuleInit } from '@nestjs/common';
import { NotFoundError, PayOS } from '@payos/node';
import { APP_CONFIG, type AppConfig } from '../../../common/config/app-config.js';
import { AppLogger } from '../../../common/logging/app-logger.js';
import { PAYOS_SDK_TIMEOUT_MS } from '../../entitlements.constants.js';
import { expiredAtSeconds } from '../../orders/order-codes.js';
import { BillingAdapter, CHECKOUT_STATUSES, type BillingRequest, type CheckoutOrder, type CheckoutState, type ParsedEvent, type Payer } from '../billing-adapter.js';
import { BillingAdapterRegistry } from '../billing-adapter.registry.js';
import { verifyPayosBody, toParsedEvent } from './payos-wire.js';

/** Nest token of the SDK client: null unless `PAYOS_*` are set (real mode). */
export const PAYOS_CLIENT = 'PAYOS_CLIENT';

/**
 * The SDK client (launch prep B design §3.3): a 4 s timeout, because the SDK aborts the real HTTP call where `callAdapter` only
 * stops waiting for it; no automatic retry, because creating a link twice is what the order code must prevent; no SDK logging.
 */
export function createPayosClient(payos: AppConfig['payos']): PayOS {
  return new PayOS({
    clientId: payos.clientId ?? '', apiKey: payos.apiKey ?? '', checksumKey: payos.checksumKey ?? '',
    timeout: PAYOS_SDK_TIMEOUT_MS, maxRetries: 0, logLevel: 'off',
  });
}

const isKnownStatus = (status: string): status is CheckoutState['status'] => (CHECKOUT_STATUSES as readonly string[]).includes(status);

/** Null when the bank sent no payer field at all. */
function payerOf(transaction: { counterAccountName: string | null; counterAccountNumber: string | null; counterAccountBankName: string | null }): Payer | null {
  const payer = {
    counterAccountName: transaction.counterAccountName || null,
    counterAccountNumber: transaction.counterAccountNumber || null,
    counterAccountBankName: transaction.counterAccountBankName || null,
  };
  return payer.counterAccountName === null && payer.counterAccountNumber === null && payer.counterAccountBankName === null ? null : payer;
}

/**
 * payOS, the real one (launch prep B design §3.3). It registers as "payos" with environment `production` only when all three
 * `PAYOS_*` keys are set. It never reads the database: `verify` checks the signature and hands back the event, and the applier
 * finds the order and the learner under lock. Every call here is made by a caller that holds no lock (R6).
 */
@Injectable()
export class PayosAdapter extends BillingAdapter implements OnModuleInit {
  readonly provider = 'payos';

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PAYOS_CLIENT) private readonly client: PayOS | null,
    @Inject(BillingAdapterRegistry) private readonly registry: BillingAdapterRegistry,
    @Optional() @Inject(AppLogger) private readonly logger?: AppLogger,
  ) {
    super();
  }

  onModuleInit(): void {
    if (this.config.payos.mode === 'real' && this.client !== null) this.registry.register(this);
  }

  async verify(req: BillingRequest): Promise<{ ok: true; events: ParsedEvent[]; skipped: number } | { ok: false }> {
    const key = this.config.payos.checksumKey;
    if (key === null) return { ok: false };
    const verified = verifyPayosBody(req.rawBody, key);
    if (!verified.ok) return { ok: false };
    // Signed but with no usable order code or reference: acked and counted, since only a wrong signature may be refused.
    const event = toParsedEvent(verified.body, 'production');
    return event === null ? { ok: true, events: [], skipped: 1 } : { ok: true, events: [event], skipped: 0 };
  }

  ack(result: { received: number }): { status: number; body: unknown } {
    return { status: 200, body: { received: result.received } };
  }

  async createCheckout(order: CheckoutOrder): Promise<{ paymentLinkId: string; checkoutUrl: string }> {
    // Nothing about the buyer, no items, no invoice: payOS's page collects what it needs (design §3.12).
    const created = await this.sdk().paymentRequests.create({
      orderCode: order.orderCode,
      amount: order.amount,
      description: order.description,
      returnUrl: order.returnUrl,
      cancelUrl: order.cancelUrl,
      expiredAt: expiredAtSeconds(order.expiresAt),
    });
    return { paymentLinkId: created.paymentLinkId, checkoutUrl: created.checkoutUrl };
  }

  async getCheckout(orderCode: number): Promise<CheckoutState | null> {
    let link;
    try {
      link = await this.sdk().paymentRequests.get(orderCode);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
    let status: CheckoutState['status'];
    if (isKnownStatus(link.status)) {
      status = link.status;
    } else {
      // The job treats PROCESSING as "ask again later" (design §3.6); the warning says payOS added a status.
      this.logger?.warn('payos_unknown_status', { status: link.status });
      status = 'PROCESSING';
    }
    return {
      status,
      amount: link.amount,
      amountPaid: link.amountPaid,
      transactions: link.transactions.map((transaction) => ({
        reference: transaction.reference,
        amount: transaction.amount,
        transactionDateTime: transaction.transactionDateTime,
        payer: payerOf(transaction),
      })),
    };
  }

  async cancelCheckout(orderCode: number): Promise<void> {
    await this.sdk().paymentRequests.cancel(orderCode);
  }

  private sdk(): PayOS {
    if (this.client === null) throw new Error('payOS is not configured');
    return this.client;
  }
}
