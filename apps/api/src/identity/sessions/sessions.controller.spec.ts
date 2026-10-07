import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from './access-token.service.js';
import { SessionService, type IssuedSession } from './session.service.js';
import { cookieFrom } from '../../../test/support/auth-helpers.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { randomUUID } from 'node:crypto';
import { testConfig } from '../../../test/support/test-config.js';

const day = 86_400_000;

// Exercise real routing, guards, zod validation and Express cookie serialization.
// Session persistence is covered separately by the database-backed e2e suite.
describe('Session HTTP transport (unit, isolated persistence)', () => {
  let ctx: TestApp;
  let issued: IssuedSession;
  const refresh = vi.spyOn(SessionService.prototype, 'refresh');
  const revoke = vi.spyOn(SessionService.prototype, 'revokeByRefreshToken');
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({
      module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: { $disconnect: async () => {} } }],
      exports: [PRISMA_CLIENT],
    });
    const config = testConfig();
    ctx = await createTestApp({ databaseUrl: 'unused', config: {
      jwt: { ...config.jwt, accessTtlSeconds: 120 },
    } });
  });

  beforeEach(() => {
    ctx.clock.set(new Date('2026-10-07T12:00:00Z'));
    issued = {
      accessToken: 'issued-access', refreshToken: 'issued-refresh', sessionChainId: randomUUID(),
      client: 'mobile', refreshExpiresAt: new Date(ctx.clock.now().getTime() + 90 * day),
    };
    refresh.mockReset().mockImplementation(async () => issued);
    revoke.mockReset().mockResolvedValue(undefined);
    hit.mockReset().mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await ctx?.close();
    vi.restoreAllMocks();
  });

  it('B1#15: mobile refresh returns 200 and the configured token response without a cookie', async () => {
    const res = await ctx.http().post('/v1/auth/refresh').send({ refresh_token: 'mobile-token' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      access_token: issued.accessToken, token_type: 'Bearer', expires_in: 120,
      refresh_token: issued.refreshToken,
    });
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(refresh).toHaveBeenCalledExactlyOnceWith('mobile-token', 'mobile');
    expect(hit).toHaveBeenCalledWith('auth.refresh.ip', expect.any(String));
  });

  it('B1#21: web refresh serializes the secure cookie and omits the body refresh token', async () => {
    issued.client = 'web';
    const res = await ctx.http().post('/v1/auth/refresh')
      .set('Cookie', 'refresh_token=web-token').set('X-CSRF-Protection', '1').send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ access_token: issued.accessToken, token_type: 'Bearer', expires_in: 120 });
    expect(cookieFrom(res)).toBe('refresh_token=issued-refresh');
    const cookie = res.headers['set-cookie'][0];
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/v1/auth', 'Max-Age=7776000']) {
      expect(cookie).toContain(attr);
    }
    expect(refresh).toHaveBeenCalledExactlyOnceWith('web-token', 'web');
  });

  it.each([undefined, '0', 'true', '1, 1'])('B1#21: cookie transport rejects CSRF header %s before refresh or logout', async (header) => {
    for (const endpoint of ['refresh', 'logout']) {
      const req = ctx.http().post(`/v1/auth/${endpoint}`).set('Cookie', 'refresh_token=web-token');
      if (header !== undefined) req.set('X-CSRF-Protection', header);
      const res = await req.send({});
      expect(res.status).toBe(403);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body).toMatchObject({
        status: 403, type: 'https://api.example.com/problems/csrf-header-required',
        operation_id: expect.any(String),
      });
      expect(res.headers['set-cookie']).toBeUndefined();
    }
    expect(refresh).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
  });

  it('B1#21: cookie Max-Age uses the issued absolute deadline', async () => {
    issued.client = 'web';
    issued.refreshExpiresAt = new Date(ctx.clock.now().getTime() + day);
    const res = await ctx.http().post('/v1/auth/refresh')
      .set('Cookie', 'refresh_token=web-token').set('X-CSRF-Protection', '1').send({});
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toContain('Max-Age=86400');
  });

  it('B1#21: Secure Set-Cookie can be read and resent manually over the HTTP test server', async () => {
    issued.client = 'web';
    const first = await ctx.http().post('/v1/auth/refresh')
      .set('Cookie', 'refresh_token=web-token').set('X-CSRF-Protection', '1').send({});
    expect(first.status).toBe(200);
    const second = await ctx.http().post('/v1/auth/refresh')
      .set('Cookie', cookieFrom(first)!).set('X-CSRF-Protection', '1').send({});
    expect(second.status).toBe(200);
    expect(refresh).toHaveBeenLastCalledWith(issued.refreshToken, 'web');
  });

  it('B1#21/Review Focus #4: body wins over cookie on both endpoints without a CSRF header', async () => {
    const res = await ctx.http().post('/v1/auth/refresh').set('Cookie', 'refresh_token=web-token')
      .send({ refresh_token: 'mobile-token' });
    expect(res.status).toBe(200);
    expect(res.body.refresh_token).toBe(issued.refreshToken);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(refresh).toHaveBeenCalledExactlyOnceWith('mobile-token', 'mobile');
    const logout = await ctx.http().post('/v1/auth/logout').set('Cookie', 'refresh_token=web-token')
      .send({ refresh_token: 'mobile-token' });
    expect(logout.status).toBe(204);
    expect(logout.text).toBe('');
    expect(logout.headers['set-cookie']).toBeUndefined();
    expect(revoke).toHaveBeenCalledExactlyOnceWith('mobile-token', 'mobile');
  });

  it.each([
    { refresh_token: 'token', extra: true }, { refresh_token: 42 },
    { refresh_token: '' }, { refresh_token: 'x'.repeat(201) }, { refresh_token: null },
  ])('B1#21/Review Focus #3: rejects invalid body %j on both endpoints before service calls', async (body) => {
    for (const endpoint of ['refresh', 'logout']) {
      const res = await ctx.http().post(`/v1/auth/${endpoint}`)
        .set('Cookie', 'refresh_token=web-token').set('X-CSRF-Protection', '1').send(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    }
    expect(refresh).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
  });

  it('B1#15: refresh without a token returns 401 invalid-token', async () => {
    const res = await ctx.http().post('/v1/auth/refresh').send({});
    expect(res.status).toBe(401);
    expect(res.body.type).toBe('https://api.example.com/problems/invalid-token');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('B1#15: a service denial remains Problem Details and emits no cookie', async () => {
    issued.client = 'web';
    refresh.mockRejectedValueOnce(new ProblemDetailsException({
      status: 401, title: 'Invalid token', type: 'invalid-token',
    }));
    const res = await ctx.http().post('/v1/auth/refresh')
      .set('Cookie', 'refresh_token=unknown').set('X-CSRF-Protection', '1').send({});
    expect(res.status).toBe(401);
    expect(res.body.type).toBe('https://api.example.com/problems/invalid-token');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('B1#20: mobile logout returns empty 204 and uses the logout IP rate rule', async () => {
    const res = await ctx.http().post('/v1/auth/logout').send({ refresh_token: 'mobile-token' });
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(revoke).toHaveBeenCalledExactlyOnceWith('mobile-token', 'mobile');
    expect(hit).toHaveBeenCalledWith('auth.logout.ip', expect.any(String));
  });

  it('B1#20: logout without a token is an empty idempotent 204', async () => {
    const res = await ctx.http().post('/v1/auth/logout').send({});
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(revoke).not.toHaveBeenCalled();
  });

  it('B1#21: web logout clears a cookie with the same scope and security attributes', async () => {
    const res = await ctx.http().post('/v1/auth/logout')
      .set('Cookie', 'refresh_token=web-token').set('X-CSRF-Protection', '1').send({});
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(cookieFrom(res)).toBe('refresh_token=');
    const cookie = res.headers['set-cookie'][0];
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/v1/auth', 'Expires=Thu, 01 Jan 1970']) {
      expect(cookie).toContain(attr);
    }
    expect(revoke).toHaveBeenCalledExactlyOnceWith('web-token', 'web');
  });

  it('B1E29: an expired Bearer token does not prevent public logout', async () => {
    const token = await ctx.app.get(AccessTokenService).sign({ userId: randomUUID(), sessionChainId: randomUUID() });
    ctx.clock.advance(120_000 + day);
    expect(await ctx.app.get(AccessTokenService).verify(token)).toBeNull();
    const res = await ctx.http().post('/v1/auth/logout').set('Authorization', `Bearer ${token}`)
      .send({ refresh_token: 'mobile-token' });
    expect(res.status).toBe(204);
    expect(revoke).toHaveBeenCalledExactlyOnceWith('mobile-token', 'mobile');
  });
});
