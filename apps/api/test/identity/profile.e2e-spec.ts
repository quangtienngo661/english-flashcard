import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { IdentityService } from '../../src/identity/profile/identity.service.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

describe('profile and IdentityService (e2e)', () => {
  let ctx: TestApp;
  let identity: IdentityService;
  let userId: string;
  let email: string;
  let token: string;
  const account = () => ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const get = () => ctx.http().get('/v1/me').set('Authorization', `Bearer ${token}`);
  const patch = (body: object) => ctx.http().patch('/v1/me').set('Authorization', `Bearer ${token}`).send(body);
  beforeAll(async () => { ctx = await createTestApp(); identity = ctx.app.get(IdentityService); });
  beforeEach(async () => {
    ctx.clock.set(new Date('2026-10-07T12:00:00Z'));
    ({ userId, email } = await seedUser(ctx.prisma));
    token = (await startSession(ctx, userId)).accessToken;
    ctx.mailer.sent.length = 0;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B1#24/SE5: native_language fr returns 400 and leaves the stored row unchanged', async () => {
    const before = await account(); const res = await patch({ native_language: 'fr' });
    expect(res.status).toBe(400); expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    expect(await account()).toEqual(before);
  });
  it('B1#24: Mars/Base rejects the whole update; Asia/Ho_Chi_Minh is stored as sent', async () => {
    const before = await account();
    const invalid = await patch({ timezone: 'Mars/Base', native_language: 'en' });
    expect(invalid.status).toBe(400); expect(invalid.body.type).toBe('https://api.example.com/problems/validation-failed');
    expect(await account()).toEqual(before);
    expect((await patch({ timezone: 'Asia/Saigon' })).status).toBe(200);
    const valid = await patch({ timezone: 'Asia/Ho_Chi_Minh' });
    expect(valid.status).toBe(200); expect(valid.body.timezone).toBe('Asia/Ho_Chi_Minh');
    expect((await account()).timezone).toBe('Asia/Ho_Chi_Minh');
    expect((await account()).nativeLanguage).toBeNull();
  });
  it('B1#24/S8: vi then en stores en and returns the complete profile', async () => {
    expect((await patch({ native_language: 'vi' })).status).toBe(200);
    expect((await account()).nativeLanguage).toBe('vi');
    const res = await patch({ native_language: 'en' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: userId, email, email_verified: false, native_language: 'en',
      timezone: 'Asia/Ho_Chi_Minh', staff_role: null, permissions: [], must_change_password: false });
    expect((await account()).nativeLanguage).toBe('en');
    expect((await get()).body).toEqual(res.body);
  });
  it('B1#25/I24: isEmailVerified is false then true after the verification endpoint writes the row', async () => {
    expect(await identity.isEmailVerified(userId)).toBe(false);
    const issued = await ctx.http().post('/v1/auth/otp').set('Authorization', `Bearer ${token}`).send({ purpose: 'verify_email' });
    expect(issued.status).toBe(202); await ctx.drainMail();
    const verified = await ctx.http().post('/v1/auth/verify-email').set('Authorization', `Bearer ${token}`)
      .send({ code: ctx.mailer.otpFor(email)! });
    expect(verified.status).toBe(200); expect(verified.body).toEqual({ email_verified: true });
    expect((await account()).emailVerifiedAt).toEqual(ctx.clock.now());
    expect(await identity.isEmailVerified(userId)).toBe(true);
    expect(await identity.getProfile(userId)).toMatchObject({ email_verified: true });
  });
  it('B2#67/B1#25: getProfile and GET /me return all four content permissions for admin and editor, with learner defaults intact', async () => {
    const profile = { id: userId, email, email_verified: false, native_language: null,
      timezone: 'Asia/Ho_Chi_Minh', staff_role: null, permissions: [], must_change_password: false };
    expect(await identity.getProfile(userId)).toEqual(profile);
    expect((await get()).body).toEqual(profile);
    for (const staffRole of ['admin', 'editor'] as const) {
      const staff = await seedUser(ctx.prisma, { verified: true, staffRole });
      const expected = { ...profile, id: staff.userId, email: staff.email, email_verified: true, staff_role: staffRole,
        permissions: [...(staffRole === 'admin' ? ['roles.manage'] : []),
          'content.edit', 'content.publish', 'content.import', 'taxonomy.manage',
          ...(staffRole === 'admin' ? ['settings.manage'] : [])] };
      expect(await identity.getProfile(staff.userId)).toEqual(expected);
      const access = (await startSession(ctx, staff.userId)).accessToken;
      const res = await ctx.http().get('/v1/me').set('Authorization', `Bearer ${access}`);
      expect(res.status).toBe(200); expect(res.body).toEqual(expected);
    }
  });
  it('B1#25: a valid token whose user is deleted returns 401 instead of 500 (Review Focus #5)', async () => {
    await ctx.prisma.user.delete({ where: { id: userId } });
    expect(await ctx.prisma.user.findUnique({ where: { id: userId } })).toBeNull();
    const res = await get();
    expect(res.status).toBe(401); expect(res.body.type).toBe('https://api.example.com/problems/invalid-token');
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.operation_id).toEqual(expect.any(String));
    expect(await identity.getProfile(userId)).toBeNull(); expect(await identity.isEmailVerified(userId)).toBe(false);
  });
});
