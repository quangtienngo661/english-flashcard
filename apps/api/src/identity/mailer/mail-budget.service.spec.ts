import { describe, expect, it, vi } from 'vitest';
import { testConfig } from '../../../test/support/test-config.js';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { MailBudget } from './mail-budget.service.js';

function setup(budget = 2) {
  const config = testConfig({ mailDailyBudget: budget, mailBudgetKey: 'test' });
  const clock = new FakeClock(new Date('2026-10-07T23:59:59.000Z'));
  const buckets = new Map<string, number>();
  const logs: LogEntry[] = [];
  const findUnique = vi.fn(async ({ where }: { where: { bucket: string } }) => {
    const sent = buckets.get(where.bucket);
    return sent === undefined ? null : { bucket: where.bucket, sent };
  });
  const upsert = vi.fn(async (args: {
    create: { bucket: string; sent: number }; update: { sent: { increment: number } };
  }) => {
    const previous = buckets.get(args.create.bucket);
    const sent = previous === undefined ? args.create.sent : previous + args.update.sent.increment;
    buckets.set(args.create.bucket, sent);
    return { bucket: args.create.bucket, sent };
  });
  const prisma = { mailBudgetBucket: { findUnique, upsert } } as unknown as PrismaClient;
  const logger = new AppLogger({ write: (entry) => { logs.push(entry); } });
  return { budget: new MailBudget(prisma, config, clock, logger), buckets, clock, logs, findUnique, upsert };
}

describe('MailBudget', () => {
  it('B1#30: pre-check is read-only and returns 503 mail-unavailable at the limit', async () => {
    const { budget, upsert } = setup();
    await budget.assertAvailable();
    expect(upsert).not.toHaveBeenCalled();
    expect(await budget.tryConsume()).toBe(true);
    await budget.assertAvailable();
    expect(await budget.tryConsume()).toBe(true);
    const error = await budget.assertAvailable().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ProblemDetailsException);
    expect((error as ProblemDetailsException).getStatus()).toBe(503);
    expect(error).toMatchObject({ problemType: 'mail-unavailable' });
    expect(await budget.tryConsume()).toBe(false);
  });

  it('B1#30: a zero budget rejects even an absent bucket', async () => {
    const { budget } = setup(0);
    await expect(budget.assertAvailable()).rejects.toMatchObject({ problemType: 'mail-unavailable' });
    expect(await budget.tryConsume()).toBe(false);
  });

  it('B1E15: uses one native-upsert-shaped atomic increment with matching keys', async () => {
    const { budget, upsert, findUnique } = setup();
    await budget.tryConsume();
    expect(findUnique).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledExactlyOnceWith({
      where: { bucket: 'test:2026-10-07' },
      create: { bucket: 'test:2026-10-07', sent: 1 },
      update: { sent: { increment: 1 } },
    });
  });

  it('B1E15: ten concurrent consumers admit exactly three with budget three', async () => {
    const { budget, buckets } = setup(3);
    const results = await Promise.all(Array.from({ length: 10 }, () => budget.tryConsume()));
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(buckets.get('test:2026-10-07')).toBe(10);
  });

  it('B1#30: warns exactly once per UTC bucket at the rounded-up 80 percent threshold', async () => {
    const { budget, clock, logs } = setup(5);
    await Promise.all(Array.from({ length: 3 }, () => budget.tryConsume()));
    expect(logs).toEqual([]);
    await Promise.all(Array.from({ length: 7 }, () => budget.tryConsume()));
    expect(logs).toEqual([expect.objectContaining({ level: 'warn', event: 'mail_budget_80' })]);
    clock.advance(1000);
    await Promise.all(Array.from({ length: 5 }, () => budget.tryConsume()));
    expect(logs).toHaveLength(2);
    expect(logs[1]).toMatchObject({ level: 'warn', event: 'mail_budget_80' });
  });

  it('B1#30: a new UTC day opens a new bucket even when the previous one is full', async () => {
    const { budget, clock, buckets } = setup(1);
    await budget.tryConsume();
    await expect(budget.assertAvailable()).rejects.toBeInstanceOf(ProblemDetailsException);
    clock.advance(1000);
    await budget.assertAvailable();
    expect(await budget.tryConsume()).toBe(true);
    expect([...buckets.keys()]).toEqual(['test:2026-10-07', 'test:2026-10-08']);
  });

  it('B1E15: database failures propagate to the caller for dispatcher handling', async () => {
    const { budget, findUnique, upsert } = setup();
    const error = new Error('database failed');
    findUnique.mockRejectedValueOnce(error);
    upsert.mockRejectedValueOnce(error);
    await expect(budget.assertAvailable()).rejects.toBe(error);
    await expect(budget.tryConsume()).rejects.toBe(error);
  });
});
