import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookieFrom } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

describe('Log audit across Identity flows (e2e, isolated database)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    // Budget 5: the four mails below reach ceil(0.8 * 5) = 4, so mail_budget_80 fires once.
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config: { mailDailyBudget: 5 } });
    ctx.clock.set(new Date('2026-10-07T12:00:00Z'));
  });
  afterAll(async () => { await ctx?.close(); });

  it('B1#32: no log entry leaks passwords, OTP codes, tokens, cookies, raw IP or a failed-login email', async () => {
    const email = `audit-${randomUUID()}@example.com`;
    const ghost = `ghost-${randomUUID()}@example.com`;
    const passwords = ['Audit-Pass1!', 'Audit-Pass2!', 'Audit-Pass3!'];
    const secrets: string[] = [...passwords, ghost];
    const keep = (...values: Array<string | undefined>) => { for (const v of values) if (v) secrets.push(v); };

    // 1. Register (mobile) and verify the email with the mailed code.
    const registered = await ctx.http().post('/v1/auth/register')
      .send({ email, password: passwords[0], timezone: 'Asia/Ho_Chi_Minh', client: 'mobile' });
    expect(registered.status).toBe(201);
    keep(registered.body.access_token, registered.body.refresh_token);
    await ctx.drainMail();
    const verifyCode = ctx.mailer.otpFor(email)!;
    keep(verifyCode);
    const verified = await ctx.http().post('/v1/auth/verify-email')
      .set('Authorization', `Bearer ${registered.body.access_token}`).send({ code: verifyCode });
    expect(verified.status).toBe(200);

    // 2. Failed login with an unknown email.
    expect((await ctx.http().post('/v1/auth/login').send({ email: ghost, password: passwords[0], client: 'mobile' })).status).toBe(401);

    // 3. Refresh, then replay the rotated token after the grace window (reuse detected).
    const rotated = await ctx.http().post('/v1/auth/refresh').send({ refresh_token: registered.body.refresh_token });
    expect(rotated.status).toBe(200);
    keep(rotated.body.access_token, rotated.body.refresh_token);
    ctx.clock.advance(11_000);
    expect((await ctx.http().post('/v1/auth/refresh').send({ refresh_token: registered.body.refresh_token })).status).toBe(401);

    // 4. Web login (cookie) and a password change.
    const web = await ctx.http().post('/v1/auth/login').send({ email, password: passwords[0], client: 'web' });
    expect(web.status).toBe(200);
    const cookie = cookieFrom(web)!;
    keep(web.body.access_token, cookie, cookie.split('=')[1]);
    const changed = await ctx.http().post('/v1/auth/password/change')
      .set('Authorization', `Bearer ${web.body.access_token}`)
      .send({ current_password: passwords[0], new_password: passwords[1] });
    expect(changed.status).toBe(200);
    keep(changed.body.access_token, cookieFrom(changed));

    // 5. Forgot password: request a reset code and use it.
    expect((await ctx.http().post('/v1/auth/otp').send({ purpose: 'reset_password', email })).status).toBe(202);
    await ctx.drainMail();
    const resetCode = ctx.mailer.otpFor(email)!;
    keep(resetCode);
    expect(resetCode).not.toBe(verifyCode);
    const reset = await ctx.http().post('/v1/auth/password/reset')
      .send({ email, code: resetCode, new_password: passwords[2] });
    expect(reset.status).toBe(204);
    await ctx.drainMail();

    // Control: the audit actually saw the flows it claims to cover.
    const events = ctx.logs.map((entry) => entry.event);
    expect(events).toEqual(expect.arrayContaining(['otp_sent', 'login_failed', 'refresh_reuse_detected', 'mail_budget_80']));

    const dump = JSON.stringify(ctx.logs);
    for (const secret of secrets) {
      expect(dump.includes(secret), `log contains a secret value (${secret.slice(0, 4)}…)`).toBe(false);
    }
    expect(dump).not.toContain('127.0.0.1');
    for (const entry of ctx.logs) {
      expect(entry.operation_id, `entry ${entry.event} lacks operation_id`).toEqual(expect.any(String));
    }
    expect(ctx.logs.find((e) => e.event === 'refresh_reuse_detected')?.level).toBe('warn');
    expect(ctx.logs.find((e) => e.event === 'mail_budget_80')?.level).toBe('warn');
  });
});
