import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { SessionService } from '../sessions/session.service.js';
import { StaffService } from './staff.service.js';

describe('StaffService with a deleting account and sign-in methods (unit, isolated persistence)', () => {
  const clock = new FakeClock(new Date('2026-10-29T12:00:00Z'));
  const actorId = randomUUID();
  const targetId = randomUUID();
  const tx = { $executeRaw: vi.fn(), user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() }, otpCode: { updateMany: vi.fn() } };
  const prisma = { $transaction: vi.fn(), $queryRaw: vi.fn(), user: { findUnique: vi.fn() } };
  const sessions = { revokeAllForUser: vi.fn() };
  const budget = { assertAvailable: vi.fn() };
  let stored: Record<string, unknown>;
  let staff: StaffService;
  beforeEach(() => {
    vi.resetAllMocks();
    stored = { id: targetId, email: 'lan@example.com', givenName: 'Lan', familyName: null, emailVerifiedAt: clock.now(), staffRole: null,
      status: 'deleting', createdAt: clock.now(), lastSeenAt: null, birthDate: null, termsAcceptedAt: null, termsVersion: null,
      lockedAt: null, lockedBy: null, lockReason: null, timezone: 'Asia/Saigon',
      passwordCredential: { userId: targetId }, identities: [{ provider: 'google' }] };
    tx.$executeRaw.mockResolvedValue(1);
    tx.user.findUnique.mockImplementation(async () => ({ ...stored }));
    tx.user.count.mockResolvedValue(2);
    prisma.user.findUnique.mockImplementation(async () => ({ ...stored }));
    prisma.$transaction.mockImplementation(async (fn) => fn(tx));
    staff = new StaffService(prisma as unknown as PrismaClient, new AppLogger({ write: vi.fn() }), clock,
      { learnerAppUrl: 'http://l', adminAppUrl: 'http://a' } as never, { hash: vi.fn() } as never, budget as never,
      { afterResponse: vi.fn() } as never, sessions as unknown as SessionService);
  });
  const nothingWritten = () => {
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  };

  it.each([
    ['lock', () => staff.lockUser(actorId, targetId, 'spam')],
    ['unlock', () => staff.unlockUser(actorId, targetId)],
    ['update', () => staff.updateUser(actorId, targetId, { given_name: 'A' } as never, {} as Response)],
    ['reset password', () => staff.resetPassword(actorId, targetId, { must_change_password: false } as never, {} as Response)],
    ['set role', () => staff.setStaffRole(actorId, targetId, 'editor')],
  ])('B8 (design §6.2): %s on a deleting account → 409 account-deleting, nothing written', async (_name, run) => {
    await expect(run()).rejects.toMatchObject({ status: 409, problemType: 'account-deleting' });
    nothingWritten();
  });

  it('B1-3: locking writes only a row that is still not an admin; a promotion that landed first refuses the lock', async () => {
    stored.status = 'active';
    tx.user.updateMany.mockResolvedValue({ count: 1 });
    await staff.lockUser(actorId, targetId, 'spam');
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: targetId, OR: [{ staffRole: null }, { staffRole: { not: 'admin' } }] },
      data: { status: 'locked', lockedAt: clock.now(), lockedBy: actorId, lockReason: 'spam' },
    });
    expect(sessions.revokeAllForUser).toHaveBeenCalledOnce();

    sessions.revokeAllForUser.mockClear();
    tx.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(staff.lockUser(actorId, targetId, 'spam')).rejects.toMatchObject({ status: 409, problemType: 'lock-rule' });
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('B8 (P16): the last-admin count ignores admins that are deleting', async () => {
    stored.status = 'active';
    stored.staffRole = 'admin';
    tx.user.count.mockResolvedValue(1);
    await expect(staff.setStaffRole(actorId, targetId, 'editor')).rejects.toMatchObject({ status: 409, problemType: 'staff-role-rule' });
    expect(tx.user.count).toHaveBeenCalledWith({ where: { staffRole: 'admin', status: { not: 'deleting' } } });
  });

  it('B8: the user detail lists the sign-in methods and reports status deleting', async () => {
    const detail = await staff.getUserDetail(targetId);
    expect(detail).toMatchObject({ status: 'deleting', sign_in_methods: ['password', 'google'] });
    stored.passwordCredential = null;
    expect((await staff.getUserDetail(targetId)).sign_in_methods).toEqual(['google']);
  });

  it('B8: the user list lists the sign-in methods', async () => {
    const created = new Date('2026-10-01T00:00:00.500Z');
    prisma.$queryRaw.mockResolvedValue([{ id: targetId, email: 'a@example.com', given_name: null, family_name: null,
      email_verified_at: created, staff_role: null, status: 'deleting', created_at: created, last_seen_at: null,
      cursor_at: '2026-10-01T00:00:00.500000Z', has_password: false, has_google: true }]);
    const { items } = await staff.listUsers({ pageSize: 20 });
    expect(items[0]).toMatchObject({ status: 'deleting', sign_in_methods: ['google'] });
  });
});
