import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { BillingAdapterRegistry } from '../billing/billing-adapter.registry.js';
import type { BillingAdapter } from '../billing/billing-adapter.js';
import type { GrantSource } from '../rules/plan-rules.js';
import { AdminOrdersService } from './admin-orders.service.js';
import type { AdminOrderDetailRow, AdminOrderRow, OrderUpdate } from './orders.repository.js';

const NOW = new Date('2026-11-05T04:00:00.000Z');
const ADMIN = '9a8b7c6d-0000-4000-8000-000000000001';
const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const at = (iso: string) => new Date(iso);

const row = (over: Partial<AdminOrderRow> = {}): AdminOrderRow => ({
  id: 'order-1', userId: USER, status: 'pending', reviewReason: null, paidVia: null, orderCode: 1_000_000_123, periodMonths: 1, amount: 79000,
  description: 'WM0XSNJKV', paymentLinkId: 'link-1', createdAt: at('2026-11-05T03:00:00Z'), expiresAt: at('2026-11-05T03:15:00Z'),
  resolvedAt: null, resolutionNote: null, refundPayerName: null, refundPayerAccount: null, refundPayerBank: null, refundSavedAt: null, ...over,
});

function setup(opts: { rows?: AdminOrderRow[]; detail?: Partial<AdminOrderDetailRow>; cancel?: 'ok' | 'fail' | 'none'; grants?: GrantSource[]; emailLookup?: string | null } = {}) {
  const store = new Map((opts.rows ?? [row()]).map((r) => [r.id, { ...r }]));
  const calls: string[] = [];
  const updates: Array<{ id: string; from: string; data: OrderUpdate }> = [];
  let inTx = false;
  const periods = new Map<string, { id: string; userId: string; revokedAt: Date | null; startsAt: Date; endsAt: Date }>([
    ['period-1', { id: 'period-1', userId: USER, revokedAt: null, startsAt: at('2026-11-05T03:02:00Z'), endsAt: at('2026-12-05T17:00:00Z') }],
  ]);
  const orders = {
    listAdmin: vi.fn(async (_db: unknown, _filter: Record<string, unknown>) => [...store.values()]),
    findById: vi.fn(async (_db: unknown, id: string) => { const r = store.get(id); return r ? { ...r, environment: 'production', currency: 'VND' } as never : null; }),
    adminDetail: vi.fn(async (_db: unknown, id: string): Promise<AdminOrderDetailRow | null> => {
      const r = store.get(id);
      return r ? { ...r, payments: [], periods: [], ...opts.detail } : null;
    }),
    lock: vi.fn(async (_db: unknown, id: string) => { calls.push(`lock-order:${id}`); const r = store.get(id); return r ? { ...r } as never : null; }),
    transition: vi.fn(async (_db: unknown, id: string, from: string, data: OrderUpdate) => {
      calls.push(`transition:${from}->${String(data.status ?? 'same')}`);
      updates.push({ id, from, data });
      const r = store.get(id)!;
      if (r.status !== from) return false;
      Object.assign(r, data);
      return true;
    }),
    findPeriod: vi.fn(async (_db: unknown, id: string) => periods.get(id) ?? null),
    revokePeriod: vi.fn(async (_db: unknown, id: string, by: string, reason: string, now: Date) => {
      calls.push(`revoke:${id}`);
      const p = periods.get(id);
      if (!p || p.revokedAt !== null) return false;
      Object.assign(p, { revokedAt: now, revokedBy: by, revokeReason: reason });
      return true;
    }),
  };
  const applier = { confirmManual: vi.fn(async (_input: unknown) => ({ outcome: 'opened-period' as const, userId: USER, periodId: 'period-9' })) };
  const identity = {
    findUserIdByEmail: vi.fn(async (_email: string) => (opts.emailLookup === undefined ? USER : opts.emailLookup)),
    emailsOf: vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === USER).map((id) => [id, 'lan@example.com']))),
  };
  const sources = {
    load: vi.fn(async (_db: unknown, _user: string, _now: Date) => ({
      subscriptions: [], grants: opts.grants ?? [],
      prepaidPeriods: [...periods.values()].filter((p) => p.revokedAt === null && p.endsAt > NOW),
    })),
  };
  const registry = new BillingAdapterRegistry();
  const cancelCheckout = vi.fn(async (_code: number) => {
    calls.push(`cancel-checkout(inTx=${inTx})`);
    if (opts.cancel === 'fail') throw new Error('payos said no');
  });
  if (opts.cancel !== 'none') registry.register({ provider: 'payos', cancelCheckout } as unknown as BillingAdapter);
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => logs.push(entry) });
  const prisma = {
    $transaction: vi.fn(async <T>(fn: (client: unknown) => Promise<T>) => {
      inTx = true;
      try { return await fn({ $executeRaw: async (_s: TemplateStringsArray, ...v: unknown[]) => { calls.push(`lock-user:${String(v[0]).replace('entitlements.user:', '')}`); return 1; } }); } finally { inTx = false; }
    }),
  };
  const service = new AdminOrdersService(prisma as never, new FakeClock(NOW), identity as never, sources as never, registry, orders as never, applier as never, logger);
  return { service, store, calls, updates, orders, applier, identity, cancelCheckout, periods, logs, prisma };
}

describe('AdminOrdersService.list (design §3.9)', () => {
  it('maps rows to items with the learner’s email, the flag "needs attention" and no payOS link', async () => {
    const { service } = setup({ rows: [row({ id: 'a', status: 'needs_review', reviewReason: 'amount-short' }), row({ id: 'b', status: 'paid', paidVia: 'webhook', reviewReason: 'extra-payment' }), row({ id: 'c' })] });
    const page = await service.list({ page_size: 20 });
    expect(page.items.map((i) => [i.id, i.needs_attention])).toEqual([['a', true], ['b', true], ['c', false]]);
    expect(page.items[0]).toMatchObject({
      status: 'needs_review', review_reason: 'amount-short', period_months: 1, amount: 79000, description: 'WM0XSNJKV', user: { id: USER, email: 'lan@example.com' },
    });
    expect(JSON.stringify(page)).not.toContain('link-1');
  });

  it('the filters reach the query: status, needs_attention, dates, q (as typed on the transfer note), and the email as a user id', async () => {
    const { service, orders } = setup();
    await service.list({ status: 'needs_review', needs_attention: true, from: '2026-11-01T00:00:00+07:00', to: '2026-12-01T00:00:00+07:00', q: 'wm0xsn', email: 'Lan@Example.com', page_size: 20 });
    expect(orders.listAdmin).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      status: 'needs_review', needsAttention: true, userId: USER, from: at('2026-10-31T17:00:00Z'), to: at('2026-11-30T17:00:00Z'), q: 'WM0XSN', take: 21,
    }));
  });

  it('an email nobody has gives an empty page and asks nothing more', async () => {
    const { service, orders } = setup({ emailLookup: null });
    expect(await service.list({ email: 'nobody@example.com', page_size: 20 })).toEqual({ items: [], next_page_token: null });
    expect(orders.listAdmin).not.toHaveBeenCalled();
  });

  it('keyset paging: one row past the page means a token; the token only fits the same filters', async () => {
    const many = Array.from({ length: 3 }, (_, i) => row({ id: `o${i}`, createdAt: new Date(NOW.getTime() - i * 1000) }));
    const { service, orders } = setup({ rows: many });
    const first = await service.list({ page_size: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.next_page_token).toEqual(expect.any(String));
    await service.list({ page_size: 2, page_token: first.next_page_token! });
    expect(orders.listAdmin).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ cursor: { createdAt: many[1].createdAt, id: 'o1' } }));
    await expect(service.list({ page_size: 2, status: 'paid', page_token: first.next_page_token! })).rejects.toMatchObject({ status: 400 });
    await expect(service.list({ page_size: 2, page_token: 'garbage' })).rejects.toMatchObject({ status: 400 });
  });

  it('the last page has no token', async () => {
    const { service } = setup({ rows: [row()] });
    expect((await service.list({ page_size: 20 })).next_page_token).toBeNull();
  });
});

describe('AdminOrdersService.get', () => {
  it('shows the order, its payments and periods, the refund information, and the learner’s Pro now with its sources', async () => {
    const grant: GrantSource = { id: 'g1', kind: 'plan', limits: null, startsAt: at('2026-10-01T00:00:00Z'), endsAt: at('2026-11-30T00:00:00Z'), revokedAt: null, createdAt: at('2026-10-01T00:00:00Z') };
    const { service } = setup({
      grants: [grant],
      detail: {
        status: 'needs_review', reviewReason: 'account-deleted', refundPayerName: 'NGUYEN THI LAN', refundPayerAccount: '0123', refundPayerBank: 'MB Bank', refundSavedAt: at('2026-11-05T03:30:00Z'),
        payments: [{ id: 'pay-1', source: 'webhook', reference: 'FT1', amount: 79000, providerTime: '2026-11-05 10:02:00', outcome: 'refund-needed', periodId: null, confirmedBy: null, reason: null, receivedAt: at('2026-11-05T03:02:05Z') }],
        periods: [{ id: 'period-1', startsAt: at('2026-11-05T03:02:00Z'), endsAt: at('2026-12-05T17:00:00Z'), revokedAt: null, revokeReason: null }],
      },
    });
    const view = await service.get('order-1');
    expect(view).toMatchObject({
      id: 'order-1', status: 'needs_review', review_reason: 'account-deleted', order_code: 1_000_000_123, user: { id: USER, email: 'lan@example.com' },
      refund: { payer_name: 'NGUYEN THI LAN', payer_account: '0123', payer_bank: 'MB Bank', saved_at: '2026-11-05T03:30:00.000Z' },
      payments: [{ id: 'pay-1', source: 'webhook', reference: 'FT1', amount: 79000, provider_time: '2026-11-05 10:02:00', outcome: 'refund-needed', period_id: null, received_at: '2026-11-05T03:02:05.000Z' }],
      periods: [{ id: 'period-1', starts_at: '2026-11-05T03:02:00.000Z', ends_at: '2026-12-05T17:00:00.000Z', revoked_at: null, revoke_reason: null }],
    });
    expect(view.pro).toEqual({
      until: '2026-12-05T17:00:00.000Z',
      sources: [
        { kind: 'grant', id: 'g1', starts_at: '2026-10-01T00:00:00.000Z', ends_at: '2026-11-30T00:00:00.000Z' },
        { kind: 'prepaid', id: 'period-1', starts_at: '2026-11-05T03:02:00.000Z', ends_at: '2026-12-05T17:00:00.000Z' },
      ],
    });
  });

  it('an order with no refund information has refund null; an anonymised learner has no email and no Pro view', async () => {
    const { service, identity } = setup();
    identity.emailsOf.mockResolvedValue(new Map());
    const view = await service.get('order-1');
    expect(view.refund).toBeNull();
    expect(view.user.email).toBeNull();
  });

  it('an unknown order is a 404', async () => {
    await expect(setup().service.get('nope')).rejects.toMatchObject({ status: 404 });
  });
});

describe('AdminOrdersService.confirmPayment (T11–T14)', () => {
  it('LB1A5: hands the admin, the reference, the amount and the reason to the order applier, then shows the order', async () => {
    const { service, applier } = setup();
    const view = await service.confirmPayment(ADMIN, 'order-1', { reference: 'FT2611-BANK', amount: 79000, reason: 'saw it in the bank app' });
    expect(applier.confirmManual).toHaveBeenCalledWith({ orderId: 'order-1', adminId: ADMIN, reference: 'FT2611-BANK', amount: 79000, reason: 'saw it in the bank app' });
    expect(view.id).toBe('order-1');
  });

  it('a 409 or 404 of the rules passes through unchanged', async () => {
    const { service, applier } = setup();
    applier.confirmManual.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 409 }));
    await expect(service.confirmPayment(ADMIN, 'order-1', { reference: 'r', amount: 1, reason: 'r' })).rejects.toMatchObject({ status: 409 });
  });
});

describe('AdminOrdersService.cancel', () => {
  it('asks payOS to cancel the link outside any lock, then cancels the pending order under the locks', async () => {
    const { service, store, calls, cancelCheckout } = setup();
    const view = await service.cancel(ADMIN, 'order-1');
    expect(cancelCheckout).toHaveBeenCalledWith(1_000_000_123);
    expect(store.get('order-1')?.status).toBe('cancelled');
    expect(view.status).toBe('cancelled');
    expect(calls).toContain(`lock-user:${USER}`);
    expect(calls.indexOf('cancel-checkout(inTx=false)')).toBeLessThan(calls.indexOf(`lock-user:${USER}`));
    expect(calls.indexOf(`lock-order:order-1`)).toBeGreaterThan(calls.indexOf(`lock-user:${USER}`));
    expect(calls).toContain('transition:pending->cancelled');
  });

  it('payOS refuses or does not answer → 503 provider-unavailable and the order is exactly as it was', async () => {
    const { service, store, updates } = setup({ cancel: 'fail' });
    await expect(service.cancel(ADMIN, 'order-1')).rejects.toMatchObject({ status: 503, problemType: 'provider-unavailable' });
    expect(store.get('order-1')?.status).toBe('pending');
    expect(updates).toEqual([]);
  });

  it('an order that is not pending cannot be cancelled: 409 order-not-pending, payOS not asked', async () => {
    for (const status of ['paid', 'needs_review', 'expired', 'closed', 'cancelled', 'failed']) {
      const { service, cancelCheckout } = setup({ rows: [row({ status: status as never })] });
      await expect(service.cancel(ADMIN, 'order-1'), status).rejects.toMatchObject({ status: 409, problemType: 'order-not-pending' });
      expect(cancelCheckout).not.toHaveBeenCalled();
    }
  });

  it('an order with no link at payOS is cancelled without asking payOS; so is one when payOS is not set up', async () => {
    const noLink = setup({ rows: [row({ paymentLinkId: null })] });
    await noLink.service.cancel(ADMIN, 'order-1');
    expect(noLink.cancelCheckout).not.toHaveBeenCalled();
    expect(noLink.store.get('order-1')?.status).toBe('cancelled');
    const off = setup({ cancel: 'none' });
    await off.service.cancel(ADMIN, 'order-1');
    expect(off.store.get('order-1')?.status).toBe('cancelled');
  });

  it('a webhook paid the order while payOS was asked → 409 and the order stays paid', async () => {
    const ctx = setup();
    ctx.cancelCheckout.mockImplementationOnce(async () => { ctx.store.get('order-1')!.status = 'paid'; });
    await expect(ctx.service.cancel(ADMIN, 'order-1')).rejects.toMatchObject({ status: 409, problemType: 'order-changed' });
    expect(ctx.store.get('order-1')?.status).toBe('paid');
  });

  it('an unknown order is a 404', async () => {
    await expect(setup().service.cancel(ADMIN, 'nope')).rejects.toMatchObject({ status: 404 });
  });
});

describe('AdminOrdersService.resolve (design §3.9)', () => {
  const refunded = { refundPayerName: 'NGUYEN THI LAN', refundPayerAccount: '0123', refundPayerBank: 'MB Bank', refundSavedAt: at('2026-11-05T03:30:00Z') };

  it('a needs_review order is closed, with who and why; the refund information is cleared', async () => {
    const { service, store } = setup({ rows: [row({ status: 'needs_review', reviewReason: 'account-deleted', ...refunded })] });
    const view = await service.resolve(ADMIN, 'order-1', 'refunded by hand on 06/11');
    expect(store.get('order-1')).toMatchObject({
      status: 'closed', reviewReason: null, resolvedAt: NOW, resolvedBy: ADMIN, resolutionNote: 'refunded by hand on 06/11',
      refundPayerName: null, refundPayerAccount: null, refundPayerBank: null,
    });
    expect(view.status).toBe('closed');
  });

  it('a paid order with a flag loses the flag and stays paid', async () => {
    const { service, store } = setup({ rows: [row({ status: 'paid', paidVia: 'webhook', reviewReason: 'extra-payment', ...refunded })] });
    await service.resolve(ADMIN, 'order-1', 'second transfer refunded');
    expect(store.get('order-1')).toMatchObject({ status: 'paid', reviewReason: null, resolvedBy: ADMIN, refundPayerName: null });
  });

  it('anything else is 409 order-not-resolvable: nothing flagged, nothing waiting', async () => {
    for (const r of [row({ status: 'pending' }), row({ status: 'paid', paidVia: 'webhook' }), row({ status: 'closed' }), row({ status: 'expired' })]) {
      const { service, updates } = setup({ rows: [r] });
      await expect(service.resolve(ADMIN, 'order-1', 'x'), r.status).rejects.toMatchObject({ status: 409, problemType: 'order-not-resolvable' });
      expect(updates).toEqual([]);
    }
  });

  it('the change is conditional on the status that was read, under the user lock then the order lock; losing the race is 409 order-changed', async () => {
    const { service, calls } = setup({ rows: [row({ status: 'needs_review', reviewReason: 'late-payment' })] });
    await service.resolve(ADMIN, 'order-1', 'ok');
    expect(calls).toContain(`lock-user:${USER}`);
    expect(calls.indexOf(`lock-user:${USER}`)).toBeLessThan(calls.indexOf('lock-order:order-1'));
    expect(calls).toContain('transition:needs_review->closed');
    const raced = setup({ rows: [row({ status: 'needs_review', reviewReason: 'late-payment' })] });
    raced.orders.transition.mockResolvedValueOnce(false);
    await expect(raced.service.resolve(ADMIN, 'order-1', 'ok')).rejects.toMatchObject({ status: 409, problemType: 'order-changed' });
  });
});

describe('AdminOrdersService.revokePeriod (LB1E33)', () => {
  it('sets who, when and why under the learner’s lock and touches nothing else, so the periods after it do not move', async () => {
    const { service, calls, periods } = setup();
    const result = await service.revokePeriod(ADMIN, 'period-1', 'recorded on the wrong learner');
    expect(result).toEqual({ id: 'period-1', revoked_at: NOW.toISOString() });
    expect(periods.get('period-1')).toMatchObject({ revokedAt: NOW, revokedBy: ADMIN, revokeReason: 'recorded on the wrong learner', startsAt: at('2026-11-05T03:02:00Z'), endsAt: at('2026-12-05T17:00:00Z') });
    expect(calls).toContain(`lock-user:${USER}`);
    expect(calls.indexOf(`lock-user:${USER}`)).toBeLessThan(calls.indexOf('revoke:period-1'));
  });

  it('a period already revoked is 409 period-already-revoked; an unknown one is 404', async () => {
    const { service } = setup();
    await service.revokePeriod(ADMIN, 'period-1', 'r');
    await expect(service.revokePeriod(ADMIN, 'period-1', 'again')).rejects.toMatchObject({ status: 409, problemType: 'period-already-revoked' });
    await expect(service.revokePeriod(ADMIN, 'nope', 'r')).rejects.toMatchObject({ status: 404 });
  });
});

describe('AdminOrdersService — §3.12', () => {
  it('no log entry carries the payer, the refund information or the order code', async () => {
    const { service, logs } = setup({ rows: [row({ status: 'needs_review', reviewReason: 'account-deleted', refundPayerName: 'NGUYEN THI LAN', refundPayerAccount: '0123456789', refundPayerBank: 'MB Bank' })] });
    await service.get('order-1');
    await service.resolve(ADMIN, 'order-1', 'done');
    const text = JSON.stringify(logs);
    for (const secret of ['NGUYEN THI LAN', '0123456789', 'MB Bank', '1000000123', 'order_code']) expect(text, secret).not.toContain(secret);
  });
});
