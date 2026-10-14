import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

const problem = (slug: string) => `https://api.example.com/problems/${slug}`;

describe('must_change_password gate (e2e)', () => {
  let ctx: TestApp;
  let userId: string;
  let email: string;
  let password: string;
  let token: string;
  const account = () => ctx.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { passwordCredential: true } });
  const get = (path: string, access = token) => ctx.http().get(path).set('Authorization', `Bearer ${access}`);
  const change = (body: object, access = token) => ctx.http().post('/v1/auth/password/change')
    .set('Authorization', `Bearer ${access}`).send(body);

  beforeAll(async () => { ctx = await createTestApp(); });
  beforeEach(async () => {
    ctx.clock.set(new Date('2026-10-14T12:00:00Z'));
    await ctx.prisma.rateLimitCounter.deleteMany();
    ({ userId, email, password } = await seedUser(ctx.prisma, { verified: true, staffRole: 'admin', mustChangePassword: true }));
    token = (await startSession(ctx, userId, 'web')).accessToken;
    ctx.mailer.sent.length = 0;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B25#26: flagged user → 403 password-change-required on GET /v1/admin/staff, /v1/admin/content/uploads, /v1/admin/taxonomy/topics; /v1/me (200, must_change_password true), POST /v1/auth/refresh, /v1/auth/logout still work', async () => {
    for (const path of ['/v1/admin/staff', '/v1/admin/content/uploads', '/v1/admin/taxonomy/topics']) {
      const res = await get(path);
      expect(res.status).toBe(403);
      expect(res.body.type).toBe(problem('password-change-required'));
    }
    const me = await get('/v1/me');
    expect(me.status).toBe(200);
    expect(me.body.must_change_password).toBe(true);
    const login = await ctx.http().post('/v1/auth/login').send({ email, password, client: 'mobile' });
    expect(login.status).toBe(200);
    const refreshed = await ctx.http().post('/v1/auth/refresh').send({ refresh_token: login.body.refresh_token });
    expect(refreshed.status).toBe(200);
    const logout = await ctx.http().post('/v1/auth/logout').set('Authorization', `Bearer ${refreshed.body.access_token}`)
      .send({ refresh_token: refreshed.body.refresh_token });
    expect(logout.status).toBeLessThan(300);
  });

  it('B25#26: after POST /v1/auth/password/change the flag is false (read back from DB) and GET /v1/admin/staff is 200 with the new access token', async () => {
    const res = await change({ current_password: password, new_password: 'BrandNew1!pw' });
    expect(res.status).toBe(200);
    expect((await account()).mustChangePassword).toBe(false);
    expect((await get('/v1/admin/staff', res.body.access_token)).status).toBe(200);
  });

  it('B25#26: after a successful reset the flag is false', async () => {
    const issued = await ctx.http().post('/v1/auth/otp').send({ purpose: 'reset_password', email });
    expect(issued.status).toBe(202);
    await ctx.drainMail();
    const reset = await ctx.http().post('/v1/auth/password/reset')
      .send({ email, code: ctx.mailer.otpFor(email)!, new_password: 'ResetPass1!x' });
    expect(reset.status).toBeLessThan(300);
    expect((await account()).mustChangePassword).toBe(false);
  });

  it("B25#27 (API): change with new_password equal to the current one → 400 violations ['same_as_current'], hash unchanged, sessions not revoked", async () => {
    const before = await account();
    const res = await change({ current_password: password, new_password: password });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe(problem('validation-failed'));
    expect(res.body.violations).toEqual(['same_as_current']);
    const after = await account();
    expect(after.passwordCredential?.hash).toBe(before.passwordCredential?.hash);
    expect(after.mustChangePassword).toBe(true);
    expect((await get('/v1/me')).status).toBe(200);
    expect(await ctx.prisma.sessionChain.count({ where: { userId, revokedAt: null } })).toBe(1);
  });
});
