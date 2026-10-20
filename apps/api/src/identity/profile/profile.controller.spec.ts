import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { AccessTokenService } from '../sessions/access-token.service.js';

describe('profile HTTP routing (unit, isolated persistence)', () => {
  let ctx: TestApp;
  let token: string;
  let row: { id: string; email: string; emailVerifiedAt: Date | null; nativeLanguage: string | null;
    timezone: string; staffRole: string | null; mustChangePassword: boolean; givenName: string | null;
    familyName: string | null; birthDate: Date | null } | null;
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
      timezone: 'Asia/Saigon', staffRole: null, mustChangePassword: false, givenName: null, familyName: null, birthDate: null };
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

  it('B2#67/B1#25: GET returns only the public profile and all four content permissions for stored admin and editor roles', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: userId, email: row!.email, email_verified: false, native_language: null,
      timezone: row!.timezone, staff_role: null, permissions: [], must_change_password: false,
      given_name: null, family_name: null, birth_date: null });
    row!.emailVerifiedAt = ctx.clock.now();
    for (const staffRole of ['admin', 'editor']) {
      row!.staffRole = staffRole;
      const profile = await get();
      expect(profile.status).toBe(200);
      expect(profile.body).toMatchObject({ email_verified: true, staff_role: staffRole, permissions: [
        ...(staffRole === 'admin' ? ['roles.manage'] : []), 'content.edit', 'content.publish', 'content.import', 'taxonomy.manage',
        ...(staffRole === 'admin' ? ['settings.manage'] : []), 'entitlements.grant',
      ] });
    }
    expect(hit).not.toHaveBeenCalled();
  });
  it('B1#24/S8/C2: partial PATCH changes vi then en, preserving other fields and storing an accepted alias as its canonical name', async () => {
    const before = { ...row! };
    for (const language of ['vi', 'en']) {
      const res = await patch({ native_language: language });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: userId, email: before.email, email_verified: false, native_language: language,
        timezone: before.timezone, staff_role: null, permissions: [], must_change_password: false,
        given_name: null, family_name: null, birth_date: null });
    }
    expect((await patch({ timezone: 'Asia/Saigon' })).status).toBe(200);
    const alias = await patch({ timezone: 'asia/ho_chi_minh' });
    expect(alias.status).toBe(200); expect(alias.body.timezone).toBe('Asia/Saigon');
    expect(alias.body.native_language).toBe('en');
    expect(row).toEqual({ ...before, nativeLanguage: 'en' });
    expect(hit).toHaveBeenCalledTimes(4);
    for (const call of hit.mock.calls) expect(call).toEqual(['user.write', userId]);
  });
  it('B1#24/SE5: invalid or extra fields reject the whole PATCH with Problem Details and no writes', async () => {
    const before = { ...row! };
    for (const body of [{ native_language: 'fr' }, { native_language: null }, { native_language: 42 },
      { timezone: 42 }, { timezone: null }, { timezone: 'x'.repeat(65) },
      { native_language: 'en', timezone: 'Mars/Base' }, { timezone: 'UTC\u0000' }, { timezone: '+07:00' },
      { timezone: 'UTC', extra: true }, { staff_role: 'admin' }, { email_verified: true },
      { birth_date: '2000-01-01' }, { given_name: null }, { given_name: '' }, { given_name: '   ' }, { given_name: 'x'.repeat(51) }]) {
      const res = await patch(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.operation_id).toEqual(expect.any(String));
      expect(row).toEqual(before);
    }
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('GET /v1/me returns names and birth date (null for an old account)', async () => {
    expect((await get()).body).toMatchObject({ given_name: null, family_name: null, birth_date: null });
    Object.assign(row!, { givenName: 'Lan', familyName: 'Nguyen', birthDate: new Date('2000-02-29T00:00:00Z') });
    expect((await get()).body).toMatchObject({ given_name: 'Lan', family_name: 'Nguyen', birth_date: '2000-02-29' });
  });
  it('FE15: an old account sets given_name', async () => {
    const res = await patch({ given_name: '  Lan ' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ given_name: 'Lan', family_name: null, birth_date: null });
    expect(row!.givenName).toBe('Lan');
  });
  it('PATCH family_name null clears it', async () => {
    row!.familyName = 'Nguyen';
    const res = await patch({ family_name: null });
    expect(res.status).toBe(200);
    expect(res.body.family_name).toBeNull(); expect(row!.familyName).toBeNull();
    expect((await patch({ family_name: '' })).body.family_name).toBeNull();
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
});
