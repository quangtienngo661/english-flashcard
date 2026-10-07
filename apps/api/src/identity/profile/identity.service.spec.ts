import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from './identity.service.js';

describe('IdentityService (unit, isolated persistence)', () => {
  const prisma = { user: { findUnique: vi.fn(), update: vi.fn() } };
  const row = {
    id: 'user', email: 'a@example.com', emailVerifiedAt: null as Date | null,
    nativeLanguage: null as string | null, timezone: 'Asia/Ho_Chi_Minh', staffRole: null as string | null,
  };
  let identity: IdentityService;
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({ ...row });
    prisma.user.update.mockImplementation(async ({ data }) => ({ ...row, ...data }));
    identity = new IdentityService(prisma as unknown as PrismaClient);
  });

  it.each([null, 'editor', 'admin'] as const)('B1#25: getProfile maps the stored %s role and new-user defaults to the public contract', async (staffRole) => {
    prisma.user.findUnique.mockResolvedValue({ ...row, staffRole });
    expect(await identity.getProfile(row.id)).toEqual({
      id: row.id, email: row.email, email_verified: false, native_language: null,
      timezone: row.timezone, staff_role: staffRole, permissions: staffRole === 'admin' ? ['roles.manage'] : [],
    });
    expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({ id: row.id });
  });
  it('B1#25/I24: verification and profile reads reflect the current stored row on every call', async () => {
    expect(await identity.isEmailVerified(row.id)).toBe(false);
    prisma.user.findUnique.mockResolvedValue({ ...row, emailVerifiedAt: new Date(), nativeLanguage: 'en' });
    expect(await identity.isEmailVerified(row.id)).toBe(true);
    expect(await identity.getProfile(row.id)).toMatchObject({ email_verified: true, native_language: 'en' });
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await identity.getProfile(row.id)).toBeNull();
    expect(await identity.isEmailVerified(row.id)).toBe(false);
  });
  it('B1#24: an invalid timezone rejects the whole update before persistence', async () => {
    await expect(identity.updateProfile(row.id, { native_language: 'en', timezone: 'Mars/Base' }))
      .rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('B1#24: update returns stored fields and preserves the accepted timezone alias as sent', async () => {
    const profile = await identity.updateProfile(row.id, { native_language: 'vi', timezone: 'Asia/Ho_Chi_Minh' });
    expect(profile).toEqual({ id: row.id, email: row.email, email_verified: false, native_language: 'vi',
      timezone: 'Asia/Ho_Chi_Minh', staff_role: null, permissions: [] });
    expect(prisma.user.update.mock.calls[0][0]).toMatchObject({ where: { id: row.id },
      data: { nativeLanguage: 'vi', timezone: 'Asia/Ho_Chi_Minh' } });
  });
  it('B1#24: a missing update target returns null while unexpected persistence errors propagate', async () => {
    prisma.user.update.mockRejectedValue({ code: 'P2025' });
    expect(await identity.updateProfile(row.id, { native_language: 'en' })).toBeNull();
    const error = new Error('Persistence unavailable');
    prisma.user.update.mockRejectedValue(error);
    await expect(identity.updateProfile(row.id, { native_language: 'en' })).rejects.toBe(error);
  });
});
