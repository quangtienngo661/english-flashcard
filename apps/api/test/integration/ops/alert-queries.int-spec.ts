import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eventKind } from '../../../src/entitlements/billing/billing.types.js';
import { createIntegrationPrisma, type IntegrationPrisma } from '../support/integration-prisma.js';

function readCountQuery(relativeFromRepoRoot: string): string {
  const fullPath = fileURLToPath(new URL(`../../../../../${relativeFromRepoRoot}`, import.meta.url));
  const sql = readFileSync(fullPath, 'utf8');
  return sql.split(/^--\s*detail\b/m)[0].trim();
}

describe('Ops alert SQL queries (PAY-03, PAY-04, A2.2)', () => {
  let db: IntegrationPrisma;

  beforeAll(async () => {
    db = await createIntegrationPrisma();
  });

  afterAll(async () => {
    await db?.close();
  });

  it('payments-ignored.sql counts only recent real-code unknown-order and link-mismatch ignored events', async () => {
    const now = new Date();
    const older25h = new Date(now.getTime() - 25 * 3600_000);
    const kind = eventKind('payment_succeeded');

    await db.prisma.billingEvent.createMany({
      data: [
        {
          provider: 'payos', environment: 'production', dedupeKey: 'payos:production:1100000001:R1',
          externalEventId: '1100000001:R1', type: 'payment_succeeded', kind,
          occurredAt: now, receivedAt: now, status: 'ignored', error: 'unknown-order',
        },
        {
          provider: 'payos', environment: 'production', dedupeKey: 'payos:production:1100000002:R2',
          externalEventId: '1100000002:R2', type: 'payment_succeeded', kind,
          occurredAt: now, receivedAt: now, status: 'ignored', error: 'link-mismatch',
        },
        {
          provider: 'payos', environment: 'production', dedupeKey: 'payos:production:123:R3',
          externalEventId: '123:R3', type: 'payment_succeeded', kind,
          occurredAt: now, receivedAt: now, status: 'ignored', error: 'unknown-order',
        },
        {
          provider: 'payos', environment: 'production', dedupeKey: 'payos:production:1100000003:R4',
          externalEventId: '1100000003:R4', type: 'payment_succeeded', kind,
          occurredAt: older25h, receivedAt: older25h, status: 'ignored', error: 'unknown-order',
        },
        {
          provider: 'payos', environment: 'production', dedupeKey: 'payos:production:1100000004:R5',
          externalEventId: '1100000004:R5', type: 'payment_succeeded', kind,
          occurredAt: now, receivedAt: now, status: 'ignored', error: 'not-success',
        },
      ],
    });

    const query = readCountQuery('deploy/sql/alerts/payments-ignored.sql');
    const rows = await db.prisma.$queryRawUnsafe<Array<{ count: number }>>(query);
    expect(Number(rows[0]?.count)).toBe(2);
  });

  it('paid-with-review-reason.sql counts only paid orders with a non-null review_reason', async () => {
    const now = new Date();
    const userId = randomUUID();
    await db.prisma.billingOrder.createMany({
      data: [
        {
          userId, provider: 'payos', environment: 'production', orderCode: 1_100_000_201n,
          description: 'WM2010001', periodMonths: 1, amountMinor: 79_000n, currency: 'VND',
          status: 'paid', reviewReason: 'extra-payment', paidVia: 'webhook',
          expiresAt: new Date(now.getTime() + 900_000),
        },
        {
          userId, provider: 'payos', environment: 'production', orderCode: 1_100_000_202n,
          description: 'WM2010002', periodMonths: 1, amountMinor: 79_000n, currency: 'VND',
          status: 'paid', reviewReason: null, paidVia: 'webhook',
          expiresAt: new Date(now.getTime() + 900_000),
        },
        {
          userId, provider: 'payos', environment: 'production', orderCode: 1_100_000_203n,
          description: 'WM2010003', periodMonths: 1, amountMinor: 79_000n, currency: 'VND',
          status: 'needs_review', reviewReason: 'amount-short', paidVia: null,
          expiresAt: new Date(now.getTime() + 900_000),
        },
      ],
    });

    const query = readCountQuery('deploy/sql/alerts/paid-with-review-reason.sql');
    const rows = await db.prisma.$queryRawUnsafe<Array<{ count: number }>>(query);
    expect(Number(rows[0]?.count)).toBe(1);
  });
});
