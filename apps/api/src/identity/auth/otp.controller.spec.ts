import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../sessions/access-token.service.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';

// Persistence is unavailable in this sandbox. Keep routing, guards, validation,
// the reset service and response-close dispatch real; DB behavior has e2e coverage.
vi.mock('../../generated/prisma/sql.js', () => ({ recordOtpFailure: vi.fn() }));

describe('OTP HTTP contract (unit, isolated persistence)', () => {
  let ctx: TestApp;
  const lookup = vi.fn().mockResolvedValue(null);
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({
      module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: {
        user: { findUnique: lookup }, mailBudgetBucket: { findUnique: async () => null },
        $disconnect: async () => {},
      } }], exports: [PRISMA_CLIENT],
    });
    ctx = await createTestApp({ databaseUrl: 'unused' });
  });
  beforeEach(() => {
    ctx.clock.set(new Date('2026-10-07T12:00:00Z'));
    lookup.mockClear();
    hit.mockReset().mockResolvedValue(undefined);
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

  it('B1#4: verify_email without a token returns 401 invalid-token', async () => {
    const res = await ctx.http().post('/v1/auth/otp').send({ purpose: 'verify_email' });
    expect(res.status).toBe(401);
    expect(res.body.type).toBe('https://api.example.com/problems/invalid-token');
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([
    { purpose: 'x' }, { purpose: 'reset_password' }, { purpose: 'reset_password', email: 42 },
    { purpose: 'reset_password', email: 'a@example.com', extra: true },
    { purpose: 'verify_email', email: 'a@example.com' },
    { purpose: 'reset_password', email: 'x'.repeat(321) },
  ])('B1#4/Review Focus #3: invalid OTP request %j returns validation-failed', async (body) => {
    const res = await ctx.http().post('/v1/auth/otp').send(body);
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each(['invalid', 'a@@b.com', 'x'.repeat(250) + '@b.com'])('B1#5: invalid normalized email returns 400 before account work (%s)', async (email) => {
    const res = await ctx.http().post('/v1/auth/otp').send({ purpose: 'reset_password', email });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    expect(lookup).not.toHaveBeenCalled();
  });

  it('B1#7: verify-email requires authentication', async () => {
    const res = await ctx.http().post('/v1/auth/verify-email').send({ code: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.type).toBe('https://api.example.com/problems/invalid-token');
  });

  it.each([{}, { code: 42 }, { code: '123456', extra: true }, { code: 'x'.repeat(21) }])(
    'B1#7/Review Focus #3: invalid verification body %j returns validation-failed', async (body) => {
      const token = await ctx.app.get(AccessTokenService).sign({ userId: randomUUID(), sessionChainId: randomUUID() });
      const res = await ctx.http().post('/v1/auth/verify-email').set('Authorization', `Bearer ${token}`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
      expect(lookup).not.toHaveBeenCalled();
    },
  );
});
