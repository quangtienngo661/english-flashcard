import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { MailBudget, mailLimit, REMINDER_MAIL_SHARE } from '../../src/common/mail/mail-budget.service.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

describe('mail budget ceiling (e2e, real Postgres)', () => {
  let ctx: TestApp | undefined;
  afterEach(async () => { await ctx?.close(); ctx = undefined; });

  // A fresh bucket key per app keeps suites sharing the database apart.
  const budgetFor = async (mailDailyBudget: number) => {
    ctx = await createTestApp({ config: { mailDailyBudget, mailBudgetKey: `mail-budget-${randomUUID()}` } });
    ctx.clock.set(new Date('2026-10-17T20:00:00Z'));
    return ctx.app.get(MailBudget, { strict: false });
  };
  const consume = async (budget: MailBudget, times: number, opts?: { ceiling: number }) => {
    const results: boolean[] = [];
    for (let i = 0; i < times; i += 1) results.push(await budget.tryConsume(opts));
    return results;
  };

  it('B3#18 (budget): with budget 10, tryConsume({ ceiling: 0.8 }) succeeds 8 times then fails while plain tryConsume still reaches 10', async () => {
    const budget = await budgetFor(10);
    expect(await budget.sentToday()).toBe(0);
    expect(await consume(budget, 10, { ceiling: REMINDER_MAIL_SHARE })).toEqual([...Array(8).fill(true), false, false]);
    // A refused ceiling consumer takes nothing from the bucket.
    expect(await budget.sentToday()).toBe(8);
    expect(await consume(budget, 3)).toEqual([true, true, false]);
    expect(await budget.sentToday()).toBe(11);
    expect(await budget.tryConsume({ ceiling: REMINDER_MAIL_SHARE })).toBe(false);
    expect(await budget.sentToday()).toBe(11);
  });

  it('B3#18 (budget): with budget 7 the ceiling consumer stops after mailLimit(7, 0.8) = 5', async () => {
    const budget = await budgetFor(7);
    expect(mailLimit(7, REMINDER_MAIL_SHARE)).toBe(5);
    expect(await consume(budget, 7, { ceiling: REMINDER_MAIL_SHARE })).toEqual([true, true, true, true, true, false, false]);
    expect(await budget.sentToday()).toBe(5);
  });

  it('a ceiling of zero mails never creates a bucket row', async () => {
    const budget = await budgetFor(1);
    expect(await budget.tryConsume({ ceiling: REMINDER_MAIL_SHARE })).toBe(false);
    expect(await budget.sentToday()).toBe(0);
    expect(await consume(budget, 1)).toEqual([true]);
  });

  it('two concurrent ceiling consumers never pass the ceiling', async () => {
    const budget = await budgetFor(10);
    const results = await Promise.all(Array.from({ length: 30 }, () => budget.tryConsume({ ceiling: REMINDER_MAIL_SHARE })));
    expect(results.filter(Boolean)).toHaveLength(8);
    expect(await budget.sentToday()).toBe(8);
  });

  it('sentToday reads the bucket of the current UTC day', async () => {
    const budget = await budgetFor(10);
    await consume(budget, 2);
    expect(await budget.sentToday()).toBe(2);
    ctx!.clock.set(new Date('2026-10-18T00:00:00Z'));
    expect(await budget.sentToday()).toBe(0);
  });
});
