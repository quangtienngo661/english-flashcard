import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { cookieFrom } from '../../../test/support/auth-helpers.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { testConfig } from '../../../test/support/test-config.js';
import { AccessTokenService } from '../sessions/access-token.service.js';
import type { IssuedSession } from '../sessions/session.service.js';
import { PasswordService } from './password.service.js';

describe('password HTTP routing (unit, isolated persistence)', () => {
  let ctx: TestApp;
  let token: string;
  let subject: { userId: string; sessionChainId: string };
  let issued: IssuedSession;
  const change = vi.spyOn(PasswordService.prototype, 'change');
  const reset = vi.spyOn(PasswordService.prototype, 'reset');
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const changeBody = { current_password: 'Password1!', new_password: 'NewPassword1!' };
  const resetBody = { email: 'a@example.com', code: '012345', new_password: 'NewPassword1!' };
  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: { $disconnect: async () => {} } }], exports: [PRISMA_CLIENT] });
    const config = testConfig();
    ctx = await createTestApp({ databaseUrl: 'unused', config: { jwt: { ...config.jwt, accessTtlSeconds: 120 } } });
  });
  beforeEach(async () => {
    subject = { userId: randomUUID(), sessionChainId: randomUUID() };
    token = await ctx.app.get(AccessTokenService).sign(subject);
    issued = { accessToken: 'access', refreshToken: 'refresh', sessionChainId: randomUUID(), client: 'mobile',
      refreshExpiresAt: new Date(ctx.clock.now().getTime() + 86_400_000) };
    change.mockReset().mockImplementation(async () => issued); reset.mockReset().mockResolvedValue(undefined);
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('B1#22: authenticated mobile change forwards the caller and passthrough response and returns tokens', async () => {
    const res = await ctx.http().post('/v1/auth/password/change').set('Authorization', `Bearer ${token}`).send(changeBody);
    expect(res.status).toBe(200); expect(res.body).toEqual({ access_token: 'access', refresh_token: 'refresh', token_type: 'Bearer', expires_in: 120 });
    expect(change).toHaveBeenCalledExactlyOnceWith(subject, changeBody, expect.objectContaining({ cookie: expect.any(Function), once: expect.any(Function) }));
    expect(hit).toHaveBeenCalledExactlyOnceWith('user.write', subject.userId); expect(res.headers['set-cookie']).toBeUndefined();
  });
  it('B1#22: web change sets the new secure cookie and omits refresh_token from the body', async () => {
    issued.client = 'web';
    const res = await ctx.http().post('/v1/auth/password/change').set('Authorization', `Bearer ${token}`).send(changeBody);
    expect(res.status).toBe(200); expect(res.body).toEqual({ access_token: 'access', token_type: 'Bearer', expires_in: 120 });
    expect(cookieFrom(res)).toBe('refresh_token=refresh');
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/v1/auth', 'Max-Age=86400']) expect(res.headers['set-cookie'][0]).toContain(attr);
  });
  it('B1#22: change without authentication returns invalid-token before service or rate limiter', async () => {
    const res = await ctx.http().post('/v1/auth/password/change').send(changeBody);
    expect(res.status).toBe(401); expect(res.body.type).toBe('https://api.example.com/problems/invalid-token');
    expect(change).not.toHaveBeenCalled(); expect(hit).not.toHaveBeenCalled();
  });
  it('B1#23: public reset forwards its strict body and passthrough response and returns an empty 204', async () => {
    const res = await ctx.http().post('/v1/auth/password/reset').send(resetBody);
    expect(res.status).toBe(204); expect(res.text).toBe(''); expect(res.headers['set-cookie']).toBeUndefined();
    expect(reset).toHaveBeenCalledExactlyOnceWith(resetBody, expect.objectContaining({ once: expect.any(Function) }));
    expect(hit).toHaveBeenCalledExactlyOnceWith('auth.reset.ip', expect.any(String)); expect(change).not.toHaveBeenCalled();
  });
  it.each(['change', 'reset'] as const)('B1#22/B1#23: malformed %s input returns validation-failed before calling the service', async (route) => {
    const body = route === 'change' ? changeBody : resetBody;
    const { new_password: _password, ...missing } = body;
    const invalid = [missing, { ...body, new_password: 42 }, { ...body, extra: true },
      ...(route === 'change' ? [{ ...body, current_password: null }] : [{ ...body, email: 42 }, { ...body, code: 42 },
        { ...body, email: 'x'.repeat(321) }, { ...body, email: 'foo\u0000@example.com' }, { ...body, code: 'x'.repeat(21) }])];
    for (const input of invalid) {
      const req = ctx.http().post(`/v1/auth/password/${route}`);
      if (route === 'change') req.set('Authorization', `Bearer ${token}`);
      const res = await req.send(input);
      expect(res.status).toBe(400); expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
      expect(res.headers['content-type']).toContain('application/problem+json'); expect(res.body.operation_id).toEqual(expect.any(String));
    }
    expect(change).not.toHaveBeenCalled(); expect(reset).not.toHaveBeenCalled();
  });
  it('B1E4: a locked password change renders Retry-After as Problem Details', async () => {
    change.mockRejectedValue(new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited', retryAfterSeconds: 900 }));
    const res = await ctx.http().post('/v1/auth/password/change').set('Authorization', `Bearer ${token}`).send(changeBody);
    expect(res.status).toBe(429); expect(res.headers['retry-after']).toBe('900'); expect(res.body.type).toBe('https://api.example.com/problems/rate-limited');
  });
});
