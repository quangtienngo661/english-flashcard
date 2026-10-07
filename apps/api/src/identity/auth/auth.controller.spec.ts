import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { cookieFrom } from '../../../test/support/auth-helpers.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { testConfig } from '../../../test/support/test-config.js';
import type { IssuedSession } from '../sessions/session.service.js';
import { AuthService } from './auth.service.js';

describe('registration and login HTTP routing (unit, isolated persistence)', () => {
  let ctx: TestApp;
  let issued: IssuedSession;
  const register = vi.spyOn(AuthService.prototype, 'register');
  const login = vi.spyOn(AuthService.prototype, 'login');
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const body = { email: 'a@example.com', password: 'Password1!', timezone: 'Asia/Ho_Chi_Minh', client: 'mobile' };
  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: { $disconnect: async () => {} } }], exports: [PRISMA_CLIENT] });
    const config = testConfig();
    ctx = await createTestApp({ databaseUrl: 'unused', config: { jwt: { ...config.jwt, accessTtlSeconds: 120 } } });
  });
  beforeEach(() => {
    issued = { accessToken: 'access', refreshToken: 'refresh', sessionChainId: randomUUID(), client: 'mobile',
      refreshExpiresAt: new Date(ctx.clock.now().getTime() + 86_400_000) };
    register.mockReset().mockImplementation(async () => issued); login.mockReset().mockImplementation(async () => issued);
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it.each(['register', 'login'])('B1#1/B1#11: public mobile %s returns tokens with the configured TTL and correct status', async (route) => {
    const input = route === 'register' ? body : { email: body.email, password: body.password, client: body.client };
    const res = await ctx.http().post(`/v1/auth/${route}`).send(input);
    expect(res.status).toBe(route === 'register' ? 201 : 200);
    expect(res.body).toEqual({ access_token: 'access', refresh_token: 'refresh', token_type: 'Bearer', expires_in: 120 });
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(hit).toHaveBeenCalledWith(`auth.${route}.ip`, expect.any(String));
    if (route === 'register') {
      expect(hit).toHaveBeenCalledWith('mail.ip.daily', expect.any(String));
      expect(register).toHaveBeenCalledWith(input, expect.objectContaining({ cookie: expect.any(Function) }));
    } else expect(login).toHaveBeenCalledExactlyOnceWith(input);
  });
  it.each(['register', 'login'])('B1#1/B1#21: web %s sets the secure refresh cookie and omits the body token', async (route) => {
    issued.client = 'web';
    const input = route === 'register' ? { ...body, client: 'web' } : { email: body.email, password: body.password, client: 'web' };
    const res = await ctx.http().post(`/v1/auth/${route}`).send(input);
    expect(res.status).toBe(route === 'register' ? 201 : 200);
    expect(res.body).toEqual({ access_token: 'access', token_type: 'Bearer', expires_in: 120 });
    expect(cookieFrom(res)).toBe('refresh_token=refresh');
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/v1/auth', 'Max-Age=86400']) expect(res.headers['set-cookie'][0]).toContain(attr);
  });
  it.each(['register', 'login'])('B1#1/B1#11: malformed %s bodies return 400 before service calls (Review Focus #3)', async (route) => {
    const input = route === 'register' ? body : { email: body.email, password: body.password, client: body.client };
    const { password: _password, ...missing } = input;
    for (const invalid of [{ ...input, email: 42 }, missing, { ...input, extra: true }, { ...input, client: 'desktop' },
      { ...input, device_label: 'x'.repeat(101) }, { ...input, email: 'x'.repeat(321) },
      { ...input, email: 'foo\u0000@example.com' }, { ...input, device_label: 'Phone\u0000' }]) {
      const res = await ctx.http().post(`/v1/auth/${route}`).send(invalid);
      expect(res.status).toBe(400); expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
      expect(res.headers['content-type']).toContain('application/problem+json'); expect(res.body.operation_id).toEqual(expect.any(String));
    }
    const malformed = await ctx.http().post(`/v1/auth/${route}`).set('Content-Type', 'application/json').send('{');
    expect(malformed.status).toBe(400); expect(malformed.body.type).toBe('https://api.example.com/problems/validation-failed');
    expect(register).not.toHaveBeenCalled(); expect(login).not.toHaveBeenCalled();
  });
});
