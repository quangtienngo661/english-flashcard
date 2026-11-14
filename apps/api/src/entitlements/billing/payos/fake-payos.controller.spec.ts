import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../../common/problem-details/problem-details.exception.js';
import { testConfig } from '../../../../test/support/test-config.js';
import { FakePayosController } from './fake-payos.controller.js';

const CODE = 1_000_000_123;
const link = (over: Record<string, unknown> = {}) => ({
  orderCode: CODE, paymentLinkId: 'fake-link-1', amount: 199000, status: 'PENDING', expiresAt: new Date('2026-11-05T03:17:00Z'),
  returnUrl: 'http://localhost:3001/vi/app/plans/order?order=o1', cancelUrl: 'http://localhost:3001/vi/app/plans/order?order=o1&x=1',
  transactions: [], ...over,
});

function setup(mode: 'fake' | 'real' | 'off' = 'fake', row: ReturnType<typeof link> | null = link()) {
  const adapter = {
    link: vi.fn(async () => row),
    pay: vi.fn(async () => row),
    cancelCheckout: vi.fn(async () => {}),
  };
  const config = testConfig({ payos: { mode, clientId: null, apiKey: null, checksumKey: null } });
  const controller = new FakePayosController(adapter as never, config);
  const res = {
    status: vi.fn().mockReturnThis(), type: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis(), redirect: vi.fn().mockReturnThis(),
  };
  return { controller, adapter, res };
}

const call = async (ctx: ReturnType<typeof setup>, query: Record<string, string>) => ctx.controller.checkout(query, ctx.res as never);
const notFound = (promise: Promise<unknown>) => expect(promise).rejects.toMatchObject({ status: 404 });

describe('FakePayosController (/v1/dev/payos/checkout)', () => {
  it('answers 404 when the fake is not on, whatever the query (LB1: the page must not exist in the real mode)', async () => {
    for (const mode of ['real', 'off'] as const) {
      const ctx = setup(mode);
      await notFound(call(ctx, { order: String(CODE) }));
      await notFound(call(ctx, { order: String(CODE), action: 'paid' }));
      expect(ctx.adapter.pay).not.toHaveBeenCalled();
      expect(ctx.adapter.cancelCheckout).not.toHaveBeenCalled();
    }
    expect(new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' })).toBeInstanceOf(Error);
  });

  it('answers 404 for an order the fake does not know and 400 for a query that is not an order code', async () => {
    await notFound(call(setup('fake', null), { order: String(CODE) }));
    for (const order of ['', 'abc', '1.5', '-3', '99999999999999999999']) {
      await expect(call(setup(), { order }), order).rejects.toMatchObject({ status: 400 });
    }
    await expect(call(setup(), {}), 'no order').rejects.toMatchObject({ status: 400 });
  });

  it('shows the order, the amount and a link for each action, with the webhook switch', async () => {
    const ctx = setup();
    await call(ctx, { order: String(CODE) });
    expect(ctx.res.type).toHaveBeenCalledWith('html');
    const html = String(ctx.res.send.mock.calls[0][0]);
    expect(html).toContain('WM0XSNJKV');
    expect(html).toContain('199.000');
    for (const action of ['paid', 'short', 'cancel']) expect(html).toContain(`action=${action}`);
    expect(html).toContain('webhook=0');
  });

  it('"Đã trả" pays, then sends the browser to the return URL the way payOS does', async () => {
    const ctx = setup('fake', link({ status: 'PAID' }));
    await call(ctx, { order: String(CODE), action: 'paid' });
    expect(ctx.adapter.pay).toHaveBeenCalledWith(CODE, 'full', { webhook: true });
    const target = new URL(ctx.res.redirect.mock.calls[0][1] as string);
    expect(`${target.origin}${target.pathname}`).toBe('http://localhost:3001/vi/app/plans/order');
    expect(Object.fromEntries(target.searchParams)).toEqual({
      order: 'o1', code: '00', id: 'fake-link-1', cancel: 'false', status: 'PAID', orderCode: String(CODE),
    });
    expect(ctx.res.redirect.mock.calls[0][0]).toBe(302);
  });

  it('webhook=0 pays without the webhook', async () => {
    const ctx = setup();
    await call(ctx, { order: String(CODE), action: 'paid', webhook: '0' });
    expect(ctx.adapter.pay).toHaveBeenCalledWith(CODE, 'full', { webhook: false });
  });

  it('"Trả thiếu" pays half and shows the page again (payOS does not leave a half-paid page)', async () => {
    const ctx = setup('fake', link({ status: 'UNDERPAID', transactions: [{ reference: 'FAKE1', amount: 99500 }] }));
    await call(ctx, { order: String(CODE), action: 'short' });
    expect(ctx.adapter.pay).toHaveBeenCalledWith(CODE, 'short', { webhook: true });
    expect(ctx.res.redirect).not.toHaveBeenCalled();
    expect(String(ctx.res.send.mock.calls[0][0])).toContain('UNDERPAID');
  });

  it('"Hủy" only changes the status, then goes to the cancel URL with cancel=true and no webhook', async () => {
    const ctx = setup('fake', link({ status: 'CANCELLED' }));
    await call(ctx, { order: String(CODE), action: 'cancel' });
    expect(ctx.adapter.cancelCheckout).toHaveBeenCalledWith(CODE);
    expect(ctx.adapter.pay).not.toHaveBeenCalled();
    const target = new URL(ctx.res.redirect.mock.calls[0][1] as string);
    expect(Object.fromEntries(target.searchParams)).toMatchObject({ order: 'o1', x: '1', cancel: 'true', status: 'CANCELLED', code: '00' });
  });

  it('an action that is not one of the three is a 400 and does nothing', async () => {
    const ctx = setup();
    await expect(call(ctx, { order: String(CODE), action: 'refund' })).rejects.toMatchObject({ status: 400 });
    expect(ctx.adapter.pay).not.toHaveBeenCalled();
  });

  it('escapes what it prints (the return URL is data)', async () => {
    const ctx = setup('fake', link({ returnUrl: 'http://localhost:3001/x?"><script>alert(1)</script>' }));
    await call(ctx, { order: String(CODE) });
    expect(String(ctx.res.send.mock.calls[0][0])).not.toContain('<script>alert(1)');
  });
});
