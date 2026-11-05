import { Inject, Injectable, Optional, type OnModuleInit } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { Clock } from '../../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../../common/db/prisma.module.js';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { ORDER_CODE_MAX, ORDER_CODE_MIN, orderDescription } from '../../orders/order-codes.js';
import { BillingAdapter, CHECKOUT_STATUSES, type BillingRequest, type CheckoutOrder, type CheckoutState, type ParsedEvent, type Payer } from '../billing-adapter.js';
import { BillingAdapterRegistry } from '../billing-adapter.registry.js';
import { BILLING_APPLY_PORT, BillingInbox, type BillingApplyPort } from '../billing-inbox.service.js';
import { signPayosData } from './payos-signature.js';
import { toParsedEvent, verifyPayosBody } from './payos-wire.js';

type FakeTransaction = { reference: string; amount: number; transactionDateTime: string; payer: Payer };

/** One fake payment link, as the page and `getCheckout` see it. */
export type FakeLink = {
  orderCode: number;
  paymentLinkId: string;
  amount: number;
  status: CheckoutState['status'];
  expiresAt: Date;
  returnUrl: string;
  cancelUrl: string;
  transactions: FakeTransaction[];
};

const FAKE_PAYER: Payer = { counterAccountName: 'NGUYEN VAN FAKE', counterAccountNumber: '0000000001', counterAccountBankName: 'Fake Bank' };

/** payOS writes `transactionDateTime` as `YYYY-MM-DD HH:mm:ss` in Vietnam time (ASSUMPTION P9). */
function vietnamTime(at: Date): string {
  return new Date(at.getTime() + 7 * 3_600_000).toISOString().slice(0, 19).replace('T', ' ');
}

const sum = (transactions: FakeTransaction[]) => transactions.reduce((total, tx) => total + tx.amount, 0);

/**
 * payOS, the fake (launch prep B design §3.3): payOS has no sandbox, so tests, the smoke and the owner's local runs use this.
 * It registers as "payos" with environment `sandbox` only in fake mode, keeps the provider's side of each link in
 * `fake_payos_links` (so the worker's `getCheckout` sees what the API's page wrote), and signs its webhooks with the key from
 * `BILLING_FAKE_SECRET`. A payment is stored and **applied before `pay` returns**, so tests are deterministic; a real webhook
 * arrives seconds later.
 */
@Injectable()
export class FakePayosAdapter extends BillingAdapter implements OnModuleInit {
  readonly provider = 'payos';

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(BillingAdapterRegistry) private readonly registry: BillingAdapterRegistry,
    @Optional() @Inject(BillingInbox) private readonly inbox?: BillingInbox,
    @Optional() @Inject(BILLING_APPLY_PORT) private readonly applier?: BillingApplyPort,
  ) {
    super();
  }

  onModuleInit(): void {
    if (this.config.payos.mode === 'fake') this.registry.register(this);
  }

  /** The "checksum key" of the fake: the fake billing secret, as text. Null when it is not set (config refuses to start then). */
  private checksumKey(): string | null {
    return this.config.billing.fakeSecret?.toString('hex') ?? null;
  }

  async verify(req: BillingRequest): Promise<{ ok: true; events: ParsedEvent[]; skipped: number } | { ok: false }> {
    const key = this.checksumKey();
    if (key === null) return { ok: false };
    const verified = verifyPayosBody(req.rawBody, key);
    if (!verified.ok) return { ok: false };
    const event = toParsedEvent(verified.body, 'sandbox', this.clock.now());
    return event === null ? { ok: true, events: [], skipped: 1 } : { ok: true, events: [event], skipped: 0 };
  }

  ack(result: { received: number }): { status: number; body: unknown } {
    return { status: 200, body: { received: result.received } };
  }

  async createCheckout(order: CheckoutOrder): Promise<{ paymentLinkId: string; checkoutUrl: string }> {
    const paymentLinkId = `fake-link-${randomUUID()}`;
    await this.prisma.fakePayosLink.create({
      data: {
        orderCode: BigInt(order.orderCode), paymentLinkId, amount: order.amount, status: 'PENDING', expiresAt: order.expiresAt,
        returnUrl: order.returnUrl, cancelUrl: order.cancelUrl, transactions: [],
      },
    });
    // The page is on the API; PROBLEM_TYPE_BASE is the one setting that says where the API is reached from outside.
    const origin = new URL(this.config.problemTypeBase).origin;
    return { paymentLinkId, checkoutUrl: `${origin}/v1/dev/payos/checkout?order=${order.orderCode}` };
  }

  async getCheckout(orderCode: number): Promise<CheckoutState | null> {
    const link = await this.link(orderCode);
    if (link === null) return null;
    return {
      status: link.status,
      amount: link.amount,
      amountPaid: sum(link.transactions),
      transactions: link.transactions.map((tx) => ({ reference: tx.reference, amount: tx.amount, transactionDateTime: tx.transactionDateTime, payer: tx.payer })),
    };
  }

  async cancelCheckout(orderCode: number): Promise<void> {
    const link = await this.link(orderCode);
    if (link === null) throw new Error('fake payos: no such link');
    if (link.status === 'PAID') throw new Error('fake payos: a paid link cannot be cancelled');
    await this.prisma.fakePayosLink.update({ where: { orderCode: BigInt(orderCode) }, data: { status: 'CANCELLED' } });
  }

  /** The link as the fake page shows it; null when there is none. */
  async link(orderCode: number): Promise<FakeLink | null> {
    const row = await this.prisma.fakePayosLink.findUnique({ where: { orderCode: BigInt(orderCode) } });
    if (row === null) return null;
    return {
      orderCode: Number(row.orderCode),
      paymentLinkId: row.paymentLinkId,
      amount: row.amount,
      status: (CHECKOUT_STATUSES as readonly string[]).includes(row.status) ? (row.status as CheckoutState['status']) : 'PROCESSING',
      expiresAt: row.expiresAt,
      returnUrl: row.returnUrl,
      cancelUrl: row.cancelUrl,
      transactions: (row.transactions ?? []) as unknown as FakeTransaction[],
    };
  }

  /**
   * The payer pays: `full` is what is still owed (the whole amount again when nothing is owed, for the "second transfer" case), `short`
   * is half of the amount. The transaction is written, the link becomes PAID or UNDERPAID, and unless `webhook` is false a signed webhook
   * is delivered the way payOS would (verified, stored in the inbox, applied). Null when there is no link or it can no longer be paid.
   */
  async pay(orderCode: number, kind: 'full' | 'short', options: { webhook: boolean }): Promise<FakeLink | null> {
    const link = await this.link(orderCode);
    if (link === null || link.status === 'CANCELLED' || link.status === 'EXPIRED' || link.status === 'FAILED') return null;
    const paid = sum(link.transactions);
    const owed = link.amount - paid;
    const amount = kind === 'short' ? Math.max(1, Math.floor(link.amount / 2)) : owed > 0 ? owed : link.amount;
    const transaction: FakeTransaction = {
      reference: `FAKE${randomBytes(5).toString('hex').toUpperCase()}`,
      amount,
      transactionDateTime: vietnamTime(this.clock.now()),
      payer: FAKE_PAYER,
    };
    const transactions = [...link.transactions, transaction];
    const status: CheckoutState['status'] = sum(transactions) >= link.amount ? 'PAID' : 'UNDERPAID';
    await this.prisma.fakePayosLink.update({
      where: { orderCode: BigInt(orderCode) },
      data: { status, transactions: transactions as unknown as Prisma.InputJsonValue },
    });
    if (options.webhook) await this.deliverWebhook(link, transaction);
    return { ...link, status, transactions };
  }

  private async deliverWebhook(link: FakeLink, transaction: FakeTransaction): Promise<void> {
    const key = this.checksumKey();
    if (key === null) throw new Error('fake payos: BILLING_FAKE_SECRET is not set');
    const inRange = link.orderCode >= ORDER_CODE_MIN && link.orderCode <= ORDER_CODE_MAX;
    const data = {
      orderCode: link.orderCode,
      amount: transaction.amount,
      description: inRange ? orderDescription(link.orderCode) : `FAKE${link.orderCode}`,
      accountNumber: '0000000000',
      reference: transaction.reference,
      transactionDateTime: transaction.transactionDateTime,
      currency: 'VND',
      paymentLinkId: link.paymentLinkId,
      code: '00',
      desc: 'Thành công',
      counterAccountBankId: 'FAKE',
      counterAccountBankName: transaction.payer.counterAccountBankName,
      counterAccountName: transaction.payer.counterAccountName,
      counterAccountNumber: transaction.payer.counterAccountNumber,
      virtualAccountName: '',
      virtualAccountNumber: '',
    };
    const rawBody = Buffer.from(JSON.stringify({ code: '00', desc: 'success', success: true, data, signature: signPayosData(data, key) }));
    const verified = await this.verify({ method: 'POST', headers: {}, query: {}, rawBody });
    if (!verified.ok || verified.events.length === 0 || this.inbox === undefined) return;
    const ids = await this.inbox.store(this.provider, verified.events);
    if (this.applier !== undefined) await this.applier.applyMany(ids);
  }
}
