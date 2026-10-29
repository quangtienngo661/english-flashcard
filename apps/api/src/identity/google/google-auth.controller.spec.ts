import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import type { AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';

const REDIRECT = 'http://localhost:3000/v1/auth/google/callback';
const google = (mode: 'fake' | 'off'): AppConfig['google'] => ({
  mode, clientId: null, clientSecret: null, redirectUri: mode === 'fake' ? REDIRECT : null,
  apiOrigin: mode === 'fake' ? 'http://localhost:3000' : null, cookieKey: randomBytes(32),
});
const prisma = {
  user: { findUnique: vi.fn(async () => null) }, userIdentity: { findUnique: vi.fn(async () => null) }, $disconnect: async () => {},
};

describe('Google routes over HTTP (fake Google, new person)', () => {
  let ctx: TestApp;
  beforeAll(async () => {
    vi.spyOn(RateLimiter.prototype, 'hit').mockResolvedValue(undefined);
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused', config: { google: google('fake') } });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  const cookieOf = (res: { headers: Record<string, unknown> }, name: string) =>
    ([] as string[]).concat(res.headers['set-cookie'] as string[] | undefined ?? []).find((c) => c.startsWith(`${name}=`));

  it('start: 302 to the sign-in page of Google (the fake here) with a sealed Lax cookie; no token is needed', async () => {
    const res = await ctx.http().get('/v1/auth/google/start').query({ locale: 'vi', next: '/vi/app/groups' });
    expect(res.status).toBe(302);
    expect(new URL(res.headers.location).pathname).toBe('/v1/dev/google/authorize');
    const cookie = cookieOf(res, 'google_oauth')!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\/v1\/auth\/google/);
    expect(cookie).toMatch(/Max-Age=600/);
  });

  it('the whole trip: start → fake page → callback → the sign-up page, the oauth cookie cleared and a google_signup cookie set', async () => {
    const start = await ctx.http().get('/v1/auth/google/start').query({ locale: 'vi', next: '/vi/app/groups' });
    const oauth = cookieOf(start, 'google_oauth')!.split(';')[0];
    const fakePage = new URL(start.headers.location);
    fakePage.searchParams.set('email', 'minh@gmail.com');
    fakePage.searchParams.set('sub', 'sub-minh');
    const issued = await ctx.http().get(fakePage.pathname + fakePage.search);
    expect(issued.status).toBe(302);
    const callbackUrl = new URL(issued.headers.location);
    expect(callbackUrl.origin + callbackUrl.pathname).toBe(REDIRECT);
    const back = await ctx.http().get(callbackUrl.pathname + callbackUrl.search).set('Cookie', oauth);
    expect(back.status).toBe(302);
    expect(back.headers.location).toBe('http://localhost:3001/vi/app/google/complete');
    expect(cookieOf(back, 'google_oauth')).toMatch(/Expires=Thu, 01 Jan 1970/);
    const signup = cookieOf(back, 'google_signup')!;
    expect(signup).toMatch(/SameSite=Lax/);
    expect(signup).toMatch(/Max-Age=900/);
    expect(signup).not.toContain('minh@gmail.com');
  });

  it('the callback without its cookie goes back to the login page with google-failed (an absolute Location)', async () => {
    const res = await ctx.http().get('/v1/auth/google/callback').query({ code: 'x', state: 'y' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3001/vi/app/login?error=google-failed');
  });

  it('complete: GET and POST answer 401 without the ticket; POST also needs the X-CSRF-Protection header (403 without it)', async () => {
    expect((await ctx.http().get('/v1/auth/google/complete')).status).toBe(401);
    const body = { birth_date: '2000-05-01', accept_terms: true, timezone: 'Asia/Saigon' };
    const noHeader = await ctx.http().post('/v1/auth/google/complete').send(body);
    expect(noHeader.status).toBe(403);
    expect(noHeader.body.type).toMatch(/csrf-header-required$/);
    const noCookie = await ctx.http().post('/v1/auth/google/complete').set('X-CSRF-Protection', '1').send(body);
    expect(noCookie.status).toBe(401);
    expect((await ctx.http().post('/v1/auth/google/complete').set('X-CSRF-Protection', '1').send({ ...body, accept_terms: false })).status).toBe(400);
  });

  it('the fake page shows a form when no account is given and refuses a foreign redirect_uri', async () => {
    const form = await ctx.http().get('/v1/dev/google/authorize').query({ state: 's', nonce: 'n', code_challenge: 'c', redirect_uri: REDIRECT });
    expect(form.status).toBe(200);
    expect(form.text).toContain('<form');
    const foreign = await ctx.http().get('/v1/dev/google/authorize').query({
      state: 's', nonce: 'n', code_challenge: 'c', redirect_uri: 'https://evil.example/cb', email: 'a@b.c', sub: 'x',
    });
    expect(foreign.status).toBe(400);
  });
});

describe('Google routes with Google off', () => {
  let ctx: TestApp;
  beforeAll(async () => {
    vi.spyOn(RateLimiter.prototype, 'hit').mockResolvedValue(undefined);
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused', config: { google: google('off') } });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('start redirects to login with google-unavailable and sets no cookie; the fake page is absent (404)', async () => {
    const start = await ctx.http().get('/v1/auth/google/start').query({ locale: 'en' });
    expect(start.status).toBe(302);
    expect(start.headers.location).toBe('http://localhost:3001/en/app/login?error=google-unavailable');
    expect(start.headers['set-cookie']).toBeUndefined();
    const fake = await ctx.http().get('/v1/dev/google/authorize').query({ state: 's', nonce: 'n', code_challenge: 'c', redirect_uri: REDIRECT });
    expect(fake.status).toBe(404);
  });
});
