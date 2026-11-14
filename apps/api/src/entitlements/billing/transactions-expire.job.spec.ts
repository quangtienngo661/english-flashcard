import { describe, expect, it, vi } from 'vitest';
import type { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { TransactionsExpireJob } from './transactions-expire.job.js';

function setup(years = 10) {
  const values = structuredClone(SETTINGS_DEFAULTS);
  values.entitlements.transactionRetentionYears = years;
  const deleteMany = vi.fn(async (_a: unknown) => ({ count: 3 }));
  const deleteOrders = vi.fn(async (_a: unknown) => ({ count: 2 }));
  const registered: string[] = [];
  const job = new TransactionsExpireJob(
    { billingTransaction: { deleteMany }, billingOrder: { deleteMany: deleteOrders } } as unknown as PrismaClient,
    { register: (name: string) => registered.push(name) } as unknown as MaintenanceScheduler,
    { get: async () => values } as unknown as SettingsService,
  );
  return { job, deleteMany, deleteOrders, registered };
}

describe('TransactionsExpireJob (D15)', () => {
  it('registers as billing.transactions-expire', () => {
    const s = setup();
    s.job.onModuleInit();
    expect(s.registered).toEqual(['billing.transactions-expire']);
  });

  it('keeps every transaction of the boundary year: with 10 years in 2026 the cut is 1 January 2016, Asia/Ho_Chi_Minh', async () => {
    const s = setup(10);
    expect(await s.job.run(new Date('2026-10-29T12:00:00Z'))).toBe(3);
    // 2016-01-01T00:00+07:00 = 2015-12-31T17:00Z: a record of 31 December 2015 at 23:00 HCM is before it, 1 January 2016 00:30 HCM is not.
    expect(s.deleteMany).toHaveBeenCalledWith({ where: { occurredAt: { lt: new Date('2015-12-31T17:00:00.000Z') } } });
  });

  it('uses the Ho Chi Minh calendar year: 31 December 17:30 UTC is already next year there', async () => {
    const s = setup(5);
    await s.job.run(new Date('2026-12-31T17:30:00Z'));
    expect(s.deleteMany).toHaveBeenCalledWith({ where: { occurredAt: { lt: new Date('2021-12-31T17:00:00.000Z') } } });
  });
});

describe('TransactionsExpireJob — orders (launch prep B design §3.2 "Giữ hồ sơ")', () => {
  it('deletes the orders in a final state created before the same cut, with their payments and periods (the foreign keys cascade)', async () => {
    const s = setup(10);
    await s.job.run(new Date('2026-10-29T12:00:00Z'));
    expect(s.deleteOrders).toHaveBeenCalledWith({
      where: { status: { in: ['paid', 'expired', 'cancelled', 'failed', 'closed'] }, createdAt: { lt: new Date('2015-12-31T17:00:00.000Z') } },
    });
  });

  it('never deletes an order that is waiting (pending) or waiting for staff (needs_review)', async () => {
    const s = setup(10);
    await s.job.run(new Date('2026-10-29T12:00:00Z'));
    const statuses = (s.deleteOrders.mock.calls[0][0] as { where: { status: { in: string[] } } }).where.status.in;
    expect(statuses).not.toContain('pending');
    expect(statuses).not.toContain('needs_review');
  });

  it('still returns the number of transactions it removed', async () => {
    expect(await setup(10).job.run(new Date('2026-10-29T12:00:00Z'))).toBe(3);
  });
});
