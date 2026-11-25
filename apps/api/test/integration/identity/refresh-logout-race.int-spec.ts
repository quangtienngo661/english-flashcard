import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../support/create-test-app.js';
import { createIsolatedDatabase } from '../../support/isolated-database.js';

describe('TST-01/F-03: concurrent refresh vs logout race on real Postgres', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    const databaseUrl = await createIsolatedDatabase();
    ctx = await createTestApp({
      databaseUrl,
      config: { turnstile: { mode: 'off', secretKey: null, allowedHostnames: [] } },
    });
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('never leaves a usable refresh token across 20 concurrent refresh+logout races', async () => {
    const email = `race.${randomUUID().slice(0, 8)}@example.test`;
    const password = 'RacePassword123!';

    const reg = await ctx.http().post('/v1/auth/register').send({
      email,
      password,
      given_name: 'Race',
      family_name: 'User',
      birth_date: '1995-05-05',
      accept_terms: true,
      client: 'mobile',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    expect(reg.status).toBe(201);

    await ctx.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: ctx.clock.now() },
    });

    for (let i = 0; i < 20; i++) {
      // Advance past rate-limit windows so 20 iterations never hit auth.login.ip / auth.refresh.ip
      ctx.clock.advance(120_000);

      const login = await ctx.http().post('/v1/auth/login').send({
        email,
        password,
        client: 'mobile',
      });
      expect(login.status).toBe(200);
      const t1: string = login.body.refresh_token;
      expect(typeof t1).toBe('string');

      const [refreshRes, logoutRes] = await Promise.all([
        ctx.http().post('/v1/auth/refresh').send({ refresh_token: t1 }),
        ctx.http().post('/v1/auth/logout').send({ refresh_token: t1 }),
      ]);
      expect(logoutRes.status).toBe(204);

      // Whatever token refresh returned (if it won the lock first) MUST be rejected after logout finished.
      if (refreshRes.status === 200 && typeof refreshRes.body?.refresh_token === 'string') {
        const followUp = await ctx.http().post('/v1/auth/refresh').send({
          refresh_token: refreshRes.body.refresh_token,
        });
        expect(followUp.status).toBe(401);
      } else {
        expect(refreshRes.status).toBe(401);
      }

      // Original T1 is also unusable.
      const reuseOld = await ctx.http().post('/v1/auth/refresh').send({ refresh_token: t1 });
      expect(reuseOld.status).toBe(401);
    }
  });
});
