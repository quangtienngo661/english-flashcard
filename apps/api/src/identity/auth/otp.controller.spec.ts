import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { DEFAULT_LIMITS } from '../../common/config/app-config.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RATE_LIMIT_KEY } from '../../common/rate-limit/rate-limit.decorator.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { cookieFrom } from '../../../test/support/auth-helpers.js';
import { AuthService } from './auth.service.js';
import { OtpController } from './otp.controller.js';
import { verifyEmailSchema } from './otp.schemas.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';

// Persistence is unavailable in this sandbox. Keep routing, guards, validation,
// the OTP service and response-close dispatch real; DB behavior has e2e coverage.
vi.mock('../../generated/prisma/sql.js', () => ({ recordOtpFailure: vi.fn() }));

describe('OTP HTTP contract (unit, isolated persistence)', () => {
  let ctx: TestApp;
  const lookup = vi.fn().mockResolvedValue(null);
  const tx = {
    $executeRaw: vi.fn(), user: { findUnique: vi.fn() },
    otpFailureWindow: { findUnique: vi.fn() },
    otpCode: { updateMany: vi.fn(), create: vi.fn() },
  };
  const transaction = vi.fn(async (fn) => fn(tx));
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const verify = vi.fn();
  const input = { email: 'a@example.com', password: 'Password1!', code: '012345', client: 'mobile', device_label: 'Phone' };

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({
      module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: {
        user: { findUnique: lookup }, $transaction: transaction,
        mailBudgetBucket: { findUnique: async () => null, upsert: async () => ({ sent: 1 }) },
        $disconnect: async () => {},
      } }], exports: [PRISMA_CLIENT],
    });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    ctx.app.get(AuthService).verifyEmail = verify;
  });
  beforeEach(() => {
    ctx.clock.set(new Date('2026-10-07T12:00:00Z'));
    lookup.mockReset().mockResolvedValue(null);
    transaction.mockClear();
    tx.$executeRaw.mockReset().mockResolvedValue(1);
    tx.user.findUnique.mockReset();
    tx.otpFailureWindow.findUnique.mockReset().mockResolvedValue(null);
    tx.otpCode.updateMany.mockReset().mockResolvedValue({ count: 0 });
    tx.otpCode.create.mockReset();
    ctx.mailer.sent.length = 0;
    hit.mockReset().mockResolvedValue(undefined);
    verify.mockReset().mockImplementation(async (body) => ({
      accessToken: 'access', refreshToken: 'refresh', sessionChainId: randomUUID(), client: body.client,
      refreshExpiresAt: new Date(ctx.clock.now().getTime() + 86_400_000),
    }));
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('B1#5/B1#38: unknown reset returns 202 and looks up the normalized email after close', async () => {
    const markers: string[] = [];
    ctx.app.getHttpServer().prependOnceListener('request', (_req: unknown, res: import('node:http').ServerResponse) => {
      res.once('close', () => { markers.push('response'); });
    });
    lookup.mockImplementationOnce(async () => { markers.push('lookup'); return null; });
    const res = await ctx.http().post('/v1/auth/otp').send({ purpose: 'reset_password', email: '  Foo@Example.COM ' });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({});
    await ctx.drainMail();
    expect(markers).toEqual(['response', 'lookup']);
    expect(lookup).toHaveBeenCalledExactlyOnceWith({ where: { email: 'foo@example.com' } });
    expect(ctx.mailer.sent).toEqual([]);
    for (const rule of ['auth.otp.ip', 'mail.ip.daily', 'auth.otp.email.cooldown', 'auth.otp.email.hourly']) {
      expect(hit).toHaveBeenCalledWith(rule, rule.includes('.email.') ? 'foo@example.com' : expect.any(String));
    }
  });

  it.each(['unknown', 'verified'])('A13-13: verify_email with an unknown or verified email (%s) -> 202 {}, nothing mailed', async (state) => {
    const account = { id: randomUUID(), email: 'a@example.com', status: 'active', emailVerifiedAt: ctx.clock.now() };
    lookup.mockResolvedValue(state === 'unknown' ? null : account);
    tx.user.findUnique.mockResolvedValue(account);
    const res = await ctx.http().post('/v1/auth/otp').send({ purpose: 'verify_email', email: account.email });
    expect(res.status).toBe(202); expect(res.body).toEqual({});
    await ctx.drainMail();
    expect(lookup).toHaveBeenCalledExactlyOnceWith({ where: { email: account.email } });
    expect(transaction).toHaveBeenCalledTimes(state === 'unknown' ? 0 : 1);
    expect(tx.otpCode.create).not.toHaveBeenCalled(); expect(ctx.mailer.sent).toEqual([]);
  });

  it('verify_email for an unverified account -> 202, code mailed after close; capitals and spaces are normalized', async () => {
    const markers: string[] = [];
    const account = { id: randomUUID(), email: 'foo@example.com', status: 'active', emailVerifiedAt: null };
    ctx.app.getHttpServer().prependOnceListener('request', (_req: unknown, res: import('node:http').ServerResponse) => {
      res.once('close', () => { markers.push('response'); });
    });
    lookup.mockImplementationOnce(async () => { markers.push('lookup'); return account; });
    tx.user.findUnique.mockResolvedValue(account);
    tx.otpCode.create.mockImplementationOnce(async () => { markers.push('issue'); });
    const res = await ctx.http().post('/v1/auth/otp').send({ purpose: 'verify_email', email: '  Foo@Example.COM ' });
    expect(res.status).toBe(202); expect(res.body).toEqual({});
    await ctx.drainMail();
    expect(markers).toEqual(['response', 'lookup', 'issue']);
    expect(lookup).toHaveBeenCalledExactlyOnceWith({ where: { email: account.email } });
    for (const rule of ['auth.otp.email.cooldown', 'auth.otp.email.hourly']) expect(hit).toHaveBeenCalledWith(rule, account.email);
    expect(ctx.mailer.sent).toHaveLength(1); expect(ctx.mailer.sent[0].to).toBe(account.email);
  });

  it('verify_email: same email twice within 60 s -> 429', async () => {
    let cooldownHits = 0;
    hit.mockImplementation(async (rule) => {
      if (rule === 'auth.otp.email.cooldown' && ++cooldownHits > 1) {
        throw new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited', retryAfterSeconds: 60 });
      }
    });
    const body = { purpose: 'verify_email', email: 'a@example.com' };
    expect((await ctx.http().post('/v1/auth/otp').send(body)).status).toBe(202);
    await ctx.drainMail(); lookup.mockClear();
    const res = await ctx.http().post('/v1/auth/otp').send(body);
    expect(res.status).toBe(429); expect(res.headers['retry-after']).toBe('60');
    expect(res.body.type).toBe('https://api.example.com/problems/rate-limited');
    expect(lookup).not.toHaveBeenCalled();
  });

  it('old body { purpose: verify_email } without email -> 400 validation-failed', async () => {
    const res = await ctx.http().post('/v1/auth/otp').send({ purpose: 'verify_email' });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([
    { purpose: 'x' }, { purpose: 'reset_password' }, { purpose: 'reset_password', email: 42 },
    { purpose: 'reset_password', email: 'a@example.com', extra: true },
    { purpose: 'verify_email', email: 42 },
    { purpose: 'verify_email', email: 'a@example.com', extra: true },
    { purpose: 'verify_email', email: 'x'.repeat(321) },
    { purpose: 'reset_password', email: 'x'.repeat(321) },
  ])('B1#4/Review Focus #3: invalid OTP request %j returns validation-failed', async (body) => {
    const res = await ctx.http().post('/v1/auth/otp').send(body);
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each(['reset_password', 'verify_email'].flatMap((purpose) =>
    ['invalid', 'a@@b.com', 'x'.repeat(250) + '@b.com'].map((email) => ({ purpose, email })),
  ))('B1#5: invalid normalized email returns 400 before account work (%j)', async (body) => {
    const res = await ctx.http().post('/v1/auth/otp').send(body);
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    expect(lookup).not.toHaveBeenCalled();
  });

  it('verify-email is public: no token -> handled', async () => {
    const res = await ctx.http().post('/v1/auth/verify-email').send(input);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ access_token: 'access', refresh_token: 'refresh', token_type: 'Bearer', expires_in: 900 });
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(verify).toHaveBeenCalledExactlyOnceWith(input, expect.objectContaining({ cookie: expect.any(Function) }));
  });

  it('web verification writes the secure refresh cookie and omits the body refresh token', async () => {
    const res = await ctx.http().post('/v1/auth/verify-email').send({ ...input, client: 'web' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ access_token: 'access', token_type: 'Bearer', expires_in: 900 });
    expect(cookieFrom(res)).toBe('refresh_token=refresh');
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/v1/auth', 'Max-Age=86400']) expect(res.headers['set-cookie'][0]).toContain(attr);
  });

  const { password: _password, ...missingPassword } = input;
  it.each([{}, missingPassword, { ...input, code: 42 }, { ...input, extra: true }, { ...input, code: 'x'.repeat(21) },
    { ...input, client: 'desktop' }, { ...input, email: 'x'.repeat(321) }, { ...input, device_label: 'x'.repeat(101) }])(
    'strict verification body %j -> 400 validation-failed', async (body) => {
      const res = await ctx.http().post('/v1/auth/verify-email').send(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
      expect(verify).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled();
    },
  );

  it('pick/extend preserves strictObject: extra keys are rejected rather than stripped', () => {
    expect(verifyEmailSchema.safeParse(input).success).toBe(true);
    const result = verifyEmailSchema.safeParse({ ...input, extra: true });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({ code: 'unrecognized_keys', keys: ['extra'] }));
  });

  it('A13-12: the route declares @RateLimit with the verify rules', async () => {
    expect(Reflect.getMetadata(RATE_LIMIT_KEY, OtpController.prototype.verifyEmail)).toEqual(['auth.verify.ip']);
    expect(DEFAULT_LIMITS['auth.verify.ip']).toEqual({ by: 'ip', max: 20, windowSeconds: 3600 });
    const res = await ctx.http().post('/v1/auth/verify-email').send(input);
    expect(res.status).toBe(200);
    expect(hit).toHaveBeenCalledExactlyOnceWith('auth.verify.ip', expect.any(String));
    const ip = hit.mock.calls[0][1]; expect(ip).toMatch(/^(::ffff:)?127\.0\.0\.1$/);
    expect(hit.mock.calls.some(([rule]) => rule === 'user.write' || rule.includes('.email'))).toBe(false);
  });

  it('A13-12: an IP limit denial -> 429 with Retry-After', async () => {
    hit.mockRejectedValue(new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited', retryAfterSeconds: 3600 }));
    const res = await ctx.http().post('/v1/auth/verify-email').send(input);
    expect(res.status).toBe(429); expect(res.headers['retry-after']).toBe('3600');
    expect(res.body.type).toBe('https://api.example.com/problems/rate-limited');
    expect(verify).not.toHaveBeenCalled();
  });

  it('A13-9: the OTP lock denial -> 429 with Retry-After', async () => {
    verify.mockRejectedValue(new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited', retryAfterSeconds: 86400 }));
    const res = await ctx.http().post('/v1/auth/verify-email').send(input);
    expect(res.status).toBe(429); expect(res.headers['retry-after']).toBe('86400');
    expect(res.body.type).toBe('https://api.example.com/problems/rate-limited');
  });
});
