import { Inject, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommonModule } from '../../common/common.module.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { testConfig } from '../../../test/support/test-config.js';
import { IdentityModule } from '../identity.module.js';
import { AccessTokenService } from '../sessions/access-token.service.js';
import { IdentityService } from './identity.service.js';

@Injectable()
class ProfileConsumer {
  constructor(@Inject(IdentityService) readonly identity: IdentityService) {}
}
@Module({ imports: [IdentityModule], providers: [ProfileConsumer] })
class ConsumerModule {}

describe('profile HTTP routing (unit, isolated persistence)', () => {
  let ctx: TestApp;
  let token: string;
  let row: { id: string; email: string; emailVerifiedAt: Date | null; nativeLanguage: string | null;
    timezone: string; staffRole: string | null } | null;
  let userId: string;
  const prisma = { user: { findUnique: vi.fn(), update: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const get = () => ctx.http().get('/v1/me').set('Authorization', `Bearer ${token}`);
  const patch = (body: object) => ctx.http().patch('/v1/me').set('Authorization', `Bearer ${token}`).send(body);
  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
  });
  beforeEach(async () => {
    userId = randomUUID();
    row = { id: userId, email: 'a@example.com', emailVerifiedAt: null, nativeLanguage: null,
      timezone: 'Asia/Ho_Chi_Minh', staffRole: null };
    prisma.user.findUnique.mockReset().mockImplementation(async () => row && { ...row });
    prisma.user.update.mockReset().mockImplementation(async ({ data }) => {
      if (!row) throw { code: 'P2025' };
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) Object.assign(row, { [key]: value });
      }
      return { ...row };
    });
    hit.mockReset().mockResolvedValue(undefined);
    token = await ctx.app.get(AccessTokenService).sign({ userId, sessionChainId: randomUUID() });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('B1#25: GET returns only the public profile and reflects verification and permissions from storage', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: userId, email: row!.email, email_verified: false, native_language: null,
      timezone: row!.timezone, staff_role: null, permissions: [] });
    row!.emailVerifiedAt = ctx.clock.now(); row!.staffRole = 'admin';
    expect((await get()).body).toMatchObject({ email_verified: true, staff_role: 'admin', permissions: ['roles.manage'] });
    expect(hit).not.toHaveBeenCalled();
  });
  it('B1#24/S8: partial PATCH changes vi then en, preserving other fields and accepted aliases', async () => {
    const before = { ...row! };
    for (const language of ['vi', 'en']) {
      const res = await patch({ native_language: language });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: userId, email: before.email, email_verified: false, native_language: language,
        timezone: before.timezone, staff_role: null, permissions: [] });
    }
    expect((await patch({ timezone: 'Asia/Saigon' })).status).toBe(200);
    const alias = await patch({ timezone: 'Asia/Ho_Chi_Minh' });
    expect(alias.status).toBe(200); expect(alias.body.timezone).toBe('Asia/Ho_Chi_Minh');
    expect(alias.body.native_language).toBe('en');
    expect(row).toEqual({ ...before, nativeLanguage: 'en' });
    expect(hit).toHaveBeenCalledTimes(4);
    for (const call of hit.mock.calls) expect(call).toEqual(['user.write', userId]);
  });
  it('B1#24/SE5: invalid or extra fields reject the whole PATCH with Problem Details and no writes', async () => {
    const before = { ...row! };
    for (const body of [{ native_language: 'fr' }, { native_language: null }, { native_language: 42 },
      { timezone: 42 }, { timezone: null }, { timezone: 'x'.repeat(65) },
      { native_language: 'en', timezone: 'Mars/Base' }, { timezone: 'UTC\u0000' },
      { timezone: 'UTC', extra: true }, { staff_role: 'admin' }, { email_verified: true }]) {
      const res = await patch(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.operation_id).toEqual(expect.any(String));
      expect(row).toEqual(before);
    }
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('B1#24: an empty PATCH returns the current profile', async () => {
    const before = { ...row! };
    const res = await patch({});
    expect(res.status).toBe(200); expect(res.body).toEqual((await get()).body);
    expect(row).toEqual(before);
  });
  it('B1#24: user.write denial returns 429 with Retry-After before any profile writes', async () => {
    hit.mockRejectedValue(new ProblemDetailsException({ status: 429, title: 'Too many requests',
      type: 'rate-limited', retryAfterSeconds: 60 }));
    const res = await patch({ native_language: 'vi' });
    expect(res.status).toBe(429); expect(res.headers['retry-after']).toBe('60');
    expect(res.body.type).toBe('https://api.example.com/problems/rate-limited');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('B1#25: unauthenticated profile routes reject before persistence or rate limiting', async () => {
    for (const request of [() => ctx.http().get('/v1/me'), () => ctx.http().patch('/v1/me').send({ native_language: 'vi' })]) {
      const res = await request();
      expect(res.status).toBe(401); expect(res.body.type).toBe('https://api.example.com/problems/invalid-token');
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled(); expect(prisma.user.update).not.toHaveBeenCalled();
    expect(hit).not.toHaveBeenCalled();
  });
  it('B1#25: a valid token of a deleted user returns 401 on GET and PATCH (Review Focus #5)', async () => {
    row = null;
    for (const request of [get, () => patch({ native_language: 'en' })]) {
      const res = await request();
      expect(res.status).toBe(401); expect(res.body.type).toBe('https://api.example.com/problems/invalid-token');
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.operation_id).toEqual(expect.any(String));
    }
  });
  it('B1#25/D3: another module can inject IdentityService through IdentityModule exports', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [CommonModule.forRoot(testConfig()),
      PrismaModule.forRoot({ connectionString: 'unused' }), ConsumerModule] }).compile();
    try {
      const consumer = moduleRef.get(ProfileConsumer);
      expect(await consumer.identity.getProfile(userId)).toMatchObject({ id: userId, native_language: null });
      expect(await consumer.identity.isEmailVerified(userId)).toBe(false);
      expect(Reflect.getMetadata('exports', IdentityModule)).toEqual([IdentityService]);
    } finally { await moduleRef.close(); }
  });
});
