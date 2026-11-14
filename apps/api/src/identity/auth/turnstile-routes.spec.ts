import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import type { IssuedSession } from '../sessions/session.service.js';
import type { TurnstileVerdict } from '../turnstile/turnstile-client.js';
import { TurnstileClient } from '../turnstile/turnstile-client.js';
import { AuthService } from './auth.service.js';
import { OtpService } from './otp.service.js';
import { PasswordService } from './password.service.js';

// Same isolation as auth.controller.spec: routing, the real TurnstileGuard, RateLimitGuard and validation run; persistence and the services are stubbed.
// Owner 14/11/2026: the bot check stays on register and login only; OTP requests, verify-email and password reset have the route counters alone.
describe('Turnstile on register and login (HTTP, launch prep A); none on OTP, verify-email and password reset', () => {
  let ctx: TestApp;
  let verdict: TurnstileVerdict;
  const verify = vi.fn(async (_token: string, _ip: string | undefined) => verdict);
  const register = vi.spyOn(AuthService.prototype, 'register');
  const login = vi.spyOn(AuthService.prototype, 'login');
  const requestReset = vi.spyOn(OtpService.prototype, 'requestPasswordReset');
  const requestVerify = vi.spyOn(OtpService.prototype, 'requestVerifyEmail');
  const verifyEmail = vi.spyOn(AuthService.prototype, 'verifyEmail');
  const reset = vi.spyOn(PasswordService.prototype, 'reset');
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const turnstile_token = 'tok-http-1';
  const registerBody = { email: 'a@example.com', password: 'Password1!', timezone: 'Asia/Ho_Chi_Minh', client: 'web',
    given_name: 'Lan', birth_date: '2000-01-01', accept_terms: true, turnstile_token };
  const loginBody = { email: 'a@example.com', password: 'Password1!', client: 'web', turnstile_token };
  const rulesHit = () => hit.mock.calls.map(([rule]) => rule);

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: { $disconnect: async () => {} } }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({
      databaseUrl: 'unused',
      config: { turnstile: { mode: 'real', secretKey: 'secret', allowedHostnames: ['wordmet.com', 'www.wordmet.com', 'admin.wordmet.com'] } },
      providers: [{ provide: TurnstileClient, useValue: { verify } }],
    });
  });
  beforeEach(() => {
    verdict = { kind: 'ok', hostname: 'wordmet.com' };
    verify.mockClear();
    const issued: IssuedSession = { accessToken: 'access', refreshToken: 'refresh', sessionChainId: randomUUID(), client: 'web',
      refreshExpiresAt: new Date(ctx.clock.now().getTime() + 86_400_000) };
    register.mockReset().mockResolvedValue({ email: registerBody.email });
    login.mockReset().mockResolvedValue(issued);
    requestReset.mockReset().mockResolvedValue(undefined);
    requestVerify.mockReset().mockResolvedValue(undefined);
    verifyEmail.mockReset().mockResolvedValue(issued);
    reset.mockReset().mockResolvedValue(undefined);
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('a wrong token is 400 captcha-failed and the route counters are not touched (guard order)', async () => {
    verdict = { kind: 'rejected', codes: ['invalid-input-response'] };
    const res = await ctx.http().post('/v1/auth/register').send(registerBody);
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.example.com/problems/captcha-failed');
    expect(register).not.toHaveBeenCalled();
    expect(rulesHit()).toEqual(['auth.captcha.ip']);
  });

  it('LA1#1: register with a good token → 201, the route counters count after the bot check, the service runs', async () => {
    const res = await ctx.http().post('/v1/auth/register').send(registerBody);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ email: registerBody.email, verification_required: true });
    expect(rulesHit()).toEqual(['auth.captcha.ip', 'auth.register.ip', 'mail.ip.daily']);
    expect(verify).toHaveBeenCalledExactlyOnceWith(turnstile_token, expect.any(String));
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('LA1#2: login with a good token → 200', async () => {
    const res = await ctx.http().post('/v1/auth/login').send(loginBody);
    expect(res.status).toBe(200);
    expect(rulesHit()).toEqual(['auth.captcha.ip', 'auth.login.ip']);
    expect(login).toHaveBeenCalledTimes(1);
  });

  const verifyBody = { email: 'a@example.com', password: 'Password1!', code: '012345', client: 'web' };
  const resetBody = { email: 'a@example.com', code: '012345', new_password: 'Password1!' };

  it.each(['verify_email', 'reset_password'])('an OTP request (%s) without a token → 202: no Cloudflare check, only the route counters (owner 14/11/2026)', async (purpose) => {
    const res = await ctx.http().post('/v1/auth/otp').send({ purpose, email: 'a@example.com' });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({});
    expect(rulesHit()).toEqual(['auth.otp.ip', 'mail.ip.daily']);
    expect(verify).not.toHaveBeenCalled();
  });

  it('verify-email without a token → 200: the route counter counts, Cloudflare is not asked', async () => {
    const res = await ctx.http().post('/v1/auth/verify-email').send(verifyBody);
    expect(res.status).toBe(200);
    expect(rulesHit()).toEqual(['auth.verify.ip']);
    expect(verify).not.toHaveBeenCalled();
    expect(verifyEmail).toHaveBeenCalledTimes(1);
  });

  it('password reset without a token → 204: the route counter counts, Cloudflare is not asked', async () => {
    const res = await ctx.http().post('/v1/auth/password/reset').send(resetBody);
    expect(res.status).toBe(204);
    expect(rulesHit()).toEqual(['auth.reset.ip']);
    expect(verify).not.toHaveBeenCalled();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['otp', { purpose: 'reset_password', email: 'a@example.com' }], ['verify-email', verifyBody], ['password/reset', resetBody],
  ])('a client that still sends a token to %s (the admin app, an old tab) is not refused and the token is not checked', async (route, body) => {
    verdict = { kind: 'rejected', codes: ['invalid-input-response'] };
    const res = await ctx.http().post(`/v1/auth/${route}`).send({ ...body, turnstile_token });
    expect(res.status).toBeLessThan(300);
    expect(verify).not.toHaveBeenCalled();
  });

  it.each([
    ['register', registerBody], ['login', loginBody],
  ])('LA1E15/LA1E1: %s without a token (also client mobile) is 400 validation-failed, with no check and no count', async (route, body) => {
    const { turnstile_token: _omitted, ...noToken } = body as Record<string, unknown>;
    for (const input of [noToken, { ...noToken, client: 'mobile' }]) {
      const res = await ctx.http().post(`/v1/auth/${route}`).send(input);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    }
    expect(verify).not.toHaveBeenCalled();
    expect(hit).not.toHaveBeenCalled();
  });

  it('a token longer than 2048 characters is 400 validation-failed', async () => {
    const res = await ctx.http().post('/v1/auth/login').send({ ...loginBody, turnstile_token: 'x'.repeat(2049) });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    expect(verify).not.toHaveBeenCalled();
  });

  it('LA1E8: with Cloudflare unavailable, register is 503 captcha-unavailable and nothing is sent; login still works; OTP does not depend on Cloudflare', async () => {
    verdict = { kind: 'unavailable', reason: 'timeout' };
    const reg = await ctx.http().post('/v1/auth/register').send(registerBody);
    expect(reg.status).toBe(503);
    expect(reg.body.type).toBe('https://api.example.com/problems/captcha-unavailable');
    expect(register).not.toHaveBeenCalled();
    const otp = await ctx.http().post('/v1/auth/otp').send({ purpose: 'verify_email', email: 'a@example.com' });
    expect(otp.status).toBe(202);
    expect(requestVerify).toHaveBeenCalledTimes(1);
    const log = await ctx.http().post('/v1/auth/login').send(loginBody);
    expect(log.status).toBe(200);
    expect(login).toHaveBeenCalledTimes(1);
    expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'turnstile_bypassed', reason: 'timeout' }));
  });

  it('login: a wrong token is still refused (the bypass is only for an unreachable Cloudflare)', async () => {
    verdict = { kind: 'rejected', codes: ['invalid-input-response'] };
    const res = await ctx.http().post('/v1/auth/login').send(loginBody);
    expect(res.status).toBe(400);
    expect(login).not.toHaveBeenCalled();
  });
});
