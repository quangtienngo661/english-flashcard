import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { NormalizedEvent } from './billing.types.js';
import { TransactionsRepository, type TransactionRow } from './transactions.repository.js';

const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const at = (iso: string) => new Date(iso);
const CTX = { userId: USER, subscriptionId: 'sub-1', provider: 'fake' };

type Where = Partial<Record<keyof TransactionRow, unknown>>;
const matches = (row: TransactionRow, where: Where) => Object.entries(where).every(([key, want]) => {
  const value = row[key as keyof TransactionRow];
  if (want !== null && typeof want === 'object' && 'not' in want) return value !== (want as { not: unknown }).not;
  return value === want;
});

/** `billing_transactions` in memory, with the unique (provider, environment, provider_transaction_id, kind). */
class FakeTx {
  rows: TransactionRow[] = [];
  billingTransaction = {
    createMany: async ({ data, skipDuplicates }: { data: TransactionRow[]; skipDuplicates?: boolean }) => {
      let count = 0;
      for (const row of data) {
        const clash = row.providerTransactionId !== null && this.rows.some((r) => r.provider === row.provider
          && r.environment === row.environment && r.providerTransactionId === row.providerTransactionId && r.kind === row.kind);
        if (clash) {
          if (!skipDuplicates) throw new Error('unique violation');
          continue;
        }
        this.rows.push({ ...row });
        count += 1;
      }
      return { count };
    },
    findFirst: async ({ where }: { where: Where }) => this.rows.find((r) => matches(r, where)) ?? null,
    updateMany: async ({ where, data }: { where: Where; data: Partial<TransactionRow> }) => {
      const hit = this.rows.filter((r) => matches(r, where));
      for (const row of hit) Object.assign(row, data);
      return { count: hit.length };
    },
  };
}

const common = {
  provider: 'fake', environment: 'sandbox' as const, externalEventId: 'evt', externalSubscriptionId: 'ext-1', appUserId: USER,
};
const PERIOD = { interval: 'month' as const, currentPeriodStart: at('2026-10-15T02:12:00Z'), currentPeriodEnd: at('2026-11-15T02:12:00Z') };

function started(fields: Partial<Extract<NormalizedEvent, { type: 'subscription_started' }>> = {}): NormalizedEvent {
  return {
    ...common, ...PERIOD, type: 'subscription_started', occurredAt: at('2026-10-15T02:12:00Z'), paymentFingerprint: null,
    trialEndsAt: null, transactionId: 'tx-1', amount: 99000, currency: 'VND', ...fields,
  } as NormalizedEvent;
}
const renewed = (transactionId: string, fields: Record<string, unknown> = {}): NormalizedEvent => ({
  ...common, ...PERIOD, type: 'renewed', occurredAt: at('2026-10-15T02:12:00Z'), transactionId, amount: 99000, currency: 'VND', ...fields,
}) as NormalizedEvent;

async function record(tx: FakeTx, event: NormalizedEvent) {
  await new TransactionsRepository().recordFromEvent(tx as never, event, CTX);
}

describe('TransactionsRepository.recordFromEvent (design §8.9)', () => {
  it('GI1: a paid subscription_started of 99.000 VND → one purchase, succeeded, with the event\'s period', async () => {
    const tx = new FakeTx();
    await record(tx, started());
    expect(tx.rows).toEqual([{
      userId: USER, subscriptionId: 'sub-1', kind: 'purchase', plan: 'pro', interval: 'month', amountMinor: 99000n, currency: 'VND',
      occurredAt: at('2026-10-15T02:12:00Z'), periodStart: PERIOD.currentPeriodStart, periodEnd: PERIOD.currentPeriodEnd,
      status: 'succeeded', provider: 'fake', environment: 'sandbox', providerTransactionId: 'tx-1',
    }]);
  });

  it('GI2: a trial start → one trial row without money, its period ending at trial_ends_at', async () => {
    const tx = new FakeTx();
    await record(tx, started({ trialEndsAt: at('2026-10-29T02:12:00Z'), transactionId: null, amount: 99000, currency: 'VND' }));
    expect(tx.rows).toHaveLength(1);
    expect(tx.rows[0]).toMatchObject({ kind: 'trial', amountMinor: null, currency: null, periodEnd: at('2026-10-29T02:12:00Z'),
      providerTransactionId: null, status: 'succeeded' });
  });

  it('GI3: renewed → a renewal row; plan_changed → a plan_change row with its interval', async () => {
    const tx = new FakeTx();
    await record(tx, renewed('tx-2'));
    await record(tx, { ...common, type: 'plan_changed', occurredAt: at('2026-10-20T00:00:00Z'), transactionId: 'tx-3',
      interval: 'year', currentPeriodStart: at('2026-10-20T00:00:00Z'), currentPeriodEnd: at('2027-10-20T00:00:00Z'),
      amount: 4.99, currency: 'USD' } as NormalizedEvent);
    expect(tx.rows.map((r) => [r.kind, r.interval, r.amountMinor, r.currency])).toEqual([
      ['renewal', 'month', 99000n, 'VND'], ['plan_change', 'year', 499n, 'USD'],
    ]);
  });

  it('GI4: refunded for a renewal → a new refund row with the event\'s amount; the renewal becomes refunded', async () => {
    const tx = new FakeTx();
    await record(tx, renewed('tx-2'));
    await record(tx, { ...common, type: 'refunded', occurredAt: at('2026-10-16T00:00:00Z'), transactionId: 'tx-2', amount: 99000,
      currency: 'VND' } as NormalizedEvent);
    expect(tx.rows.map((r) => [r.kind, r.status, r.amountMinor])).toEqual([['renewal', 'refunded', 99000n], ['refund', 'succeeded', 99000n]]);
    expect(tx.rows[1]).toMatchObject({ plan: 'pro', interval: 'month', occurredAt: at('2026-10-16T00:00:00Z'),
      periodStart: PERIOD.currentPeriodStart, periodEnd: PERIOD.currentPeriodEnd, providerTransactionId: 'tx-2' });
  });

  it('refund_reversed → the refund row becomes reversed and the original goes back to succeeded', async () => {
    const tx = new FakeTx();
    await record(tx, renewed('tx-2'));
    await record(tx, { ...common, type: 'refunded', occurredAt: at('2026-10-16T00:00:00Z'), transactionId: 'tx-2', amount: null,
      currency: null } as NormalizedEvent);
    await record(tx, { ...common, type: 'refund_reversed', occurredAt: at('2026-10-17T00:00:00Z'), transactionId: 'tx-2' } as NormalizedEvent);
    expect(tx.rows.map((r) => [r.kind, r.status])).toEqual([['renewal', 'succeeded'], ['refund', 'reversed']]);
  });

  it('a refund for a transaction the table does not know still records the refund (no plan interval, period from the event)', async () => {
    const tx = new FakeTx();
    await record(tx, { ...common, type: 'refunded', occurredAt: at('2026-10-16T00:00:00Z'), transactionId: 'tx-old', amount: 99000,
      currency: 'VND' } as NormalizedEvent);
    expect(tx.rows).toEqual([expect.objectContaining({ kind: 'refund', interval: null, periodStart: at('2026-10-16T00:00:00Z'),
      periodEnd: null, amountMinor: 99000n })]);
  });

  it('GI5: the same charge twice → one row', async () => {
    const tx = new FakeTx();
    await record(tx, renewed('tx-2'));
    await record(tx, renewed('tx-2'));
    expect(tx.rows).toHaveLength(1);
  });

  it('GI6: no amount, or an amount without a currency → amount_minor null', async () => {
    const tx = new FakeTx();
    await record(tx, renewed('tx-2', { amount: null, currency: null }));
    await record(tx, renewed('tx-3', { amount: 99000, currency: null }));
    expect(tx.rows.map((r) => [r.amountMinor, r.currency])).toEqual([[null, null], [null, null]]);
  });

  it('other event types write nothing', async () => {
    const tx = new FakeTx();
    await record(tx, { ...common, type: 'expired', occurredAt: at('2026-10-16T00:00:00Z') } as NormalizedEvent);
    expect(tx.rows).toEqual([]);
  });

  it('GI10: the migration creates the table without copying old subscriptions', () => {
    const dir = join(import.meta.dirname, '../../../prisma/migrations');
    const name = readdirSync(dir).find((d) => d.endsWith('_billing_transactions'));
    expect(name).toBeDefined();
    const sql = readFileSync(join(dir, name!, 'migration.sql'), 'utf8');
    expect(sql).toMatch(/CREATE TABLE "billing_transactions"/);
    expect(sql).not.toMatch(/INSERT INTO/i);
  });
});
