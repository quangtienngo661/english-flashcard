import { APIError, NotFoundError, type PayOS } from '@payos/node';
import { describe, expect, it, vi } from 'vitest';
import { orderCodeAt, orderCodeSecond, orderDescription } from '../entitlements/orders/order-codes.js';
import { PROBE_GAP, PROBE_USAGE, formatProbeRow, parseProbeArgs } from './orders-probe-payos-args.js';
import { probe } from './orders-probe-payos.js';

describe('parseProbeArgs', () => {
  it('reads --from and --to as ISO instants and defaults gap to 3', () => {
    const parsed = parseProbeArgs(['--from', '2026-11-17T10:00:00Z', '--to', '2026-11-17T10:02:00Z']);
    expect(parsed).toEqual({ ok: true, from: new Date('2026-11-17T10:00:00Z'), to: new Date('2026-11-17T10:02:00Z'), gap: 3 });
    expect(PROBE_GAP).toBe(3);
  });

  it('accepts a window of exactly 24 hours', () => {
    expect(parseProbeArgs(['--from', '2026-11-17T10:00:00Z', '--to', '2026-11-18T10:00:00Z']).ok).toBe(true);
  });

  it('accepts a --from exactly at the start of time-based order codes', () => {
    expect(parseProbeArgs(['--from', '2026-11-17T00:00:00Z', '--to', '2026-11-17T01:00:00Z']).ok).toBe(true);
  });

  it('accepts an offset and the equals form', () => {
    const parsed = parseProbeArgs(['--from=2026-11-17T17:00:00+07:00', '--to=2026-11-17T10:02:00Z']);
    expect(parsed).toEqual({ ok: true, from: new Date('2026-11-17T10:00:00Z'), to: new Date('2026-11-17T10:02:00Z'), gap: 3 });
  });

  it.each([
    [['--from', '2026-11-17T10:00:00Z'], '--to is required'],
    [['--to', '2026-11-17T10:00:00Z'], '--from is required'],
    [[], '--from is required'],
    [['--from', 'x', '--to', '2026-11-17T10:00:00Z'], '--from is not an ISO 8601 instant: x'],
    [['--from', '2026-11-17', '--to', '2026-11-18'], '--from is not an ISO 8601 instant: 2026-11-17'],
    [['--from', '2026-11-17T10:00:00Z', '--to', '2026-13-17T10:00:00Z'], '--to is not an ISO 8601 instant: 2026-13-17T10:00:00Z'],
    [['--from', '2026-11-17T10:00:00Z', '--to', '2026-11-17T10:00:00Z'], '--to must be after --from'],
    [['--from', '2026-11-17T10:00:00Z', '--to', '2026-11-17T09:00:00Z'], '--to must be after --from'],
    [['--from', '2026-11-17T10:00:00Z', '--to', '2026-11-18T10:00:01Z'], 'the window must not be longer than 24 hours'],
    [['--from', '2026-11-17T10:00:00Z', '--to', '2026-11-17T11:00:00Z', '--gap', '5'], 'unknown argument: --gap'],
    [['--from'], '--from needs a value'],
    [['--from', '2026-11-16T23:59:59Z', '--to', '2026-11-17T01:00:00Z'], '--from is before 2026-11-17T00:00:00Z, the start of time-based order codes'],
  ])('rejects %j with "%s"', (argv, error) => {
    expect(parseProbeArgs(argv)).toEqual({ ok: false, error });
  });

  it('has a usage line naming both flags', () => {
    expect(PROBE_USAGE).toContain('--from');
    expect(PROBE_USAGE).toContain('--to');
  });
});

const NOT_FOUND = () => new NotFoundError(404, { code: '101', desc: 'not found' }, 'not found', new Headers());

type Link = { amount?: number; amountPaid?: number; status?: string; createdAt?: string; transactions?: unknown[] };

function fakeClient(links: Map<number, Link>, failOn?: { code: number; error: Error }) {
  const get = vi.fn(async (code: number) => {
    if (failOn && failOn.code === code) throw failOn.error;
    const link = links.get(code);
    if (!link) throw NOT_FOUND();
    return {
      id: `link-${code}`, orderCode: code, amount: 99_000, amountPaid: 0, amountRemaining: 99_000, status: 'PENDING',
      createdAt: '2026-11-17T10:00:00+07:00', cancellationReason: null, canceledAt: null, transactions: [], ...link,
    };
  });
  return { client: { paymentRequests: { get } } as unknown as Pick<PayOS, 'paymentRequests'>, get };
}

const T0 = new Date('2026-11-17T10:00:00Z');
const SECOND0 = orderCodeSecond(T0);

describe('probe', () => {
  it('walks each second until gap consecutive misses and returns the links in code order', async () => {
    const links = new Map<number, Link>([
      [orderCodeAt(SECOND0, 0), { status: 'PAID', amountPaid: 99_000 }],
      [orderCodeAt(SECOND0, 1), {}],
      [orderCodeAt(SECOND0 + 2, 0), { status: 'CANCELLED' }],
    ]);
    const { client, get } = fakeClient(links);
    const sleep = vi.fn(async (_ms: number) => undefined);
    const rows = await probe(client, { from: T0, to: new Date(T0.getTime() + 2000), gap: 3 }, sleep);
    expect(rows.map((r) => r.orderCode)).toEqual([orderCodeAt(SECOND0, 0), orderCodeAt(SECOND0, 1), orderCodeAt(SECOND0 + 2, 0)]);
    expect(rows[0]).toMatchObject({ description: orderDescription(orderCodeAt(SECOND0, 0)), status: 'PAID', amount: 99_000, amountPaid: 99_000 });
    // second 0: slots 0,1 found + 3 misses = 5 calls; second 1: 3 misses; second 2: slot 0 found + 3 misses = 4 calls.
    expect(get.mock.calls.map(([code]) => code)).toEqual([
      ...[0, 1, 2, 3, 4].map((s) => orderCodeAt(SECOND0, s)),
      ...[0, 1, 2].map((s) => orderCodeAt(SECOND0 + 1, s)),
      ...[0, 1, 2, 3].map((s) => orderCodeAt(SECOND0 + 2, s)),
    ]);
  });

  it('walks past empty slots when payOS returns HTTP 200 with code 101 (PAY-01)', async () => {
    const err101 = () => APIError.generateError(
      200,
      { data: null, code: '101', desc: 'Mã thanh toán không tồn tại', signature: null },
      'Mã thanh toán không tồn tại',
      new Headers(),
    );
    const paidCode = orderCodeAt(SECOND0, 1);
    const get = vi.fn(async (code: number) => {
      if (code === paidCode) {
        return {
          id: `link-${code}`, orderCode: code, amount: 79_000, amountPaid: 79_000, amountRemaining: 0, status: 'PAID',
          createdAt: '2026-11-17T10:00:00+07:00', cancellationReason: null, canceledAt: null, transactions: [],
        };
      }
      throw err101();
    });
    const client = { paymentRequests: { get } } as unknown as Pick<PayOS, 'paymentRequests'>;
    const printed: number[] = [];
    const rows = await probe(client, { from: T0, to: T0, gap: 2 }, async () => undefined, (row) => {
      printed.push(row.amountPaid);
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ orderCode: paidCode, status: 'PAID', amount: 79_000, amountPaid: 79_000 });
    expect(printed).toEqual([79_000]);
    // slot 0 miss (1), slot 1 hit (reset), slot 2 miss (1), slot 3 miss (2 -> stop)
    expect(get.mock.calls.map(([code]) => code)).toEqual([
      orderCodeAt(SECOND0, 0), orderCodeAt(SECOND0, 1), orderCodeAt(SECOND0, 2), orderCodeAt(SECOND0, 3),
    ]);
  });

  it('hands each row to onRow as soon as its link is found, before the walk goes on, and still returns all rows', async () => {
    const links = new Map<number, Link>([[orderCodeAt(SECOND0, 0), {}], [orderCodeAt(SECOND0 + 1, 0), {}]]);
    const { client, get } = fakeClient(links);
    const seen: Array<{ code: number; callsSoFar: number }> = [];
    const rows = await probe(client, { from: T0, to: new Date(T0.getTime() + 1000), gap: 3 }, async () => undefined, (row) => {
      seen.push({ code: row.orderCode, callsSoFar: get.mock.calls.length });
    });
    // Row 1 arrives after call 1 (slot 0 of second 0); calls 2-4 are its 3 misses, so slot 0 of second 1 is call 5.
    expect(seen).toEqual([
      { code: orderCodeAt(SECOND0, 0), callsSoFar: 1 },
      { code: orderCodeAt(SECOND0 + 1, 0), callsSoFar: 5 },
    ]);
    expect(rows.map((r) => r.orderCode)).toEqual(seen.map((s) => s.code));
  });

  it('calls get exactly gap times for a second with nothing, and sleeps 100 ms between two calls (not before the first)', async () => {
    const { client, get } = fakeClient(new Map());
    const sleep = vi.fn(async (_ms: number) => undefined);
    const rows = await probe(client, { from: T0, to: new Date(T0.getTime() + 500), gap: 3 }, sleep);
    expect(rows).toEqual([]);
    expect(get).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep.mock.calls.every(([ms]) => ms === 100)).toBe(true);
  });

  it('stops at slot 99 when every slot of a second has a link', async () => {
    const links = new Map<number, Link>();
    for (let slot = 0; slot < 100; slot++) links.set(orderCodeAt(SECOND0, slot), {});
    const { client, get } = fakeClient(links);
    const rows = await probe(client, { from: T0, to: T0, gap: 3 }, async () => undefined);
    expect(rows).toHaveLength(100);
    expect(get).toHaveBeenCalledTimes(100);
  });

  it('resets the miss counter after a hit (a hole inside the gap does not end the second)', async () => {
    const links = new Map<number, Link>([[orderCodeAt(SECOND0, 0), {}], [orderCodeAt(SECOND0, 3), {}]]);
    const { client } = fakeClient(links);
    const rows = await probe(client, { from: T0, to: T0, gap: 3 }, async () => undefined);
    expect(rows.map((r) => r.orderCode)).toEqual([orderCodeAt(SECOND0, 0), orderCodeAt(SECOND0, 3)]);
  });

  it('rethrows any error that is not NotFoundError', async () => {
    const boom = new Error('payOS is down');
    const { client } = fakeClient(new Map(), { code: orderCodeAt(SECOND0, 1), error: boom });
    await expect(probe(client, { from: T0, to: T0, gap: 3 }, async () => undefined)).rejects.toBe(boom);
  });

  it('lists the payer names but never an account number', async () => {
    const links = new Map<number, Link>([
      [orderCodeAt(SECOND0, 0), {
        status: 'PAID', amountPaid: 99_000,
        transactions: [
          { reference: 'r1', amount: 99_000, accountNumber: '9999888877', description: 'x', transactionDateTime: 'now', virtualAccountName: null,
            virtualAccountNumber: '5555666677', counterAccountBankId: '970', counterAccountBankName: 'ACB', counterAccountName: 'NGUYEN VAN A', counterAccountNumber: '1234567890' },
          { reference: 'r2', amount: 0, accountNumber: '9999888877', description: 'x', transactionDateTime: 'now', virtualAccountName: null,
            virtualAccountNumber: null, counterAccountBankId: null, counterAccountBankName: null, counterAccountName: null, counterAccountNumber: null },
        ],
      }],
    ]);
    const { client } = fakeClient(links);
    const rows = await probe(client, { from: T0, to: T0, gap: 3 }, async () => undefined);
    expect(rows[0].payers).toEqual(['NGUYEN VAN A']);
    const printed = formatProbeRow(rows[0]);
    expect(printed).toContain('NGUYEN VAN A');
    for (const number of ['1234567890', '9999888877', '5555666677']) {
      expect(JSON.stringify(rows)).not.toContain(number);
      expect(printed).not.toContain(number);
    }
  });
});

describe('formatProbeRow', () => {
  it('prints one tab-separated line: code, description, status, amount, paid, created, payers', () => {
    const line = formatProbeRow({
      orderCode: 1_100_000_000, description: 'WM1ABCDEF', status: 'PAID', amount: 99_000, amountPaid: 99_000,
      createdAt: '2026-11-17T10:00:00+07:00', payers: ['A', 'B'],
    });
    expect(line).toBe('1100000000\tWM1ABCDEF\tPAID\t99000\t99000\t2026-11-17T10:00:00+07:00\tA; B');
  });
});
