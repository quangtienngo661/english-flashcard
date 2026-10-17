import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ChannelChooser } from '../../src/notifications/provider/channel-chooser.js';
import { EmailProvider } from '../../src/notifications/provider/email.provider.js';
import { NotificationProvider } from '../../src/notifications/provider/notification-provider.js';
import { SettingsService } from '../../src/settings/index.js';
import { seedUser } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

describe('notification provider and channel chooser (e2e, isolated database)', () => {
  let ctx: TestApp;
  let email: EmailProvider;
  let chooser: ChannelChooser;
  const budgetKey = `provider-${randomUUID()}`;
  const fillBudget = (sent: number) => ctx.prisma.mailBudgetBucket.upsert({
    where: { bucket: `${budgetKey}:2026-10-17` }, create: { bucket: `${budgetKey}:2026-10-17`, sent }, update: { sent },
  });

  beforeAll(async () => {
    ctx = await createTestApp({
      databaseUrl: await createIsolatedDatabase(),
      config: { mailDailyBudget: 10, mailBudgetKey: budgetKey, learnerAppUrl: 'https://wordmet.example.com' },
    });
    email = ctx.app.get(EmailProvider, { strict: false });
    chooser = ctx.app.get(ChannelChooser, { strict: false });
  });
  beforeEach(async () => {
    await ctx.prisma.mailBudgetBucket.deleteMany();
    await ctx.prisma.appSettingChange.deleteMany();
    await ctx.prisma.appSetting.deleteMany();
    await ctx.prisma.reminderPref.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.mailer.sent.length = 0;
    ctx.clock.set(new Date('2026-10-17T13:00:00Z'));
  });
  afterAll(async () => { await ctx?.close(); });

  it('EmailProvider sends the reminder in the learner\'s language to the verified address and takes one budget unit', async () => {
    expect(email).toBeInstanceOf(NotificationProvider);
    expect(email.channel).toBe('email');
    const en = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'en' });
    expect(await email.send(en.userId, { kind: 'regular', language: 'en' })).toBe('sent');
    expect(ctx.mailer.sent).toEqual([{
      to: en.email, subject: 'Time to study your words', text: expect.stringMatching(/Turn reminders off in Settings: https:\/\/wordmet\.example\.com\/en\/app\/settings$/),
    }]);
    expect((await ctx.prisma.mailBudgetBucket.findUniqueOrThrow({ where: { bucket: `${budgetKey}:2026-10-17` } })).sent).toBe(1);

    // A learner without native_language gets the vi link: the caller passes language 'vi'.
    const none = await seedUser(ctx.prisma, { verified: true });
    expect(await email.send(none.userId, { kind: 'inactive', language: 'vi' })).toBe('sent');
    expect(ctx.mailer.sent[1]).toMatchObject({ to: none.email, subject: 'Đã lâu rồi bạn chưa vào học' });
    expect(ctx.mailer.sent[1].text).toMatch(/\/vi\/app\/settings$/);
  });

  it('EmailProvider returns no-address for an unverified learner and sends nothing', async () => {
    const user = await seedUser(ctx.prisma, { verified: false });
    expect(await email.send(user.userId, { kind: 'regular', language: 'vi' })).toBe('no-address');
    expect(await email.send(randomUUID(), { kind: 'regular', language: 'vi' })).toBe('no-address');
    expect(ctx.mailer.sent).toEqual([]);
    expect(await ctx.prisma.mailBudgetBucket.count()).toBe(0);
  });

  it('at 80% of the budget it returns budget-exhausted and sends nothing', async () => {
    const user = await seedUser(ctx.prisma, { verified: true });
    await fillBudget(7);
    expect(await email.send(user.userId, { kind: 'regular', language: 'vi' })).toBe('sent');
    expect(await email.send(user.userId, { kind: 'regular', language: 'vi' })).toBe('budget-exhausted');
    expect(ctx.mailer.sent).toHaveLength(1);
    expect((await ctx.prisma.mailBudgetBucket.findFirstOrThrow()).sent).toBe(8);
  });

  it('a transient transport error is thrown to the caller', async () => {
    const user = await seedUser(ctx.prisma, { verified: true });
    ctx.mailer.failNext(new Error('SMTP 421'));
    await expect(email.send(user.userId, { kind: 'regular', language: 'vi' })).rejects.toThrow('SMTP 421');
    expect(ctx.mailer.sent).toEqual([]);
  });

  it('the chooser returns [] when the learner or the system has reminders off', async () => {
    const user = await seedUser(ctx.prisma, { verified: true });
    expect(await chooser.choose(user.userId)).toEqual([email]);

    await ctx.prisma.reminderPref.create({ data: { userId: user.userId, enabled: false, updatedAt: ctx.clock.now() } });
    expect(await chooser.choose(user.userId)).toEqual([]);
    await ctx.prisma.reminderPref.update({ where: { userId: user.userId }, data: { enabled: true } });
    expect(await chooser.choose(user.userId)).toEqual([email]);

    await ctx.app.get(SettingsService).update(randomUUID(), 0, { reminders: { enabled: false } });
    expect(await chooser.choose(user.userId)).toEqual([]);
    expect(ctx.mailer.sent).toEqual([]);
  });
});
