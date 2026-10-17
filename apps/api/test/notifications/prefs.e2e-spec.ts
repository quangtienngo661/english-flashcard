import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

describe('reminder preferences (e2e, isolated database)', () => {
  let ctx: TestApp;
  const learner = async (verified = true) => {
    const user = await seedUser(ctx.prisma, { verified });
    return { ...user, token: (await startSession(ctx, user.userId)).accessToken };
  };
  const get = (token: string) => ctx.http().get('/v1/me/reminders').set('Authorization', `Bearer ${token}`);
  const patch = (token: string, body: unknown, key: string | null = randomUUID()) => {
    const req = ctx.http().patch('/v1/me/reminders').set('Authorization', `Bearer ${token}`);
    if (key !== null) req.set('Idempotency-Key', key);
    return req.send(body as object);
  };

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  beforeEach(async () => {
    await ctx.prisma.reminderDelivery.deleteMany();
    await ctx.prisma.reminderPref.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-17T08:00:00Z'));
  });
  afterAll(async () => { await ctx?.close(); });

  it('D25: enabled by default; PATCH false persists and another learner is unaffected', async () => {
    const a = await learner();
    const b = await learner();
    expect((await get(a.token)).body).toEqual({ enabled: true, email_verified: true });
    expect(await ctx.prisma.reminderPref.count()).toBe(0);

    const off = await patch(a.token, { enabled: false });
    expect(off.status).toBe(200);
    expect(off.body).toEqual({ enabled: false, email_verified: true });
    expect((await get(a.token)).body).toEqual({ enabled: false, email_verified: true });
    expect(await ctx.prisma.reminderPref.findUniqueOrThrow({ where: { userId: a.userId } }))
      .toEqual({ userId: a.userId, enabled: false, updatedAt: new Date('2026-10-17T08:00:00Z') });
    expect((await get(b.token)).body).toEqual({ enabled: true, email_verified: true });
    expect(await ctx.prisma.reminderPref.findUnique({ where: { userId: b.userId } })).toBeNull();

    ctx.clock.set(new Date('2026-10-17T08:05:00Z'));
    expect((await patch(a.token, { enabled: true })).body).toEqual({ enabled: true, email_verified: true });
    expect((await ctx.prisma.reminderPref.findUniqueOrThrow({ where: { userId: a.userId } })).updatedAt)
      .toEqual(new Date('2026-10-17T08:05:00Z'));
  });

  it('B3E28: email_verified is false for an unverified learner', async () => {
    const user = await learner(false);
    expect((await get(user.token)).body).toEqual({ enabled: true, email_verified: false });
  });

  it('PATCH requires authentication, an Idempotency-Key and a strict body; nothing is stored on refusal', async () => {
    const user = await learner();
    expect((await ctx.http().get('/v1/me/reminders')).status).toBe(401);
    expect((await ctx.http().patch('/v1/me/reminders').set('Idempotency-Key', randomUUID()).send({ enabled: false })).status).toBe(401);
    expect((await patch(user.token, { enabled: false }, null)).status).toBe(400);
    for (const body of [{}, { enabled: 'no' }, { enabled: false, extra: 1 }]) {
      const res = await patch(user.token, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    }
    expect(await ctx.prisma.reminderPref.count()).toBe(0);
  });

  it('reminder_deliveries keeps one row per learner and local date', async () => {
    const user = await learner();
    const row = { userId: user.userId, localDate: new Date('2026-10-17'), kind: 'regular', state: 'sending' };
    await ctx.prisma.reminderDelivery.create({ data: row });
    await expect(ctx.prisma.reminderDelivery.create({ data: { ...row, kind: 'inactive' } })).rejects.toMatchObject({ code: 'P2002' });
    await ctx.prisma.reminderDelivery.create({ data: { ...row, localDate: new Date('2026-10-18') } });
    await expect(ctx.prisma.reminderDelivery.create({ data: { ...row, localDate: new Date('2026-10-19'), state: 'queued' } })).rejects.toThrow();
    await expect(ctx.prisma.reminderDelivery.create({ data: { ...row, localDate: new Date('2026-10-20'), kind: 'weekly' } })).rejects.toThrow();
    for (const state of ['sent', 'failed']) {
      await ctx.prisma.reminderDelivery.create({ data: { ...row, localDate: new Date(`2026-10-2${state === 'sent' ? 1 : 2}`), state } });
    }
    expect(await ctx.prisma.reminderDelivery.count()).toBe(4);
  });
});
