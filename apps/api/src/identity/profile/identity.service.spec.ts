import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from './identity.service.js';

const silentLogger = new AppLogger({ write: () => {} });

describe('IdentityService (unit, isolated persistence)', () => {
  const prisma = { user: { findUnique: vi.fn(), update: vi.fn() } };
  const row = {
    id: 'user', email: 'a@example.com', emailVerifiedAt: null as Date | null,
    nativeLanguage: null as string | null, timezone: 'Asia/Ho_Chi_Minh', staffRole: null as string | null,
    givenName: null as string | null, familyName: null as string | null, birthDate: null as Date | null, termsAcceptedAt: null as Date | null,
  };
  let identity: IdentityService;
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({ ...row });
    prisma.user.update.mockImplementation(async ({ data }) => ({ ...row, ...data }));
    identity = new IdentityService(prisma as unknown as PrismaClient, new FakeClock(), silentLogger);
  });

  it('emailsOf maps ids to addresses with no status or verification filter, and skips the query for no ids', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'u1', email: 'a@example.com' }]);
    const service = new IdentityService({ user: { findMany } } as unknown as PrismaClient, new FakeClock(), silentLogger);
    expect(await service.emailsOf([])).toEqual(new Map()); expect(findMany).not.toHaveBeenCalled();
    expect(await service.emailsOf(['u1', 'u1', 'u2'])).toEqual(new Map([['u1', 'a@example.com']]));
    expect(findMany).toHaveBeenCalledWith({ where: { id: { in: ['u1', 'u2'] } }, select: { id: true, email: true } });
  });

  it('D35: staffUserIds lists the ids of users with a staff role (any status), ordered by id; no staff gives []', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'a1' }, { id: 'e1' }]);
    const service = new IdentityService({ user: { findMany } } as unknown as PrismaClient, new FakeClock(), silentLogger);
    expect(await service.staffUserIds()).toEqual(['a1', 'e1']);
    expect(findMany).toHaveBeenCalledExactlyOnceWith({ where: { staffRole: { not: null } }, select: { id: true }, orderBy: { id: 'asc' } });
    findMany.mockResolvedValueOnce([]);
    expect(await service.staffUserIds()).toEqual([]);
  });

  it('findUserIdByEmail matches the normalized address and returns null for an unknown or malformed one', async () => {
    const findUnique = vi.fn().mockImplementation(async ({ where }) => (where.email === 'lan@example.com' ? { id: 'u1' } : null));
    const service = new IdentityService({ user: { findUnique } } as unknown as PrismaClient, new FakeClock(), silentLogger);
    expect(await service.findUserIdByEmail('  Lan@Example.com ')).toBe('u1');
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'lan@example.com' }, select: { id: true } });
    expect(await service.findUserIdByEmail('other@example.com')).toBeNull();
    findUnique.mockClear();
    expect(await service.findUserIdByEmail('not an email')).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each([null, 'editor', 'admin'] as const)('B2#67/B1#25: getProfile maps the stored %s role, content permissions and new-user defaults to the public contract', async (staffRole) => {
    prisma.user.findUnique.mockResolvedValue({ ...row, staffRole });
    expect(await identity.getProfile(row.id)).toEqual({
      id: row.id, email: row.email, email_verified: false, native_language: null,
      timezone: row.timezone, staff_role: staffRole, given_name: null, family_name: null, birth_date: null, terms_accepted_at: null,
      permissions: staffRole === null ? [] : [
        ...(staffRole === 'admin' ? ['roles.manage'] : []), 'content.edit', 'content.publish', 'content.import', 'taxonomy.manage',
        ...(staffRole === 'admin' ? ['settings.manage'] : []), 'entitlements.grant', 'users.read', 'ai.view',
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
      timezone: 'Asia/Saigon', staff_role: null, permissions: [], given_name: null, family_name: null, birth_date: null, terms_accepted_at: null });
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

    expect(await new IdentityService(prisma as unknown as PrismaClient, new FakeClock(), silentLogger).normalizeStoredTimeZones()).toEqual({ scanned: 1201, changed: 5 });

    expect([rows[3], rows[499], rows[500], rows[900], rows[1200]].map((row) => row.timezone))
      .toEqual(['Asia/Saigon', 'Etc/GMT-7', 'Etc/GMT+5', 'UTC', 'UTC']);
    expect(rows[7].timezone).toBe('UTC');
    expect(updateMany).toHaveBeenCalledTimes(5);
    expect(updateMany.mock.calls.map(([args]) => args.where.id)).toEqual([id(3), id(499), id(500), id(900), id(1200)]);
    expect(findMany.mock.calls.map(([args]) => args.take)).toEqual([500, 500, 500]);
    expect(findMany.mock.calls.map(([args]) => args.where?.id?.gt)).toEqual([undefined, id(499), id(999)]);
    expect(await new IdentityService(prisma as unknown as PrismaClient, new FakeClock(), silentLogger).normalizeStoredTimeZones()).toEqual({ scanned: 1201, changed: 0 });
  });

  it('normalize-timezones: never reads or touches emails, and leaves a row alone that changed after it was read', async () => {
    const rows: Row[] = [
      { id: id(1), email: 'lan@example.test', timezone: '+07:00' },
      { id: id(2), email: 'minh@example.test', timezone: '+07:00' },
    ];
    const { prisma, findMany, updateMany } = fakePrisma(rows, () => { rows[1].timezone = 'Europe/Berlin'; });

    expect(await new IdentityService(prisma as unknown as PrismaClient, new FakeClock(), silentLogger).normalizeStoredTimeZones()).toEqual({ scanned: 2, changed: 1 });

    expect(rows.map((row) => row.timezone)).toEqual(['Etc/GMT-7', 'Europe/Berlin']);
    expect(JSON.stringify([findMany.mock.calls, updateMany.mock.calls])).not.toContain('example.test');
    for (const [args] of findMany.mock.calls) expect(args).toMatchObject({ select: { id: true, timezone: true } });
    for (const [args] of updateMany.mock.calls) expect(Object.keys(args.data)).toEqual(['timezone']);
  });

  it('normalize-timezones: an empty table scans nothing', async () => {
    expect(await new IdentityService(fakePrisma([]).prisma as unknown as PrismaClient, new FakeClock(), silentLogger).normalizeStoredTimeZones()).toEqual({ scanned: 0, changed: 0 });
  });
});

describe('IdentityService.updateProfile birth_date (design §8.1, GA1–GA7)', () => {
  // 2026-10-18T05:00Z is 12:00 on 18/10 in Ho Chi Minh City.
  const clock = new FakeClock(new Date('2026-10-18T05:00:00Z'));
  const base = {
    id: 'user', email: 'a@example.com', emailVerifiedAt: null as Date | null, nativeLanguage: 'vi' as string | null,
    timezone: 'Asia/Ho_Chi_Minh', staffRole: null as string | null, mustChangePassword: false,
    givenName: 'Lan' as string | null, familyName: null as string | null, birthDate: new Date('2000-05-12T00:00:00Z') as Date | null,
  };
  function setup(row = base) {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ ...row }),
        update: vi.fn().mockImplementation(async ({ data }) => ({ ...row, ...data })),
      },
    };
    const logs: LogEntry[] = [];
    const logger = new AppLogger({ write: (entry) => { logs.push(entry); } });
    return { prisma, logs, identity: new IdentityService(prisma as unknown as PrismaClient, clock, logger) };
  }
  const problemOf = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (error) {
      const problem = error as ProblemDetailsException;
      return { type: problem.problemType, violations: problem.extensions?.violations as string[] | undefined };
    }
    throw new Error('expected a problem');
  };

  it('GA1: a valid 13+ birth date is stored and returned; the log names the user, not the date', async () => {
    const { identity, prisma, logs } = setup();
    const profile = await identity.updateProfile('user', { birth_date: '2008-05-14' });
    expect(profile?.birth_date).toBe('2008-05-14');
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ birthDate: new Date('2008-05-14T00:00:00Z') });
    expect(JSON.stringify(logs)).not.toContain('2008');
    expect(logs.map((l) => l.event)).toContain('profile_birth_date_changed');
  });

  it('GA2: under 13 → 400 age-below-minimum and nothing written', async () => {
    const { identity, prisma } = setup();
    expect((await problemOf(identity.updateProfile('user', { birth_date: '2013-10-19' }))).type).toContain('age-below-minimum');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('GA2: turning 13 today in the profile zone is allowed', async () => {
    const { identity } = setup();
    expect((await identity.updateProfile('user', { birth_date: '2013-10-18' }))?.birth_date).toBe('2013-10-18');
  });

  it('GA3: after today in the profile zone → validation-failed with violations [birth_date]', async () => {
    const { identity, prisma } = setup();
    const problem = await problemOf(identity.updateProfile('user', { birth_date: '2026-10-19' }));
    expect(problem.type).toContain('validation-failed');
    expect(problem.violations).toEqual(['birth_date']);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('GA3: "today" follows a timezone sent in the same request (at 12:00Z, UTC+14 is already 19/10)', async () => {
    const noon = (tz?: string) =>
      new IdentityService(setup().prisma as unknown as PrismaClient, new FakeClock(new Date('2026-10-18T12:00:00Z')),
        new AppLogger({ write: () => {} })).updateProfile('user', { birth_date: '2013-10-19', ...(tz ? { timezone: tz } : {}) });
    expect((await problemOf(noon())).type).toContain('age-below-minimum');
    expect((await noon('Pacific/Kiritimati'))?.birth_date).toBe('2013-10-19');
  });

  it('GA5: a bad birth date with a new name changes nothing', async () => {
    const { identity, prisma } = setup();
    await problemOf(identity.updateProfile('user', { given_name: 'Mai', birth_date: '2020-01-01' }));
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('GA6: born 29/2/2008 is 13 on 1/3/2021, not on 28/2/2021', async () => {
    const early = new IdentityService(setup().prisma as unknown as PrismaClient, new FakeClock(new Date('2021-02-28T05:00:00Z')),
      new AppLogger({ write: () => {} }));
    expect((await problemOf(early.updateProfile('user', { birth_date: '2008-02-29' }))).type).toContain('age-below-minimum');
    const onTime = new IdentityService(setup().prisma as unknown as PrismaClient, new FakeClock(new Date('2021-03-01T05:00:00Z')),
      new AppLogger({ write: () => {} }));
    expect((await onTime.updateProfile('user', { birth_date: '2008-02-29' }))?.birth_date).toBe('2008-02-29');
  });

  it('GA7: an old staff account with no birth date can set one, same 13+ rule', async () => {
    const { identity } = setup({ ...base, staffRole: 'editor', birthDate: null });
    expect((await identity.updateProfile('user', { birth_date: '1990-01-01' }))?.birth_date).toBe('1990-01-01');
  });
});
