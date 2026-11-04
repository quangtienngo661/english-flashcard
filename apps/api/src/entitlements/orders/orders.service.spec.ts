import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { testConfig } from '../../../test/support/test-config.js';
import { SETTINGS_DEFAULTS } from '../../settings/index.js';
import { BillingAdapterRegistry } from '../billing/billing-adapter.registry.js';
import type { BillingAdapter, CheckoutOrder } from '../billing/billing-adapter.js';
import { orderDescription } from './order-codes.js';
import type { NewOrder, OrderView } from './orders.repository.js';
import { OrdersService } from './orders.service.js';

const NOW = new Date('2026-11-05T03:02:00.000Z');
const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const OTHER = '11111111-0b7d-4c1e-9a55-3d2f8e7b6a10';

type Row = NewOrder & { id: string; paymentLinkId: string | null; checkoutUrl: string | null; status: string; period: { startsAt: Date; endsAt: Date } | null };

/** The orders table in memory with a call log; the sequence starts where the migration's does. */
class MemoryOrders {
  rows: Row[] = [];
  calls: string[] = [];
  code = 1_000_000_000;
  async nextOrderCode() { this.calls.push('next-code'); return this.code++; }
  async insertPending(_db: unknown, row: NewOrder) {
    this.calls.push('insert-pending');
    const stored: Row = { ...row, id: `order-${this.rows.length + 1}`, paymentLinkId: null, checkoutUrl: null, status: 'pending', period: null };
    this.rows.push(stored);
    return { id: stored.id };
  }
  async setLink(_db: unknown, id: string, paymentLinkId: string, checkoutUrl: string) {
    this.calls.push('set-link');
    const row = this.rows.find((r) => r.id === id && r.status === 'pending');
    if (!row) return false;
    Object.assign(row, { paymentLinkId, checkoutUrl });
    return true;
  }
  async markFailed(_db: unknown, id: string) {
    this.calls.push('mark-failed');
    const row = this.rows.find((r) => r.id === id && r.status === 'pending');
    if (!row) return false;
    row.status = 'failed';
    return true;
  }
  async findOwned(_db: unknown, id: string, userId: string): Promise<OrderView | null> {
    const row = this.rows.find((r) => r.id === id && r.userId === userId);
    return row ? { id: row.id, status: row.status, periodMonths: row.periodMonths, amount: row.amount, description: row.description, expiresAt: row.expiresAt, period: row.period } : null;
  }
}

function setup(opts: { payos?: 'real' | 'fake' | 'off'; adapter?: Partial<BillingAdapter> | null; prices?: Partial<Record<'proPrice1mVnd' | 'proPrice3mVnd' | 'proPrice12mVnd', number>> } = {}) {
  const memory = new MemoryOrders();
  const clock = new FakeClock(NOW);
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => logs.push(entry) });
  let inTx = false;
  const created: CheckoutOrder[] = [];
  const createCheckout = vi.fn(async (order: CheckoutOrder) => {
    memory.calls.push(`create-checkout(inTx=${inTx})`);
    created.push(order);
    return { paymentLinkId: `link-${order.orderCode}`, checkoutUrl: `https://pay.example/${order.orderCode}` };
  });
  const registry = new BillingAdapterRegistry();
  if (opts.adapter !== null) registry.register({ provider: 'payos', createCheckout, ...opts.adapter } as unknown as BillingAdapter);
  const settingsValue = { ...SETTINGS_DEFAULTS, entitlements: { ...SETTINGS_DEFAULTS.entitlements, ...opts.prices } };
  const settings = { get: vi.fn(async () => settingsValue), value: settingsValue };
  const config = testConfig({ learnerAppUrl: 'http://localhost:3001', payos: { mode: opts.payos ?? 'real', clientId: null, apiKey: null, checksumKey: null } });
  const prisma = {
    $transaction: vi.fn(async <T>(fn: (client: unknown) => Promise<T>) => { inTx = true; try { return await fn({}); } finally { inTx = false; } }),
  };
  const service = new OrdersService(prisma as never, clock, config, settings as never, registry, memory as never, logger);
  return { service, memory, clock, logs, createCheckout, created, settings, prisma, registry };
}

const request = (over: Record<string, unknown> = {}) => ({ period_months: 1 as const, expected_amount: 79000, locale: 'vi' as const, ...over });

afterEach(() => { vi.useRealTimers(); });

describe('OrdersService.create (design §3.6 "Tạo đơn")', () => {
  it('commits the pending order first, then asks payOS outside any transaction, then keeps the link: 201 shape order_id + checkout_url', async () => {
    const { service, memory, created } = setup();
    const result = await service.create(USER, request());
    expect(result).toEqual({ order_id: 'order-1', checkout_url: 'https://pay.example/1000000000' });
    expect(memory.calls).toEqual(['next-code', 'insert-pending', 'create-checkout(inTx=false)', 'set-link']);
    expect(memory.rows[0]).toMatchObject({
      userId: USER, provider: 'payos', environment: 'production', orderCode: 1_000_000_000, description: orderDescription(1_000_000_000), periodMonths: 1,
      amount: 79000, currency: 'VND', expiresAt: new Date('2026-11-05T03:17:00.000Z'), status: 'pending',
      paymentLinkId: 'link-1000000000', checkoutUrl: 'https://pay.example/1000000000',
    });
    expect(created).toEqual([{
      orderCode: 1_000_000_000, amount: 79000, description: 'WM0XSNJG0', expiresAt: new Date('2026-11-05T03:17:00.000Z'),
      returnUrl: 'http://localhost:3001/vi/app/plans/order?order=order-1', cancelUrl: 'http://localhost:3001/vi/app/plans/order?order=order-1',
    }]);
  });

  it('the price is the setting of the period: 1, 3 and 12 months, and the order keeps that number', async () => {
    const { service, memory } = setup({ prices: { proPrice3mVnd: 189000 } });
    await service.create(USER, request({ period_months: 3, expected_amount: 189000 }));
    await service.create(USER, request({ period_months: 12, expected_amount: 599000, locale: 'en' }));
    expect(memory.rows.map((r) => [r.periodMonths, r.amount])).toEqual([[3, 189000], [12, 599000]]);
  });

  it('the return URL follows the learner’s language', async () => {
    const { service, created } = setup();
    await service.create(USER, request({ locale: 'en' }));
    expect(created[0].returnUrl).toBe('http://localhost:3001/en/app/plans/order?order=order-1');
  });

  it('LB1E28: an expected amount that is not the current price → 409 price-changed with the current amount; no order, payOS not asked', async () => {
    const { service, memory, createCheckout } = setup({ prices: { proPrice1mVnd: 89000 } });
    await expect(service.create(USER, request())).rejects.toMatchObject({ status: 409, problemType: 'price-changed', extensions: { current_amount: 89000 } });
    expect(memory.rows).toEqual([]);
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it('LB1E29: the admin changes the price after the order exists → the order keeps the old amount', async () => {
    const ctx = setup();
    const { order_id } = await ctx.service.create(USER, request());
    ctx.settings.value.entitlements.proPrice1mVnd = 99000;
    expect((await ctx.service.get(USER, order_id)).amount).toBe(79000);
    await expect(ctx.service.create(USER, request())).rejects.toMatchObject({ problemType: 'price-changed' });
  });

  it('LB1E17: payOS fails → the order is failed, 503 provider-unavailable; pressing Buy again is a new order with a new order code', async () => {
    const { service, memory, createCheckout } = setup();
    createCheckout.mockRejectedValueOnce(new Error('payos down'));
    await expect(service.create(USER, request())).rejects.toMatchObject({ status: 503, problemType: 'provider-unavailable' });
    expect(memory.rows[0]).toMatchObject({ status: 'failed', paymentLinkId: null });
    const again = await service.create(USER, request());
    expect(again.order_id).toBe('order-2');
    expect(memory.rows.map((r) => r.orderCode)).toEqual([1_000_000_000, 1_000_000_001]);
    expect(memory.rows[1]).toMatchObject({ status: 'pending', paymentLinkId: 'link-1000000001' });
  });

  it('LB1E17: payOS that does not answer within the adapter’s 5 seconds fails the order the same way', async () => {
    vi.useFakeTimers();
    const { service, memory, createCheckout } = setup();
    createCheckout.mockImplementationOnce(() => new Promise(() => {}));
    const pending = service.create(USER, request());
    const caught = pending.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(5_001);
    expect(await caught).toMatchObject({ status: 503, problemType: 'provider-unavailable' });
    expect(memory.rows[0].status).toBe('failed');
  });

  it('LB1E27: two quick presses with two keys are two pending orders, each with its own link', async () => {
    const { service, memory } = setup();
    await Promise.all([service.create(USER, request()), service.create(USER, request())]);
    expect(memory.rows).toHaveLength(2);
    expect(new Set(memory.rows.map((r) => r.orderCode)).size).toBe(2);
    expect(memory.rows.every((r) => r.status === 'pending' && r.paymentLinkId !== null)).toBe(true);
  });

  it('the fake payOS makes sandbox orders, so local data never looks like money', async () => {
    const { service, memory } = setup({ payos: 'fake' });
    await service.create(USER, request());
    expect(memory.rows[0].environment).toBe('sandbox');
  });

  it('payOS is not set up (no adapter): 503 provider-unavailable and no order is left behind', async () => {
    const { service, memory } = setup({ adapter: null, payos: 'off' });
    await expect(service.create(USER, request())).rejects.toMatchObject({ status: 503, problemType: 'provider-unavailable' });
    expect(memory.rows).toEqual([]);
  });

  it('an adapter that cannot create a checkout (not a one-time provider) is the same 503', async () => {
    const { service, memory } = setup({ adapter: { createCheckout: undefined } });
    await expect(service.create(USER, request())).rejects.toMatchObject({ problemType: 'provider-unavailable' });
    expect(memory.rows).toEqual([]);
  });

  it('the order stopped being pending while payOS answered (the link could not be kept) → 503, no checkout URL handed out', async () => {
    const ctx = setup();
    const original = ctx.memory.setLink.bind(ctx.memory);
    ctx.memory.setLink = async () => false;
    await expect(ctx.service.create(USER, request())).rejects.toMatchObject({ problemType: 'provider-unavailable' });
    ctx.memory.setLink = original;
  });

  it('§3.12: no log entry carries the order code or the checkout URL', async () => {
    const { service, logs, createCheckout } = setup();
    await service.create(USER, request());
    createCheckout.mockRejectedValueOnce(new Error('boom'));
    await service.create(USER, request()).catch(() => {});
    const text = JSON.stringify(logs);
    expect(logs.length).toBeGreaterThan(0);
    expect(text).not.toContain('1000000000');
    expect(text).not.toContain('pay.example');
    expect(text).not.toContain('order_code');
  });
});

describe('OrdersService.get (design §3.8)', () => {
  it('shows a learner their own order: status, months, amount, the transfer note, the expiry, and no period before it is paid', async () => {
    const { service } = setup();
    const { order_id } = await service.create(USER, request());
    expect(await service.get(USER, order_id)).toEqual({
      id: order_id, status: 'pending', period_months: 1, amount: 79000, description: 'WM0XSNJG0', expires_at: '2026-11-05T03:17:00.000Z', period: null,
    });
  });

  it('a paid order carries the period it opened', async () => {
    const { service, memory } = setup();
    const { order_id } = await service.create(USER, request());
    memory.rows[0].status = 'paid';
    memory.rows[0].period = { startsAt: new Date('2026-11-05T03:02:00Z'), endsAt: new Date('2026-12-05T17:00:00Z') };
    expect(await service.get(USER, order_id)).toMatchObject({ status: 'paid', period: { starts_at: '2026-11-05T03:02:00.000Z', ends_at: '2026-12-05T17:00:00.000Z' } });
  });

  it('another learner’s order and an order that does not exist are the same 404', async () => {
    const { service } = setup();
    const { order_id } = await service.create(USER, request());
    await expect(service.get(OTHER, order_id)).rejects.toMatchObject({ status: 404 });
    await expect(service.get(USER, 'nope')).rejects.toMatchObject({ status: 404 });
  });

  it('never shows the review reason or the payOS link (what the learner sees is the status)', async () => {
    const { service, memory } = setup();
    const { order_id } = await service.create(USER, request());
    memory.rows[0].status = 'needs_review';
    const view = await service.get(USER, order_id);
    expect(Object.keys(view).sort()).toEqual(['amount', 'description', 'expires_at', 'id', 'period', 'period_months', 'status']);
  });
});
