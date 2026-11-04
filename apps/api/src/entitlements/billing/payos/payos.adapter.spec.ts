import { NotFoundError, PayOS, TooManyRequestError } from '@payos/node';
import { describe, expect, it, vi } from 'vitest';
import { testConfig } from '../../../../test/support/test-config.js';
import { BillingAdapterRegistry } from '../billing-adapter.registry.js';
import type { BillingRequest } from '../billing-adapter.js';
import { createPayosClient, PayosAdapter } from './payos.adapter.js';
import { signPayosData } from './payos-signature.js';

const KEY = 'test-checksum-key-not-a-real-one';
const realPayos = { mode: 'real' as const, clientId: 'client', apiKey: 'api', checksumKey: KEY };

function sdkMock() {
  const paymentRequests = { create: vi.fn(), get: vi.fn(), cancel: vi.fn() };
  return { client: { paymentRequests } as unknown as PayOS, paymentRequests };
}

function setup(over: { mode?: 'real' | 'fake' | 'off' } = {}) {
  const { client, paymentRequests } = sdkMock();
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };
  const config = testConfig({ payos: over.mode === undefined || over.mode === 'real' ? realPayos : { mode: over.mode, clientId: null, apiKey: null, checksumKey: null } });
  const registry = new BillingAdapterRegistry();
  const adapter = new PayosAdapter(config, client, registry, logger as never);
  return { adapter, paymentRequests, registry, logger };
}

const data = (over: Record<string, unknown> = {}) => ({
  orderCode: 1_000_000_123, amount: 199000, description: 'WM0XSNJKV', accountNumber: '12345678', reference: 'FT26309ABC',
  transactionDateTime: '2026-11-05 10:02:00', currency: 'VND', paymentLinkId: 'link-1', code: '00', desc: 'Thành công',
  counterAccountName: 'NGUYEN THI LAN', counterAccountNumber: '0123456789', counterAccountBankName: 'MB Bank', ...over,
});
const post = (body: unknown): BillingRequest => ({ method: 'POST', headers: {}, query: {}, rawBody: Buffer.from(JSON.stringify(body)) });
const signedPost = (d: Record<string, unknown>, key = KEY) => post({ code: '00', desc: 'success', success: true, data: d, signature: signPayosData(d, key) });

describe('createPayosClient (design §3.3)', () => {
  it('the SDK is built with a 4 s timeout, no retry and no logging, so a slow payOS cannot hold a lock or repeat a create', () => {
    const client = createPayosClient(realPayos);
    expect(client.timeout).toBe(4000);
    expect(client.maxRetries).toBe(0);
    expect(client.logLevel).toBe('off');
    expect(client.checksumKey).toBe(KEY);
  });
});

describe('PayosAdapter.createCheckout', () => {
  const order = {
    orderCode: 1_000_000_123, amount: 199000, description: 'WM0XSNJKV', expiresAt: new Date('2026-11-05T03:17:00.999Z'),
    returnUrl: 'https://app.example.com/vi/app/plans/order?order=o1', cancelUrl: 'https://app.example.com/vi/app/plans/order?order=o1',
  };

  it('sends exactly the order code, amount, description, both URLs and the expiry in whole seconds, and nothing about the buyer', async () => {
    const { adapter, paymentRequests } = setup();
    paymentRequests.create.mockResolvedValue({ paymentLinkId: 'link-1', checkoutUrl: 'https://pay.payos.vn/web/link-1', bin: 'x', qrCode: 'y' });
    const result = await adapter.createCheckout(order);
    expect(result).toEqual({ paymentLinkId: 'link-1', checkoutUrl: 'https://pay.payos.vn/web/link-1' });
    expect(paymentRequests.create).toHaveBeenCalledTimes(1);
    const sent = paymentRequests.create.mock.calls[0][0] as Record<string, unknown>;
    expect(sent).toEqual({
      orderCode: 1_000_000_123, amount: 199000, description: 'WM0XSNJKV', returnUrl: order.returnUrl, cancelUrl: order.cancelUrl,
      expiredAt: Math.floor(order.expiresAt.getTime() / 1000),
    });
    expect(Object.keys(sent).filter((key) => /^buyer|^items$|^invoice$/.test(key))).toEqual([]);
  });

  it('lets the SDK error through, for the caller to turn into a failed order', async () => {
    const { adapter, paymentRequests } = setup();
    paymentRequests.create.mockRejectedValue(new Error('boom'));
    await expect(adapter.createCheckout(order)).rejects.toThrow('boom');
  });
});

describe('PayosAdapter.getCheckout', () => {
  const link = (over: Record<string, unknown> = {}) => ({
    id: 'link-1', orderCode: 1_000_000_123, amount: 199000, amountPaid: 0, amountRemaining: 199000, status: 'PENDING',
    createdAt: '2026-11-05T10:00:00+07:00', transactions: [], cancellationReason: null, canceledAt: null, ...over,
  });

  it('maps each of the seven statuses to itself', async () => {
    const { adapter, paymentRequests } = setup();
    for (const status of ['PENDING', 'CANCELLED', 'UNDERPAID', 'PAID', 'EXPIRED', 'PROCESSING', 'FAILED']) {
      paymentRequests.get.mockResolvedValue(link({ status }));
      expect((await adapter.getCheckout(1_000_000_123))?.status, status).toBe(status);
    }
    expect(paymentRequests.get).toHaveBeenCalledWith(1_000_000_123);
  });

  it('an unknown status counts as PROCESSING (the job leaves the order alone) and is logged as a warning', async () => {
    const { adapter, paymentRequests, logger } = setup();
    paymentRequests.get.mockResolvedValue(link({ status: 'SOMETHING_NEW' }));
    expect((await adapter.getCheckout(1_000_000_123))?.status).toBe('PROCESSING');
    expect(logger.warn).toHaveBeenCalledWith('payos_unknown_status', expect.objectContaining({ status: 'SOMETHING_NEW' }));
  });

  it('carries the amounts and each transaction with its payer, and drops the bank fields it does not need', async () => {
    const { adapter, paymentRequests } = setup();
    paymentRequests.get.mockResolvedValue(link({
      status: 'UNDERPAID', amountPaid: 100000,
      transactions: [
        { reference: 'FT1', amount: 60000, accountNumber: 'a', description: 'd', transactionDateTime: '2026-11-05 10:02:00', virtualAccountName: 'v', virtualAccountNumber: 'n',
          counterAccountBankId: '970422', counterAccountBankName: 'MB Bank', counterAccountName: 'LAN', counterAccountNumber: '0123' },
        { reference: 'FT2', amount: 40000, accountNumber: 'a', description: 'd', transactionDateTime: '2026-11-05 10:05:00', virtualAccountName: null, virtualAccountNumber: null,
          counterAccountBankId: null, counterAccountBankName: null, counterAccountName: null, counterAccountNumber: null },
      ],
    }));
    expect(await adapter.getCheckout(1_000_000_123)).toEqual({
      status: 'UNDERPAID', amount: 199000, amountPaid: 100000,
      transactions: [
        { reference: 'FT1', amount: 60000, transactionDateTime: '2026-11-05 10:02:00',
          payer: { counterAccountName: 'LAN', counterAccountNumber: '0123', counterAccountBankName: 'MB Bank' } },
        { reference: 'FT2', amount: 40000, transactionDateTime: '2026-11-05 10:05:00', payer: null },
      ],
    });
  });

  it('a link payOS does not know is null, not an error', async () => {
    const { adapter, paymentRequests } = setup();
    paymentRequests.get.mockRejectedValue(new NotFoundError(404, { code: '101', desc: 'not found' }, 'not found', new Headers()));
    expect(await adapter.getCheckout(1_000_000_123)).toBeNull();
  });

  it('any other failure is thrown, so the caller leaves the order as it is (design §3.6)', async () => {
    const { adapter, paymentRequests } = setup();
    paymentRequests.get.mockRejectedValue(new TooManyRequestError(429, undefined, 'slow down', new Headers()));
    await expect(adapter.getCheckout(1_000_000_123)).rejects.toThrow();
  });
});

describe('PayosAdapter.cancelCheckout', () => {
  it('cancels the link by order code', async () => {
    const { adapter, paymentRequests } = setup();
    paymentRequests.cancel.mockResolvedValue({});
    await expect(adapter.cancelCheckout(1_000_000_123)).resolves.toBeUndefined();
    expect(paymentRequests.cancel).toHaveBeenCalledWith(1_000_000_123);
  });

  it('lets the SDK error through (the order stays pending and the job asks again)', async () => {
    const { adapter, paymentRequests } = setup();
    paymentRequests.cancel.mockRejectedValue(new Error('cannot cancel a paid link'));
    await expect(adapter.cancelCheckout(1_000_000_123)).rejects.toThrow('cannot cancel');
  });
});

describe('PayosAdapter.verify and ack', () => {
  it('a body signed with the checksum key gives one production event named <orderCode>:<reference>', async () => {
    const { adapter } = setup();
    const result = await adapter.verify(signedPost(data()));
    expect(result).toMatchObject({ ok: true, skipped: 0 });
    if (!result.ok) throw new Error('unreachable');
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ type: 'payment_succeeded', environment: 'production', externalEventId: '1000000123:FT26309ABC', appUserId: null });
  });

  it('a wrong signature is refused', async () => {
    const { adapter } = setup();
    expect(await adapter.verify(signedPost(data(), 'another-key'))).toEqual({ ok: false });
  });

  it('a signed body without a usable order code is acked and counted as skipped, nothing stored', async () => {
    const { adapter } = setup();
    expect(await adapter.verify(signedPost(data({ orderCode: undefined })))).toEqual({ ok: true, events: [], skipped: 1 });
  });

  it('a GET (payOS only POSTs) and an empty body are refused', async () => {
    const { adapter } = setup();
    expect(await adapter.verify({ method: 'GET', headers: {}, query: {}, rawBody: Buffer.alloc(0) })).toEqual({ ok: false });
    expect(await adapter.verify(post('not json'))).toEqual({ ok: false });
  });

  it('acks with 200', () => {
    expect(setup().adapter.ack({ received: 1 }).status).toBe(200);
  });
});

describe('PayosAdapter registration', () => {
  it('registers as "payos" only in real mode', () => {
    for (const [mode, registered] of [['real', true], ['fake', false], ['off', false]] as const) {
      const { adapter, registry } = setup({ mode });
      adapter.onModuleInit();
      expect(registry.get('payos') === adapter, mode).toBe(registered);
    }
  });
});
