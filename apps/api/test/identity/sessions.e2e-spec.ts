import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AccessTokenService } from '../../src/identity/sessions/access-token.service.js';
import { SessionService } from '../../src/identity/sessions/session.service.js';
import { cookieFrom, seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

const day = 86_400_000;

describe('Session transport (e2e)', () => {
  let ctx: TestApp;
  let userId: string;

  beforeAll(async () => { ctx = await createTestApp(); });
  beforeEach(async () => {
    ctx.clock.set(new Date('2026-10-07T12:00:00Z'));
    ({ userId } = await seedUser(ctx.prisma));
  });
  afterAll(async () => { await ctx?.close(); });

  const chain = (id: string) => ctx.prisma.sessionChain.findUniqueOrThrow({ where: { id } });
  const tokens = (id: string) => ctx.prisma.refreshToken.findMany({ where: { chainId: id }, orderBy: { id: 'asc' } });

  it('B1#21: web refresh sets the secure 90-day cookie and returns no body refresh token', async () => {
    const initial = await startSession(ctx, userId, 'web');
    ctx.clock.advance(1000);
    const res = await ctx.http().post('/v1/auth/refresh')
      .set('Cookie', `refresh_token=${initial.refreshToken}`).set('X-CSRF-Protection', '1').send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ access_token: expect.any(String), token_type: 'Bearer', expires_in: 900 });
    expect(await ctx.app.get(AccessTokenService).verify(res.body.access_token))
      .toEqual({ userId, sessionChainId: initial.sessionChainId });
    const cookie = res.headers['set-cookie'][0];
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/v1/auth']) expect(cookie).toContain(attr);
    expect(Math.abs(Number(/Max-Age=(\d+)/.exec(cookie)![1]) - 90 * day / 1000)).toBeLessThanOrEqual(1);
    expect(cookieFrom(res)).toMatch(/^refresh_token=[A-Za-z0-9_-]{43}$/);
    expect(cookieFrom(res)).not.toBe(`refresh_token=${initial.refreshToken}`);
    expect((await chain(initial.sessionChainId)).lastUsedAt).toEqual(ctx.clock.now());
    expect(await tokens(initial.sessionChainId)).toHaveLength(2);
    // Supertest's agent does not resend Secure cookies over HTTP; copy Set-Cookie explicitly.
    const again = await ctx.http().post('/v1/auth/refresh')
      .set('Cookie', cookieFrom(res)!).set('X-CSRF-Protection', '1').send({});
    expect(again.status).toBe(200);
    expect(cookieFrom(again)).not.toBe(cookieFrom(res));
  });

  it('B1#21: a 364-day-old web chain refreshed recently receives about one day of Max-Age', async () => {
    ctx.clock.advance(-364 * day);
    const initial = await startSession(ctx, userId, 'web');
    let current = initial;
    // Keep the chain alive through real rotations, without bypassing the per-user lock.
    for (let i = 0; i < 6; i++) {
      ctx.clock.advance(60 * day);
      current = await ctx.app.get(SessionService).refresh(current.refreshToken, 'web');
    }
    ctx.clock.advance(4 * day);
    const res = await ctx.http().post('/v1/auth/refresh')
      .set('Cookie', `refresh_token=${current.refreshToken}`).set('X-CSRF-Protection', '1').send({});
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('refresh_token');
    expect(Math.abs(Number(/Max-Age=(\d+)/.exec(res.headers['set-cookie'][0])![1]) - day / 1000))
      .toBeLessThanOrEqual(1);
    expect((await chain(initial.sessionChainId)).revokedAt).toBeNull();
  });

  it('B1#21: cookie refresh without CSRF returns 403 without rotating; with the header it succeeds', async () => {
    const initial = await startSession(ctx, userId, 'web');
    const before = await chain(initial.sessionChainId);
    const beforeTokens = await tokens(initial.sessionChainId);
    const denied = await ctx.http().post('/v1/auth/refresh')
      .set('Cookie', `refresh_token=${initial.refreshToken}`).send({});
    expect(denied.status).toBe(403);
    expect(denied.headers['content-type']).toContain('application/problem+json');
    expect(denied.body).toMatchObject({
      status: 403, type: 'https://api.example.com/problems/csrf-header-required', operation_id: expect.any(String),
    });
    expect(denied.headers['set-cookie']).toBeUndefined();
    expect(await chain(initial.sessionChainId)).toEqual(before);
    expect(await tokens(initial.sessionChainId)).toEqual(beforeTokens);
    const accepted = await ctx.http().post('/v1/auth/refresh')
      .set('Cookie', `refresh_token=${initial.refreshToken}`).set('X-CSRF-Protection', '1').send({});
    expect(accepted.status).toBe(200);
    expect(await tokens(initial.sessionChainId)).toHaveLength(2);
  });

  it('B1#20/I19: mobile logout revokes only that chain while another still refreshes', async () => {
    const initial = await startSession(ctx, userId);
    const other = await startSession(ctx, userId);
    const otherBefore = await chain(other.sessionChainId);
    const res = await ctx.http().post('/v1/auth/logout').send({ refresh_token: initial.refreshToken });
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(await chain(initial.sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'logout' });
    expect(await chain(other.sessionChainId)).toEqual(otherBefore);
    const denied = await ctx.http().post('/v1/auth/refresh').send({ refresh_token: initial.refreshToken });
    expect(denied.status).toBe(401);
    expect(denied.body.type).toBe('https://api.example.com/problems/invalid-token');
    const accepted = await ctx.http().post('/v1/auth/refresh').send({ refresh_token: other.refreshToken });
    expect(accepted.status).toBe(200);
    expect(accepted.body).toEqual({
      access_token: expect.any(String), token_type: 'Bearer', expires_in: 900, refresh_token: expect.any(String),
    });
    expect(accepted.body.refresh_token).not.toBe(other.refreshToken);
    expect(accepted.headers['set-cookie']).toBeUndefined();
    expect(await ctx.app.get(AccessTokenService).verify(accepted.body.access_token))
      .toEqual({ userId, sessionChainId: other.sessionChainId });
  });

  it('B1#20: repeated logout and unknown tokens return 204 without further state changes', async () => {
    const initial = await startSession(ctx, userId);
    const other = await startSession(ctx, userId);
    const first = await ctx.http().post('/v1/auth/logout').send({ refresh_token: initial.refreshToken });
    expect(first.status).toBe(204);
    const revoked = await chain(initial.sessionChainId);
    const otherBefore = await chain(other.sessionChainId);
    ctx.clock.advance(1000);
    for (const token of [initial.refreshToken, 'unknown']) {
      const res = await ctx.http().post('/v1/auth/logout').send({ refresh_token: token });
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(await chain(initial.sessionChainId)).toEqual(revoked);
      expect(await chain(other.sessionChainId)).toEqual(otherBefore);
    }
  });

  it('B1E29: logout works one day past the access token expiry', async () => {
    const initial = await startSession(ctx, userId);
    ctx.clock.advance(900_000 + day);
    expect(await ctx.app.get(AccessTokenService).verify(initial.accessToken)).toBeNull();
    const res = await ctx.http().post('/v1/auth/logout').set('Authorization', `Bearer ${initial.accessToken}`)
      .send({ refresh_token: initial.refreshToken });
    expect(res.status).toBe(204);
    expect(await chain(initial.sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'logout' });
  });

  it('B1#21: web logout requires CSRF and then revokes the chain and clears the cookie', async () => {
    const initial = await startSession(ctx, userId, 'web');
    const before = await chain(initial.sessionChainId);
    const beforeTokens = await tokens(initial.sessionChainId);
    const denied = await ctx.http().post('/v1/auth/logout')
      .set('Cookie', `refresh_token=${initial.refreshToken}`).send({});
    expect(denied.status).toBe(403);
    expect(denied.body.type).toBe('https://api.example.com/problems/csrf-header-required');
    expect(denied.headers['set-cookie']).toBeUndefined();
    expect(await chain(initial.sessionChainId)).toEqual(before);
    expect(await tokens(initial.sessionChainId)).toEqual(beforeTokens);
    const res = await ctx.http().post('/v1/auth/logout')
      .set('Cookie', `refresh_token=${initial.refreshToken}`).set('X-CSRF-Protection', '1').send({});
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(cookieFrom(res)).toBe('refresh_token=');
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/v1/auth', 'Expires=Thu, 01 Jan 1970']) {
      expect(res.headers['set-cookie'][0]).toContain(attr);
    }
    expect(await chain(initial.sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'logout' });
    expect(await tokens(initial.sessionChainId)).toEqual(beforeTokens);
  });

  it('B1E10: a web token on the body logout path leaves its chain active', async () => {
    const initial = await startSession(ctx, userId, 'web');
    const before = await chain(initial.sessionChainId);
    const beforeTokens = await tokens(initial.sessionChainId);
    const res = await ctx.http().post('/v1/auth/logout').send({ refresh_token: initial.refreshToken });
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(await chain(initial.sessionChainId)).toEqual(before);
    expect(await tokens(initial.sessionChainId)).toEqual(beforeTokens);
  });

  it('B1#21/Review Focus #4: body token takes precedence over cookie for refresh and logout', async () => {
    const mobile = await startSession(ctx, userId);
    const web = await startSession(ctx, userId, 'web');
    const webBefore = await chain(web.sessionChainId);
    const webTokens = await tokens(web.sessionChainId);
    const res = await ctx.http().post('/v1/auth/refresh').set('Cookie', `refresh_token=${web.refreshToken}`)
      .send({ refresh_token: mobile.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.refresh_token).toEqual(expect.any(String));
    expect(res.body.refresh_token).not.toBe(mobile.refreshToken);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(await chain(web.sessionChainId)).toEqual(webBefore);
    expect(await tokens(web.sessionChainId)).toEqual(webTokens);
    const logout = await ctx.http().post('/v1/auth/logout').set('Cookie', `refresh_token=${web.refreshToken}`)
      .send({ refresh_token: res.body.refresh_token });
    expect(logout.status).toBe(204);
    expect(logout.headers['set-cookie']).toBeUndefined();
    expect(await chain(mobile.sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'logout' });
    expect(await chain(web.sessionChainId)).toEqual(webBefore);
    expect(await tokens(web.sessionChainId)).toEqual(webTokens);
  });

  it.each(['refresh', 'logout'])('B1#21/Review Focus #3: %s rejects an extra body field with no session writes', async (endpoint) => {
    const initial = await startSession(ctx, userId);
    const before = await chain(initial.sessionChainId);
    const beforeTokens = await tokens(initial.sessionChainId);
    const res = await ctx.http().post(`/v1/auth/${endpoint}`).send({ refresh_token: initial.refreshToken, extra: true });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    expect(await chain(initial.sessionChainId)).toEqual(before);
    expect(await tokens(initial.sessionChainId)).toEqual(beforeTokens);
  });

  it('B1#15: refresh without a token returns 401 invalid-token', async () => {
    const res = await ctx.http().post('/v1/auth/refresh').send({});
    expect(res.status).toBe(401);
    expect(res.body.type).toBe('https://api.example.com/problems/invalid-token');
  });
});
