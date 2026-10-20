import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { StaffService } from './staff.service.js';

describe('StaffService.listUsers / getUserDetail (unit, isolated persistence)', () => {
  const prisma = { $queryRaw: vi.fn(), user: { findUnique: vi.fn() } };
  let staff: StaffService;
  const row = (n: number) => ({ id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, email: `u${n}@example.com`,
    given_name: null, family_name: null, email_verified_at: new Date('2026-10-01T00:00:00.000Z'), staff_role: null, status: 'active',
    created_at: new Date(Date.UTC(2026, 9, 1, 0, 0, 0, 500 + n)), last_seen_at: null,
    cursor_at: `2026-10-01T00:00:00.${500 + n}${String(n).padStart(3, '0')}Z` });
  const sqlOf = () => prisma.$queryRaw.mock.calls.at(-1)![0] as { sql: string; values: unknown[] };
  beforeEach(() => {
    vi.resetAllMocks();
    staff = new StaffService(prisma as unknown as PrismaClient, new AppLogger({ write: vi.fn() }),
      undefined as never, undefined as never, undefined as never, undefined as never, undefined as never, undefined as never);
  });
  it('FE14: q "50%" is escaped so the percent sign matches literally', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await staff.listUsers({ q: '50%_\\', pageSize: 20 });
    const { sql, values } = sqlOf();
    expect(sql).toContain('ILIKE'); expect(sql).toContain('ESCAPE');
    expect(values).toContain('%50\\%\\_\\\\%'); expect(values).toContain('\\'); expect(values).toContain(21);
  });
  it('newest first, a full page returns a bound token, and the next page continues after the cursor', async () => {
    prisma.$queryRaw.mockResolvedValue([row(3), row(2), row(1)]);
    const first = await staff.listUsers({ pageSize: 2 });
    expect(sqlOf().sql).toContain('ORDER BY created_at DESC, id DESC');
    expect(first.items.map((item) => item.email)).toEqual(['u3@example.com', 'u2@example.com']);
    expect(first.items[0]).toEqual({ id: row(3).id, email: 'u3@example.com', given_name: null, family_name: null, email_verified: true,
      staff_role: null, status: 'active', created_at: '2026-10-01T00:00:00.503Z', last_seen_at: null });
    expect(first.next_page_token).toEqual(expect.any(String));
    prisma.$queryRaw.mockResolvedValue([row(1)]);
    const second = await staff.listUsers({ pageSize: 2, pageToken: first.next_page_token! });
    const { sql, values } = sqlOf();
    expect(sql).toContain('(created_at, id) <');
    expect(values).toContain('2026-10-01T00:00:00.502002Z'); expect(values).toContain(row(2).id);
    expect(second).toEqual({ items: [expect.objectContaining({ email: 'u1@example.com' })], next_page_token: null });
  });
  it('a token minted for another filter, or a malformed one, is 400 without a query', async () => {
    prisma.$queryRaw.mockResolvedValue([row(3), row(2), row(1)]);
    const { next_page_token } = await staff.listUsers({ q: 'an', pageSize: 2 });
    for (const query of [{ q: 'bo' }, { q: 'an', status: 'locked' as const }, {}]) {
      prisma.$queryRaw.mockClear();
      await expect(staff.listUsers({ ...query, pageSize: 2, pageToken: next_page_token! }))
        .rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    }
    await expect(staff.listUsers({ pageSize: 2, pageToken: 'garbage' })).rejects.toMatchObject({ status: 400 });
  });
  it('the cursor keeps microseconds: the token carries the exact text and the query receives it unchanged', async () => {
    const tail = { ...row(1), cursor_at: '2026-10-01T00:00:00.502345Z' };
    prisma.$queryRaw.mockResolvedValue([row(3), tail]);
    const { next_page_token } = await staff.listUsers({ pageSize: 1 });
    expect(JSON.parse(Buffer.from(next_page_token!, 'base64url').toString()).payload.at).toBe(row(3).cursor_at);
    prisma.$queryRaw.mockResolvedValue([row(3), tail]);
    const page2 = await staff.listUsers({ pageSize: 2 });
    prisma.$queryRaw.mockResolvedValue([row(3), { ...tail, cursor_at: '2026-10-01T00:00:00.502345Z' }, row(1)]);
    const { next_page_token: token } = await staff.listUsers({ pageSize: 2 });
    prisma.$queryRaw.mockResolvedValue([]);
    await staff.listUsers({ pageSize: 2, pageToken: token! });
    expect(sqlOf().values).toContain('2026-10-01T00:00:00.502345Z'); expect(sqlOf().sql).toContain('::timestamptz');
    expect(page2.next_page_token).toBeNull();
  });
  it('a q containing a colon cannot reuse a token minted for another filter', async () => {
    prisma.$queryRaw.mockResolvedValue([row(3), row(2), row(1)]);
    const { next_page_token } = await staff.listUsers({ q: 'a:locked', pageSize: 2 });
    await expect(staff.listUsers({ q: 'a', status: 'locked', pageSize: 2, pageToken: next_page_token! })).rejects.toMatchObject({ status: 400 });
  });
  it('status=locked filters in SQL as a bound value', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await staff.listUsers({ status: 'locked', pageSize: 20 });
    expect(sqlOf().sql).toContain('status ='); expect(sqlOf().values).toContain('locked');
  });
  it('detail carries birth date, consent and lock fields, locked_by with email', async () => {
    const id = randomUUID(); const lockerId = randomUUID();
    prisma.user.findUnique
      .mockResolvedValueOnce({ id, email: 'a@example.com', givenName: 'Lan', familyName: 'Nguyen', emailVerifiedAt: new Date(), staffRole: null,
        status: 'locked', createdAt: new Date('2026-10-01T00:00:00.000Z'), lastSeenAt: null, birthDate: new Date('2000-02-29T00:00:00.000Z'),
        termsAcceptedAt: new Date('2026-10-01T00:00:00.000Z'), termsVersion: 'v1', lockedAt: new Date('2026-10-02T00:00:00.000Z'),
        lockedBy: lockerId, lockReason: 'spam' })
      .mockResolvedValueOnce({ email: 'admin@example.com' });
    expect(await staff.getUserDetail(id)).toEqual({ id, email: 'a@example.com', given_name: 'Lan', family_name: 'Nguyen', email_verified: true,
      staff_role: null, status: 'locked', created_at: '2026-10-01T00:00:00.000Z', last_seen_at: null, birth_date: '2000-02-29',
      terms_accepted_at: '2026-10-01T00:00:00.000Z', terms_version: 'v1', locked_at: '2026-10-02T00:00:00.000Z',
      locked_by: { id: lockerId, email: 'admin@example.com' }, lock_reason: 'spam' });
  });
  it('detail of an unknown id is 404', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(staff.getUserDetail(randomUUID())).rejects.toMatchObject({ status: 404 });
  });
});
