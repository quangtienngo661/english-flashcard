import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { IDEMPOTENT_KEY } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { AiLookupController } from './ai-lookup.controller.js';
import { AiLookupService } from './ai-lookup.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('POST /v1/lookup/ai HTTP (Bước 7 design §11.1; unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let userId: string; let nativeLanguage: 'vi' | 'en' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const passThrough = vi.spyOn(IdempotencyInterceptor.prototype, 'intercept');
  let lookup: ReturnType<typeof vi.spyOn>; let profile: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const RESPONSE = { suggestion: { lemma: 'rizz' }, catalog_senses: [] };

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    lookup = vi.spyOn(ctx.app.get(AiLookupService), 'lookup');
    profile = vi.spyOn(ctx.app.get(IdentityService), 'getProfile');
  });
  beforeEach(async () => {
    userId = randomUUID(); nativeLanguage = 'vi';
    token = await ctx.app.get(AccessTokenService).sign({ userId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId, revokedAt: null, user: { staffRole: null } }));
    profile.mockReset().mockImplementation(async () => ({ native_language: nativeLanguage }) as never);
    lookup.mockReset().mockResolvedValue(RESPONSE as never);
    hit.mockReset().mockResolvedValue(undefined);
    passThrough.mockReset().mockImplementation((_context, next) => next.handle());
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('200 with the service response; text trimmed and NFC; the key and the learner are passed; user.write; idempotent 60 s', async () => {
    const res = await http().post('/v1/lookup/ai').set(auth()).set('Idempotency-Key', 'k1')
      .send({ text: ' rizz ', context_sentence: ' He has rizz. ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(RESPONSE);
    expect(lookup).toHaveBeenCalledWith({ userId, nativeLanguage: 'vi' }, 'k1', 'rizz', 'He has rizz.');
    expect(passThrough).toHaveBeenCalledTimes(1);
    expect(hit).toHaveBeenCalledWith('user.write', userId);
    expect(new Reflector().get(IDEMPOTENT_KEY, AiLookupController.prototype.lookup)).toEqual({ timeoutSeconds: 60 });
  });

  it('no context sentence → null (D20: sent only when the learner ticks it)', async () => {
    await http().post('/v1/lookup/ai').set(auth()).set('Idempotency-Key', 'k2').send({ text: 'rizz' });
    expect(lookup).toHaveBeenCalledWith(expect.anything(), 'k2', 'rizz', null);
  });

  it('bad bodies → 400 validation-failed before the service', async () => {
    for (const body of [{}, { text: '  ' }, { text: 'x'.repeat(101) }, { text: 'rizz', context_sentence: 'x'.repeat(301) },
      { text: 'rizz', extra: 1 }]) {
      const res = await http().post('/v1/lookup/ai').set(auth()).set('Idempotency-Key', 'k3').send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(lookup).not.toHaveBeenCalled();
  });

  it('an account without native_language → 403 profile-incomplete', async () => {
    nativeLanguage = null;
    const res = await http().post('/v1/lookup/ai').set(auth()).set('Idempotency-Key', 'k4').send({ text: 'rizz' });
    expect([res.status, res.body.type]).toEqual([403, `${PROBLEM}profile-incomplete`]);
    expect(lookup).not.toHaveBeenCalled();
  });
});
