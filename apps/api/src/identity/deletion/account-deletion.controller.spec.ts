import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../sessions/access-token.service.js';
import { AccountDeletionRequests } from './account-deletion-requests.service.js';

describe('POST /v1/me/account/delete (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let userId: string;
  const prisma = { $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let deleteOwn: ReturnType<typeof vi.spyOn>;
  const valid = { confirm_email: 'lan@example.com', acknowledged: true, password: 'secret-password' };
  const post = (body: object) => ctx.http().post('/v1/me/account/delete').set({ Authorization: `Bearer ${token}` }).send(body);

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    deleteOwn = vi.spyOn(ctx.app.get(AccountDeletionRequests), 'deleteOwn');
  });
  beforeEach(async () => {
    userId = randomUUID();
    token = await ctx.app.get(AccessTokenService).sign({ userId, sessionChainId: randomUUID() });
    deleteOwn.mockReset().mockResolvedValue('done');
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('204 with no body when the account is gone; the service gets the caller, the body and the response; both rules are charged', async () => {
    const res = await post(valid);
    expect(res.status).toBe(204); expect(res.text).toBe('');
    expect(deleteOwn).toHaveBeenCalledWith(expect.objectContaining({ userId }), valid, expect.objectContaining({ googleReauthUserId: null }));
    expect(hit).toHaveBeenCalledWith('user.write', userId);
    expect(hit).toHaveBeenCalledWith('auth.delete.user', userId);
  });

  it('202 with { status: "pending" } (not a problem) when the account is left deleting', async () => {
    deleteOwn.mockResolvedValue('pending');
    const res = await post(valid);
    expect(res.status).toBe(202); expect(res.body).toEqual({ status: 'pending' });
  });

  it('bad bodies are 400 before the service: unticked box, missing email, extra key, non-string password', async () => {
    for (const body of [{ ...valid, acknowledged: false }, { acknowledged: true }, { ...valid, extra: 1 }, { ...valid, password: 5 }, {}]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(deleteOwn).not.toHaveBeenCalled();
  });

  it('B8E18: the sixth request an hour is 429 from the auth.delete.user rule', async () => {
    hit.mockImplementation(async (rule: string) => {
      if (rule === 'auth.delete.user') {
        const { ProblemDetailsException } = await import('../../common/problem-details/problem-details.exception.js');
        throw new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited', retryAfterSeconds: 60 });
      }
    });
    expect((await post(valid)).status).toBe(429);
    expect(deleteOwn).not.toHaveBeenCalled();
  });

  it('without a token it is 401', async () => {
    expect((await ctx.http().post('/v1/me/account/delete').send(valid)).status).toBe(401);
  });
});
