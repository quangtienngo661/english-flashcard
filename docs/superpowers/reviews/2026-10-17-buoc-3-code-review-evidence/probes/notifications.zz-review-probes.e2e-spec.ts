import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it, vi } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
import { MailBudget } from '../../src/common/mail/mail-budget.service.js';
import type { SupportedLanguage } from '../../src/identity/identity.types.js';
import {
  REMINDER_QUEUE, REMINDER_TICK_SCHEDULER, ReminderQueueService, type ReminderSendData,
} from '../../src/notifications/scheduler/reminder-queue.service.js';
import { ReminderSendService } from '../../src/notifications/scheduler/reminder-send.service.js';
import { ReminderTickService } from '../../src/notifications/scheduler/reminder-tick.service.js';
import { SettingsService } from '../../src/settings/index.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

// 20:30 in Ho Chi Minh on Saturday 2026-10-17: past the default 20:00 send time.
const NOW = new Date('2026-10-17T13:30:00Z');
const DAY = 86_400_000;
const BUDGET = 10;

describe('review probes (reminders)', () => {
  let databaseUrl: string;
  const apps: TestApp[] = [];
  const budgetKey = `reminders-${randomUUID()}`;
  const bucket = () => `${budgetKey}:${NOW.toISOString().slice(0, 10)}`;

  const start = async (opts: { runWorkers: boolean; queuePrefix?: string }) => {
    const ctx = await createTestApp({
      databaseUrl, redisUrl: inject('redisUrl'),
      config: { mailDailyBudget: BUDGET, mailBudgetKey: budgetKey, reminders: { tickSeconds: 1, runScheduler: true } },
      pipeline: { runWorkers: opts.runWorkers, jobBackoffMs: 10, ...(opts.queuePrefix ? { queuePrefix: opts.queuePrefix } : {}) },
    });
    ctx.clock.set(NOW);
    apps.push(ctx);
    return ctx;
  };
  const stop = async (ctx: TestApp) => {
    apps.splice(apps.indexOf(ctx), 1);
    await ctx.close();
  };
  /** A learner with one new card today (added through the Learning API) unless `cards: false`. */
  const learner = async (ctx: TestApp, opts: {
    daysAway?: number; timezone?: string; nativeLanguage?: SupportedLanguage; verified?: boolean; cards?: boolean;
  } = {}) => {
    const user = await seedUser(ctx.prisma, { verified: true, nativeLanguage: opts.nativeLanguage ?? 'vi' });
    const away = new Date(NOW.getTime() - (opts.daysAway ?? 1) * DAY);
    await ctx.prisma.user.update({ where: { id: user.userId }, data: {
      createdAt: away, timezone: opts.timezone ?? 'Asia/Ho_Chi_Minh',
    } });
    if (opts.cards ?? true) await addCard(ctx, user.userId);
    // The session used to add the card would count as a visit: put the visit back at `daysAway`.
    await ctx.prisma.sessionChain.updateMany({ where: { userId: user.userId }, data: { lastUsedAt: away } });
    if (opts.verified === false) await ctx.prisma.user.update({ where: { id: user.userId }, data: { emailVerifiedAt: null } });
    return user;
  };
  const addCard = async (ctx: TestApp, userId: string) => {
    const [senseId] = await seedVisibleSenses(ctx.prisma, 1, `r${randomUUID().slice(0, 8)}`);
    const { accessToken } = await startSession(ctx, userId);
    const write = (path: string, body: object) => ctx.http().post(path).set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID()).send(body);
    const group = await write('/v1/groups', { name: 'Reminders' });
    expect(group.status).toBe(201);
    expect((await write(`/v1/groups/${group.body.id}/items`, { sense_id: senseId })).status).toBe(201);
  };
  const deliveries = (ctx: TestApp) => ctx.prisma.reminderDelivery.findMany({ orderBy: { createdAt: 'asc' } });
  const fillBudget = (ctx: TestApp, sent: number) => ctx.prisma.mailBudgetBucket.upsert({
    where: { bucket: bucket() }, create: { bucket: bucket(), sent }, update: { sent },
  });
  const sendData = (userId: string, localDate = '2026-10-17'): ReminderSendData =>
    ({ userId, localDate, kind: 'regular', language: 'vi' });

  beforeAll(async () => { databaseUrl = await createIsolatedDatabase(); });
  afterEach(async () => {
    for (const ctx of apps.splice(0)) await ctx.close();
  });
  afterAll(async () => {
    for (const ctx of apps.splice(0)) await ctx.close();
  });
  const reset = async (ctx: TestApp) => {
    await ctx.prisma.reminderDelivery.deleteMany();
    await ctx.prisma.reminderPref.deleteMany();
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await ctx.prisma.mailBudgetBucket.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.appSettingChange.deleteMany();
    await ctx.prisma.appSetting.deleteMany();
    await ctx.prisma.user.deleteMany();
  };

  const out = (...a: unknown[]) => appendFileSync(process.env.PROBE_OUT ?? 'probe.out', a.join(' ') + '\n');

  it('R1: two processes run the same send at the same moment → one email in total', async () => {
    const a = await start({ runWorkers: false });
    await reset(a);
    const b = await start({ runWorkers: false });
    const user = await learner(a);
    const results = [];
    for (let round = 0; round < 5; round += 1) {
      await a.prisma.reminderDelivery.deleteMany();
      a.mailer.sent.length = 0; b.mailer.sent.length = 0;
      await Promise.all([
        a.app.get(ReminderSendService, { strict: false }).send(sendData(user.userId), { lastAttempt: false }),
        b.app.get(ReminderSendService, { strict: false }).send(sendData(user.userId), { lastAttempt: false }),
      ]);
      results.push(a.mailer.sent.length + b.mailer.sent.length);
    }
    out('R1 emails per round (a+b)', JSON.stringify(results), 'rows', JSON.stringify((await deliveries(a)).map((r) => r.state)));
  });

  it('R2 (M2): a failed delivery yesterday does not count for min_gap_days or the inactive weekly cap', async () => {
    const ctx = await start({ runWorkers: false });
    await reset(ctx);
    const queue = ctx.app.get(ReminderQueueService, { strict: false });
    const spy = vi.spyOn(queue, 'enqueueSend').mockResolvedValue();
    const regular = await learner(ctx, { daysAway: 1 });
    const inactive = await learner(ctx, { daysAway: 10 });
    for (const userId of [regular.userId, inactive.userId]) {
      await ctx.prisma.reminderDelivery.create({ data: { userId, localDate: new Date('2026-10-16T00:00:00Z'), kind: 'regular', state: 'failed' } });
    }
    await ctx.app.get(ReminderTickService, { strict: false }).tick();
    out('R2 jobs after a failed row yesterday', JSON.stringify(spy.mock.calls.map(([job]) => ({ who: job.userId === regular.userId ? 'regular' : 'inactive', kind: job.kind }))));
  });
});
