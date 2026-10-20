import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from './identity.service.js';

describe('IdentityService (unit, isolated persistence)', () => {
  const prisma = { user: { findUnique: vi.fn(), update: vi.fn() } };
  const row = {
    id: 'user', email: 'a@example.com', emailVerifiedAt: null as Date | null,
    nativeLanguage: null as string | null, timezone: 'Asia/Ho_Chi_Minh', staffRole: null as string | null,
    givenName: null as string | null, familyName: null as string | null, birthDate: null as Date | null,
  };
  let identity: IdentityService;
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({ ...row });
    prisma.user.update.mockImplementation(async ({ data }) => ({ ...row, ...data }));
    identity = new IdentityService(prisma as unknown as PrismaClient);
  });

  it.each([null, 'editor', 'admin'] as const)('B2#67/B1#25: getProfile maps the stored %s role, content permissions and new-user defaults to the public contract', async (staffRole) => {
    prisma.user.findUnique.mockResolvedValue({ ...row, staffRole });
    expect(await identity.getProfile(row.id)).toEqual({
      id: row.id, email: row.email, email_verified: false, native_language: null,
      timezone: row.timezone, staff_role: staffRole, given_name: null, family_name: null, birth_date: null,
      permissions: staffRole === null ? [] : [
        ...(staffRole === 'admin' ? ['roles.manage'] : []), 'content.edit', 'content.publish', 'content.import', 'taxonomy.manage',
        ...(staffRole === 'admin' ? ['settings.manage'] : []), 'entitlements.grant',
      ],
    });
    expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({ id: row.id });
  });
  it('getProfile with a transaction reads through it, not the shared client (no second connection under the caller lock)', async () => {
    const tx = { user: { findUnique: vi.fn().mockResolvedValue({ ...row, staffRole: 'editor' }) } };
    expect(await identity.getProfile(row.id, tx as never)).toMatchObject({ id: row.id, staff_role: 'editor' });
    expect(tx.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
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
  it.each(['Mars/Base', '+07:00'])('B1#24/C2: an invalid or offset timezone (%s) rejects the whole update before persistence', async (timezone) => {
    await expect(identity.updateProfile(row.id, { native_language: 'en', timezone }))
      .rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('B1#24/C2: update stores and returns the canonical spelling of the timezone, not the one sent', async () => {
    const profile = await identity.updateProfile(row.id, { native_language: 'vi', timezone: 'asia/ho_chi_minh' });
    expect(profile).toEqual({ id: row.id, email: row.email, email_verified: false, native_language: 'vi',
      timezone: 'Asia/Saigon', staff_role: null, permissions: [], given_name: null, family_name: null, birth_date: null });
    expect(prisma.user.update.mock.calls[0][0]).toMatchObject({ where: { id: row.id },
      data: { nativeLanguage: 'vi', timezone: 'Asia/Saigon' } });
  });
  it('B1#24: a missing update target returns null while unexpected persistence errors propagate', async () => {
    prisma.user.update.mockRejectedValue({ code: 'P2025' });
    expect(await identity.updateProfile(row.id, { native_language: 'en' })).toBeNull();
    const error = new Error('Persistence unavailable');
    prisma.user.update.mockRejectedValue(error);
    await expect(identity.updateProfile(row.id, { native_language: 'en' })).rejects.toBe(error);
  });
});

type Row = { id: string; email: string; timezone: string };

/** An in-memory `users` table that answers only the two calls the loop makes. */
function fakePrisma(rows: Row[], afterFirstRead?: () => void) {
  const findMany = vi.fn(async (args: { where?: { id?: { gt?: string } }; orderBy: { id: 'asc' }; take: number }) => {
    const after = args.where?.id?.gt;
    const page = rows.filter((row) => after === undefined || row.id > after).sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, args.take).map(({ id, timezone }) => ({ id, timezone }));
    if (findMany.mock.calls.length === 1) afterFirstRead?.();
    return page;
  });
  const updateMany = vi.fn(async (args: { where: { id: string; timezone: string }; data: { timezone: string } }) => {
    const matching = rows.filter((row) => row.id === args.where.id && row.timezone === args.where.timezone);
    for (const row of matching) row.timezone = args.data.timezone;
    return { count: matching.length };
  });
  return { prisma: { user: { findMany, updateMany } } , findMany, updateMany };
}
const id = (n: number) => `u${String(n).padStart(5, '0')}`;

describe('IdentityService.normalizeStoredTimeZones', () => {
  it('normalize-timezones: rewrites only rows whose value changes, across pages of 500, and reports { scanned, changed }', async () => {
    const rows: Row[] = Array.from({ length: 1201 }, (_, n) => ({ id: id(n), email: `user${n}@example.test`, timezone: 'Asia/Saigon' }));
    rows[3].timezone = 'asia/ho_chi_minh'; rows[499].timezone = '+07:00'; rows[500].timezone = '-05:00';
    rows[900].timezone = '+05:30'; rows[1200].timezone = 'Mars/Base'; rows[7].timezone = 'UTC';
    const { prisma, findMany, updateMany } = fakePrisma(rows);

    expect(await new IdentityService(prisma as unknown as PrismaClient).normalizeStoredTimeZones()).toEqual({ scanned: 1201, changed: 5 });

    expect([rows[3], rows[499], rows[500], rows[900], rows[1200]].map((row) => row.timezone))
      .toEqual(['Asia/Saigon', 'Etc/GMT-7', 'Etc/GMT+5', 'UTC', 'UTC']);
    expect(rows[7].timezone).toBe('UTC');
    expect(updateMany).toHaveBeenCalledTimes(5);
    expect(updateMany.mock.calls.map(([args]) => args.where.id)).toEqual([id(3), id(499), id(500), id(900), id(1200)]);
    expect(findMany.mock.calls.map(([args]) => args.take)).toEqual([500, 500, 500]);
    expect(findMany.mock.calls.map(([args]) => args.where?.id?.gt)).toEqual([undefined, id(499), id(999)]);
    expect(await new IdentityService(prisma as unknown as PrismaClient).normalizeStoredTimeZones()).toEqual({ scanned: 1201, changed: 0 });
  });

  it('normalize-timezones: never reads or touches emails, and leaves a row alone that changed after it was read', async () => {
    const rows: Row[] = [
      { id: id(1), email: 'lan@example.test', timezone: '+07:00' },
      { id: id(2), email: 'minh@example.test', timezone: '+07:00' },
    ];
    const { prisma, findMany, updateMany } = fakePrisma(rows, () => { rows[1].timezone = 'Europe/Berlin'; });

    expect(await new IdentityService(prisma as unknown as PrismaClient).normalizeStoredTimeZones()).toEqual({ scanned: 2, changed: 1 });

    expect(rows.map((row) => row.timezone)).toEqual(['Etc/GMT-7', 'Europe/Berlin']);
    expect(JSON.stringify([findMany.mock.calls, updateMany.mock.calls])).not.toContain('example.test');
    for (const [args] of findMany.mock.calls) expect(args).toMatchObject({ select: { id: true, timezone: true } });
    for (const [args] of updateMany.mock.calls) expect(Object.keys(args.data)).toEqual(['timezone']);
  });

  it('normalize-timezones: an empty table scans nothing', async () => {
    expect(await new IdentityService(fakePrisma([]).prisma as unknown as PrismaClient).normalizeStoredTimeZones()).toEqual({ scanned: 0, changed: 0 });
  });
});
