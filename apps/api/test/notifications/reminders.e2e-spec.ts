import { Queue, UnrecoverableError } from 'bullmq';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it, vi } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
import { MailBudget } from '../../src/common/mail/mail-budget.service.js';
import type { SupportedLanguage } from '../../src/identity/identity.types.js';
import {
  REMINDER_QUEUE, REMINDER_TICK_SCHEDULER, reminderJobId, ReminderQueueService, type ReminderSendData,
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
// Errors shaped like nodemailer's (code, command, responseCode); see mail-error.ts.
const smtpError = (message: string, fields: object) => Object.assign(new Error(message), fields);
const transientError = () => smtpError('SMTP 421', { code: 'EENVELOPE', responseCode: 421, command: 'MAIL FROM' });
const permanentError = () => smtpError('SMTP 550', { code: 'EENVELOPE', responseCode: 550, command: 'RCPT TO' });
const unknownError = () => smtpError('Timeout', { code: 'ETIMEDOUT', command: 'CONN' });

describe('reminder scheduler and send jobs (e2e, isolated database)', () => {
  let databaseUrl: string;
  const apps: TestApp[] = [];
  const budgetKey = `reminders-${randomUUID()}`;
  const bucket = () => `${budgetKey}:${NOW.toISOString().slice(0, 10)}`;

  const start = async (opts: { runWorkers: boolean; queuePrefix?: string }) => {
    const ctx = await createTestApp({
      databaseUrl, redisUrl: inject('redisUrl'),
      config: { mailDailyBudget: BUDGET, mailBudgetKey: budgetKey, reminders: { tickSeconds: 1, runScheduler: true, retryBackoffMs: 10 } },
      pipeline: { runWorkers: opts.runWorkers, ...(opts.queuePrefix ? { queuePrefix: opts.queuePrefix } : {}) },
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

  describe('one send job (design 8.3)', () => {
    let ctx: TestApp;
    let send: ReminderSendService;
    beforeEach(async () => {
      ctx = await start({ runWorkers: false });
      await reset(ctx);
      send = ctx.app.get(ReminderSendService, { strict: false });
    });

    it('B3E26: sends once, marks the day sent, and a re-run after sent sends nothing', async () => {
      const user = await learner(ctx);
      await send.send(sendData(user.userId), { lastAttempt: false });
      expect(ctx.mailer.sent.map((mail) => mail.to)).toEqual([user.email]);
      expect(await deliveries(ctx)).toMatchObject([{ userId: user.userId, kind: 'regular', state: 'sent', sentAt: NOW }]);
      await send.send(sendData(user.userId), { lastAttempt: false });
      expect(ctx.mailer.sent).toHaveLength(1);
      expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'reminder_skipped', reason: 'delivery-sent' }));
      expect(JSON.stringify(ctx.logs)).not.toContain(user.email);
    });

    it('B3E25: a job that finds sending (or failed) sends nothing and leaves the row', async () => {
      const user = await learner(ctx);
      for (const state of ['sending', 'failed']) {
        await ctx.prisma.reminderDelivery.deleteMany();
        await ctx.prisma.reminderDelivery.create({
          data: { userId: user.userId, localDate: new Date('2026-10-17T00:00:00Z'), kind: 'regular', state },
        });
        await send.send(sendData(user.userId), { lastAttempt: false });
        expect(ctx.mailer.sent, state).toEqual([]);
        expect((await deliveries(ctx)).map((row) => row.state), state).toEqual([state]);
      }
    });

    it('B3E24 / B3#17: turned off by the learner or the system before the job runs → no email, no row', async () => {
      const user = await learner(ctx);
      await ctx.prisma.reminderPref.create({ data: { userId: user.userId, enabled: false, updatedAt: NOW } });
      await send.send(sendData(user.userId), { lastAttempt: false });
      await ctx.prisma.reminderPref.deleteMany();
      const admin = await seedUser(ctx.prisma, { verified: true, staffRole: 'admin' });
      await ctx.app.get(SettingsService).update(admin.userId, 0, { reminders: { enabled: false } });
      await send.send(sendData(user.userId), { lastAttempt: false });
      expect(ctx.mailer.sent).toEqual([]);
      expect(await deliveries(ctx)).toEqual([]);
    });

    it('D27: a learner with no card left today gets no email and no row, even with a job already queued', async () => {
      const user = await learner(ctx, { cards: false });
      await send.send(sendData(user.userId), { lastAttempt: false });
      expect(ctx.mailer.sent).toEqual([]);
      expect(await deliveries(ctx)).toEqual([]);
      expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'reminder_skipped', reason: 'no-cards-left' }));
    });

    it('B3#17 / B3E28: an unverified learner gets no email and no row', async () => {
      const user = await learner(ctx, { verified: false });
      await send.send(sendData(user.userId), { lastAttempt: false });
      expect(ctx.mailer.sent).toEqual([]);
      expect(await deliveries(ctx)).toEqual([]);
    });

    it('B3E23: at 80% of the budget the job sends nothing and frees the day', async () => {
      const user = await learner(ctx);
      await fillBudget(ctx, 8);
      await send.send(sendData(user.userId), { lastAttempt: false });
      expect(ctx.mailer.sent).toEqual([]);
      expect(await deliveries(ctx)).toEqual([]);
      expect(await ctx.app.get(MailBudget).sentToday()).toBe(8);
    });

    it('M9: a transient SMTP error (4xx, not delivered) frees the day for the retry; on the last attempt the day is failed', async () => {
      const user = await learner(ctx);
      const error = transientError();
      ctx.mailer.failNext(error);
      await expect(send.send(sendData(user.userId), { lastAttempt: false })).rejects.toBe(error);
      expect(await deliveries(ctx)).toEqual([]);
      ctx.mailer.failNext(error);
      await expect(send.send(sendData(user.userId), { lastAttempt: true })).rejects.toBe(error);
      expect(await deliveries(ctx)).toMatchObject([{ state: 'failed', sentAt: null }]);
      expect(ctx.mailer.sent).toEqual([]);
      // Each attempt spent one budget unit (design 8.3).
      expect(await ctx.app.get(MailBudget).sentToday()).toBe(2);
    });

    it('M7: a permanent SMTP error (5xx) marks the day failed at once and stops retries, for one budget unit', async () => {
      const user = await learner(ctx);
      ctx.mailer.failNext(permanentError());
      await expect(send.send(sendData(user.userId), { lastAttempt: false })).rejects.toBeInstanceOf(UnrecoverableError);
      expect(await deliveries(ctx)).toMatchObject([{ state: 'failed', sentAt: null }]);
      expect(await ctx.app.get(MailBudget).sentToday()).toBe(1);
      expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'reminder_failed', reason: 'permanent' }));
    });

    it('M9 / D37: an error that leaves delivery unknown keeps the day sending, is not retried, and a re-run sends nothing', async () => {
      const user = await learner(ctx);
      ctx.mailer.failNext(unknownError());
      await send.send(sendData(user.userId), { lastAttempt: false });
      expect(await deliveries(ctx)).toMatchObject([{ state: 'sending' }]);
      expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'reminder_outcome_unknown', user_id: user.userId }));
      await send.send(sendData(user.userId), { lastAttempt: false });
      expect(ctx.mailer.sent).toEqual([]);
      expect(await ctx.app.get(MailBudget).sentToday()).toBe(1);
    });

    it('L13: a job that runs on a later local day than its own sends nothing and leaves no row', async () => {
      const user = await learner(ctx);
      // NOW is 2026-10-17 in Ho Chi Minh; the job was for the 16th.
      await send.send(sendData(user.userId, '2026-10-16'), { lastAttempt: false });
      expect(ctx.mailer.sent).toEqual([]);
      expect(await deliveries(ctx)).toEqual([]);
      expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'reminder_skipped', reason: 'stale-day' }));
    });

    it('T-D6 / B3#18: at 80% of the budget a reminder is refused while a real OTP still goes out through its route', async () => {
      const user = await learner(ctx);
      await fillBudget(ctx, 8);
      await send.send(sendData(user.userId), { lastAttempt: false });
      expect(ctx.mailer.sent).toEqual([]);
      const unverified = await seedUser(ctx.prisma, { verified: false });
      const { accessToken } = await startSession(ctx, unverified.userId);
      const otp = await ctx.http().post('/v1/auth/otp').set('Authorization', `Bearer ${accessToken}`).send({ purpose: 'verify_email' });
      expect(otp.status).toBe(202);
      await ctx.drainMail();
      expect(ctx.mailer.otpFor(unverified.email)).toMatch(/^\d{6}$/);
      expect(await ctx.app.get(MailBudget).sentToday()).toBe(9);
    });
  });

  it('T-D1 / Review Focus 4: two processes run the same send job at the same moment → one email, five rounds in a row', async () => {
    const a = await start({ runWorkers: false });
    await reset(a);
    const b = await start({ runWorkers: false });
    const user = await learner(a);
    const emails: number[] = [];
    for (let round = 0; round < 5; round += 1) {
      await a.prisma.reminderDelivery.deleteMany();
      a.mailer.sent.length = 0;
      b.mailer.sent.length = 0;
      await Promise.all([a, b].map((ctx) =>
        ctx.app.get(ReminderSendService, { strict: false }).send(sendData(user.userId), { lastAttempt: false })));
      emails.push(a.mailer.sent.length + b.mailer.sent.length);
      expect((await deliveries(a)).map((row) => row.state)).toEqual(['sent']);
    }
    expect(emails).toEqual([1, 1, 1, 1, 1]);
  });

  describe('the tick (design 8.1, 8.2)', () => {
    let ctx: TestApp;
    let tick: ReminderTickService;
    let queued: ReminderSendData[];
    const jobs = () => queued;
    beforeEach(async () => {
      ctx = await start({ runWorkers: false });
      await reset(ctx);
      tick = ctx.app.get(ReminderTickService, { strict: false });
      // Workers are off here: record what the tick would enqueue.
      queued = [];
      vi.spyOn(ctx.app.get(ReminderQueueService, { strict: false }), 'enqueueSend')
        .mockImplementation(async (data) => { queued.push(data); });
    });

    it('picks verified learners past their send time with no delivery today, in their language', async () => {
      const vi1 = await learner(ctx);
      const en = await learner(ctx, { nativeLanguage: 'en' });
      await learner(ctx, { verified: false });
      const off = await learner(ctx);
      await ctx.prisma.reminderPref.create({ data: { userId: off.userId, enabled: false, updatedAt: NOW } });
      const done = await learner(ctx);
      await ctx.prisma.reminderDelivery.create({
        data: { userId: done.userId, localDate: new Date('2026-10-17T00:00:00Z'), kind: 'regular', state: 'sent' },
      });
      // 08:30 in New York: before 20:00 there.
      await learner(ctx, { timezone: 'America/New_York' });
      await tick.tick();
      expect(jobs().toSorted((a, b) => a.userId.localeCompare(b.userId))).toEqual([
        { userId: vi1.userId, localDate: '2026-10-17', kind: 'regular', language: 'vi' },
        { userId: en.userId, localDate: '2026-10-17', kind: 'regular', language: 'en' },
      ].toSorted((a, b) => a.userId.localeCompare(b.userId)));
    });

    it('D27: no job for a learner with no items, or whose card for today is already answered', async () => {
      await learner(ctx, { cards: false });
      const done = await learner(ctx);
      const [item] = await ctx.prisma.learningItem.findMany({ where: { userId: done.userId } });
      const [group] = await ctx.prisma.learningGroup.findMany({ where: { userId: done.userId } });
      const { accessToken } = await startSession(ctx, done.userId);
      const review = await ctx.http().post('/v1/reviews').set('Authorization', `Bearer ${accessToken}`)
        .send({ item_id: item.id, group_id: group.id, answer: 'known', review_id: randomUUID() });
      expect(review.status).toBe(200);
      await ctx.prisma.sessionChain.updateMany({ where: { userId: done.userId }, data: { lastUsedAt: new Date(NOW.getTime() - DAY) } });
      const left = await learner(ctx);
      await tick.tick();
      expect(jobs()).toEqual([{ userId: left.userId, localDate: '2026-10-17', kind: 'regular', language: 'vi' }]);
    });

    it('D44: a regular reminder sent yesterday blocks today with min_gap_days 2; the day after is allowed', async () => {
      const user = await learner(ctx);
      await ctx.prisma.reminderDelivery.create({
        data: { userId: user.userId, localDate: new Date('2026-10-16T00:00:00Z'), kind: 'regular', state: 'sent' },
      });
      await tick.tick();
      expect(jobs()).toEqual([]);
      ctx.clock.set(new Date(NOW.getTime() + DAY));
      await tick.tick();
      expect(jobs()).toMatchObject([{ userId: user.userId, localDate: '2026-10-18', kind: 'regular' }]);
    });

    it('M7: a failed day yesterday does not hold back a regular reminder but does count toward the inactive cap', async () => {
      const regular = await learner(ctx, { daysAway: 1 });
      const inactive = await learner(ctx, { daysAway: 10 });
      for (const { userId } of [regular, inactive]) {
        await ctx.prisma.reminderDelivery.create({
          data: { userId, localDate: new Date('2026-10-16T00:00:00Z'), kind: 'regular', state: 'failed' },
        });
      }
      await tick.tick();
      expect(jobs()).toEqual([{ userId: regular.userId, localDate: '2026-10-17', kind: 'regular', language: 'vi' }]);
    });

    it('L13 / D37: a sending row left from yesterday counts as sent for min_gap_days', async () => {
      const user = await learner(ctx);
      await ctx.prisma.reminderDelivery.create({
        data: { userId: user.userId, localDate: new Date('2026-10-16T00:00:00Z'), kind: 'regular', state: 'sending' },
      });
      await tick.tick();
      expect(jobs()).toEqual([]);
    });

    it('T-D5: in Etc/GMT+12 the job carries the local date, a day behind the UTC date', async () => {
      ctx.clock.set(new Date('2026-10-18T09:00:00Z')); // 21:00 on 2026-10-17 in Etc/GMT+12
      const user = await learner(ctx, { timezone: 'Etc/GMT+12' });
      await tick.tick();
      expect(jobs()).toEqual([{ userId: user.userId, localDate: '2026-10-17', kind: 'regular', language: 'vi' }]);
    });

    it('inactive: 10 days away → the inactive email; again within 7 days → none; 61 days away → none', async () => {
      const away = await learner(ctx, { daysAway: 10 });
      await learner(ctx, { daysAway: 61 });
      await tick.tick();
      expect(jobs()).toEqual([{ userId: away.userId, localDate: '2026-10-17', kind: 'inactive', language: 'vi' }]);
      await ctx.prisma.reminderDelivery.create({
        data: { userId: away.userId, localDate: new Date('2026-10-17T00:00:00Z'), kind: 'inactive', state: 'sent' },
      });
      queued = [];
      ctx.clock.set(new Date(NOW.getTime() + 6 * DAY));
      await tick.tick();
      expect(jobs()).toEqual([]);
    });

    it('B3#18 / B3E23: with budget 7 the tick stops at 5 sent (floor of 80%) and an OTP-sized send still succeeds', async () => {
      await ctx.close();
      apps.splice(apps.indexOf(ctx), 1);
      ctx = await createTestApp({ databaseUrl, config: { mailDailyBudget: 7, mailBudgetKey: budgetKey } });
      ctx.clock.set(NOW);
      apps.push(ctx);
      const recorded: ReminderSendData[] = [];
      vi.spyOn(ctx.app.get(ReminderQueueService, { strict: false }), 'enqueueSend')
        .mockImplementation(async (data) => { recorded.push(data); });
      await learner(ctx);
      await fillBudget(ctx, 4);
      await ctx.app.get(ReminderTickService, { strict: false }).tick();
      expect(recorded).toHaveLength(1);
      recorded.length = 0;
      await fillBudget(ctx, 5);
      await ctx.app.get(ReminderTickService, { strict: false }).tick();
      expect(recorded).toEqual([]);
      expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'reminder_tick_skipped', reason: 'budget-exhausted' }));
      expect(await ctx.app.get(MailBudget).tryConsume()).toBe(true);
    });

    it('T-D4 / B3E29: moving east starts the next local date early; min_gap_days still counts local dates', async () => {
      const user = await learner(ctx);
      await ctx.prisma.reminderDelivery.create({
        data: { userId: user.userId, localDate: new Date('2026-10-17T00:00:00Z'), kind: 'regular', state: 'sent' },
      });
      await ctx.prisma.user.update({ where: { id: user.userId }, data: { timezone: 'Pacific/Kiritimati' } });
      ctx.clock.set(new Date('2026-10-18T06:30:00Z')); // 20:30 on 2026-10-18 in Kiritimati
      await tick.tick();
      expect(jobs()).toEqual([]); // one local day after the 17th: under min_gap_days 2
      await ctx.app.get(SettingsService).update(randomUUID(), 0, { reminders: { min_gap_days: 1 } });
      await tick.tick();
      expect(jobs()).toEqual([{ userId: user.userId, localDate: '2026-10-18', kind: 'regular', language: 'vi' }]);
    });

    it('B3E29: moving west back into a local date that already has a delivery sends nothing', async () => {
      const user = await learner(ctx);
      await ctx.prisma.reminderDelivery.create({
        data: { userId: user.userId, localDate: new Date('2026-10-17T00:00:00Z'), kind: 'regular', state: 'sent' },
      });
      // Moving west to New York: still 2026-10-17 there, which already has a delivery.
      await ctx.prisma.user.update({ where: { id: user.userId }, data: { timezone: 'America/New_York' } });
      ctx.clock.set(new Date('2026-10-18T01:00:00Z')); // 21:00 on 2026-10-17 in New York
      await tick.tick();
      expect(jobs()).toEqual([]);
    });
  });

  describe('with workers on (BullMQ Job Scheduler)', () => {
    let connection: Redis;
    beforeAll(() => { connection = new Redis(inject('redisUrl'), { maxRetriesPerRequest: null }); });
    afterAll(async () => { await connection.quit(); });
    const schedulers = async (prefix: string) => {
      const queue = new Queue(REMINDER_QUEUE, { connection, prefix });
      try { return await queue.getJobSchedulers(); } finally { await queue.close(); }
    };

    it('the API process (runWorkers false) creates no scheduler and no worker', async () => {
      const ctx = await start({ runWorkers: false });
      expect(ctx.app.get(ReminderQueueService, { strict: false }).running).toBe(false);
      expect(await schedulers(ctx.app.get<AppConfig>(APP_CONFIG).pipeline.queuePrefix)).toEqual([]);
    });

    it('B3#16 / B3E27: an eligible learner gets exactly one email in that local day across many ticks', async () => {
      const ctx = await start({ runWorkers: true });
      await reset(ctx);
      const prefix = ctx.app.get<AppConfig>(APP_CONFIG).pipeline.queuePrefix;
      expect(await schedulers(prefix)).toMatchObject([{ key: REMINDER_TICK_SCHEDULER, every: 1000 }]);
      const user = await learner(ctx);
      await vi.waitFor(() => { expect(ctx.mailer.sent).toHaveLength(1); }, { timeout: 10_000, interval: 100 });
      await Promise.all([1, 2, 3].map(() => ctx.app.get(ReminderTickService, { strict: false }).tick()));
      await sleep(2_500);
      expect(ctx.mailer.sent.map((mail) => mail.to)).toEqual([user.email]);
      expect(await deliveries(ctx)).toMatchObject([{ userId: user.userId, state: 'sent' }]);
    });

    it('T-D2 / B3E27: a second send job with the same id is not added while the first waits', async () => {
      const ctx = await start({ runWorkers: true });
      const raw = new Queue(REMINDER_QUEUE, { connection, prefix: ctx.app.get<AppConfig>(APP_CONFIG).pipeline.queuePrefix });
      try {
        await raw.pause();
        const userId = randomUUID();
        const queue = ctx.app.get(ReminderQueueService, { strict: false });
        await queue.enqueueSend(sendData(userId));
        await queue.enqueueSend(sendData(userId));
        const sends = (await raw.getJobs(['waiting', 'delayed', 'active'])).filter((job) => job.name === 'send');
        expect(sends.map((job) => job.id)).toEqual([reminderJobId(userId, '2026-10-17')]);
      } finally {
        await raw.obliterate({ force: true });
        await raw.close();
      }
    });

    it('T-D3: one transient SMTP error is retried by the worker into exactly one email', async () => {
      const ctx = await start({ runWorkers: true });
      await reset(ctx);
      ctx.mailer.failNext(transientError());
      const user = await learner(ctx);
      await vi.waitFor(() => { expect(ctx.mailer.sent).toHaveLength(1); }, { timeout: 10_000, interval: 100 });
      await sleep(2_500);
      expect(ctx.mailer.sent.map((mail) => mail.to)).toEqual([user.email]);
      expect(await deliveries(ctx)).toMatchObject([{ state: 'sent' }]);
      expect(await ctx.app.get(MailBudget).sentToday()).toBe(2);
    });

    it('M7: a permanent SMTP error is tried once by the worker: one budget unit, the day failed, no email', async () => {
      const ctx = await start({ runWorkers: true });
      await reset(ctx);
      ctx.mailer.failNext(permanentError(), 3);
      await learner(ctx);
      await vi.waitFor(async () => { expect(await deliveries(ctx)).toMatchObject([{ state: 'failed' }]); },
        { timeout: 10_000, interval: 100 });
      await sleep(2_500);
      expect(ctx.mailer.sent).toEqual([]);
      expect(await ctx.app.get(MailBudget).sentToday()).toBe(1);
    });

    it('three transient SMTP errors leave the day failed, three budget units spent, and no further try that day', async () => {
      const ctx = await start({ runWorkers: true });
      await reset(ctx);
      ctx.mailer.failNext(transientError(), 3);
      await learner(ctx);
      await vi.waitFor(async () => { expect(await deliveries(ctx)).toMatchObject([{ state: 'failed' }]); },
        { timeout: 10_000, interval: 100 });
      await sleep(2_500);
      expect(ctx.mailer.sent).toEqual([]);
      expect(await ctx.app.get(MailBudget).sentToday()).toBe(3);
      expect(await deliveries(ctx)).toMatchObject([{ state: 'failed' }]);
    });

    it('Review Focus 4: two workers sharing one database and queue prefix tick together and send exactly one email', async () => {
      const queuePrefix = `wordmet-test-${randomUUID()}`;
      const a = await start({ runWorkers: true, queuePrefix });
      const b = await start({ runWorkers: true, queuePrefix });
      await reset(a);
      const user = await learner(a);
      await Promise.all([a, b].flatMap((ctx) => [1, 2].map(() => ctx.app.get(ReminderTickService, { strict: false }).tick())));
      await vi.waitFor(() => { expect(a.mailer.sent.length + b.mailer.sent.length).toBe(1); }, { timeout: 10_000, interval: 100 });
      await sleep(2_500);
      expect([...a.mailer.sent, ...b.mailer.sent].map((mail) => mail.to)).toEqual([user.email]);
      expect(await deliveries(a)).toMatchObject([{ userId: user.userId, state: 'sent' }]);
      await stop(b);
    });
  });
});
