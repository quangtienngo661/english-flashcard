import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../../common/db/prisma.module.js';
import { createTestApp, type TestApp } from '../../../../test/support/create-test-app.js';
import type { ParsedEvent } from '../billing-adapter.js';
import { BillingInbox } from '../billing-inbox.service.js';
import { signPayosData } from './payos-signature.js';

const KEY = 'test-checksum-key-not-a-real-one';
const data = (over: Record<string, unknown> = {}) => ({
  orderCode: 1_000_000_123, amount: 199000, description: 'WM0XSNJKV', accountNumber: '12345678', reference: 'FT26309ABC',
  transactionDateTime: '2026-11-05 10:02:00', currency: 'VND', paymentLinkId: 'link-1', code: '00', desc: 'Thành công',
  counterAccountName: 'NGUYEN THI LAN', counterAccountNumber: '0123456789', counterAccountBankName: 'MB Bank', ...over,
});
const body = (d: Record<string, unknown>, key = KEY) => ({ code: '00', desc: 'success', success: true, data: d, signature: signPayosData(d, key) });

describe('payOS webhook route (design §3.1; LB1E22)', () => {
  let ctx: TestApp;
  const prisma = { $disconnect: async () => {} };
  const inbox = { store: vi.fn(), afterResponse: vi.fn() };
  const post = (payload: unknown) => ctx.http().post('/v1/billing/webhooks/payos').set('Content-Type', 'application/json').send(typeof payload === 'string' ? payload : JSON.stringify(payload));

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true, providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({
      databaseUrl: 'unused',
      config: { payos: { mode: 'real', clientId: 'client', apiKey: 'api', checksumKey: KEY } },
      providers: [{ provide: BillingInbox, useValue: inbox }],
    });
  });
  beforeEach(() => {
    inbox.store.mockReset().mockImplementation(async (_provider: string, events: ParsedEvent[]) => events.map((_, i) => `id-${i}`));
    inbox.afterResponse.mockReset();
    ctx.logs.length = 0;
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('LB1E22: a wrong signature → 400 validation-failed, nothing stored (so no billing_events row)', async () => {
    const res = await post(body(data(), 'another-key'));
    expect(res.status).toBe(400);
    expect(res.body.type).toMatch(/validation-failed$/);
    expect(inbox.store).not.toHaveBeenCalled();
    expect(inbox.afterResponse).not.toHaveBeenCalled();
  });

  it('a body that is not JSON or not a payOS body → 400, nothing stored', async () => {
    for (const payload of ['not json', '{}', '[]', JSON.stringify({ data: {}, signature: 'x' })]) {
      const res = await post(payload);
      expect(res.status, payload).toBe(400);
    }
    expect(inbox.store).not.toHaveBeenCalled();
  });

  it('a body whose data was changed after signing → 400', async () => {
    const signed = body(data());
    const res = await post({ ...signed, data: { ...signed.data, amount: 1000 } });
    expect(res.status).toBe(400);
    expect(inbox.store).not.toHaveBeenCalled();
  });

  it('a right signature → 200, one production event stored by <orderCode>:<reference>, then handed to the applier after the response', async () => {
    const res = await post(body(data()));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: 1 });
    expect(inbox.store).toHaveBeenCalledWith('payos', [expect.objectContaining({
      type: 'payment_succeeded', environment: 'production', externalEventId: '1000000123:FT26309ABC',
    })]);
    expect(inbox.afterResponse).toHaveBeenCalledWith(expect.anything(), ['id-0']);
  });

  it('payOS’s own test webhook (orderCode 123, signed) is accepted with 200, like any signed body', async () => {
    const res = await post(body(data({ orderCode: 123 })));
    expect(res.status).toBe(200);
  });

  it('the bad-signature log carries the provider only: no body, no signature, no payer (design §3.12)', async () => {
    const payload = body(data(), 'another-key');
    await post(payload);
    const logged = ctx.logs.filter((log) => log.event === 'billing_signature_invalid');
    expect(logged).toHaveLength(1);
    expect(Object.keys(logged[0]).sort()).toEqual(['event', 'level', 'operation_id', 'provider']);
    expect(logged[0].provider).toBe('payos');
    const all = JSON.stringify(ctx.logs);
    for (const secret of ['NGUYEN THI LAN', '0123456789', 'MB Bank', payload.signature]) expect(all).not.toContain(secret);
  });

  it('a good webhook logs no payer field either', async () => {
    await post(body(data()));
    const all = JSON.stringify(ctx.logs);
    for (const secret of ['NGUYEN THI LAN', '0123456789', 'MB Bank']) expect(all).not.toContain(secret);
  });
});
