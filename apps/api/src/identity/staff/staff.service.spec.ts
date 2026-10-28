import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { MailBudget } from '../../common/mail/mail-budget.service.js';
import type { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import { runWithOperationId } from '../../common/logging/request-context.js';
import { encodePageToken } from '../../common/pagination/page-token.util.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { testConfig } from '../../../test/support/test-config.js';
import type { PasswordHasher } from '../auth/password-hasher.service.js';
import type { SessionService } from '../sessions/session.service.js';
import { StaffService } from './staff.service.js';

describe('StaffService (unit, isolated persistence)', () => {
  const tx = { $executeRaw: vi.fn(), user: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn() } };
  const prisma = { $transaction: vi.fn(), user: { findUnique: vi.fn(), findMany: vi.fn() } };
  const write = vi.fn();
  const target = { id: randomUUID(), email: 'a@example.com', emailVerifiedAt: new Date(), staffRole: 'admin' as string | null,
    givenName: null as string | null, familyName: null as string | null };
  let staff: StaffService;
  let committed: boolean;
  beforeEach(() => {
    vi.resetAllMocks(); committed = false;
    tx.$executeRaw.mockResolvedValue(1);
    tx.user.findUnique.mockResolvedValue({ ...target }); tx.user.count.mockResolvedValue(2);
    tx.user.update.mockImplementation(async ({ data }) => ({ ...target, ...data }));
    prisma.user.findUnique.mockResolvedValue({ ...target }); prisma.user.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (fn) => { const result = await fn(tx); committed = true; return result; });
    // createAccount is covered end to end in test/identity/staff.e2e-spec.ts; these unit cases never reach those deps.
    staff = new StaffService(prisma as unknown as PrismaClient, new AppLogger({ write }),
      undefined as never, undefined as never, undefined as never, undefined as never, undefined as never, undefined as never);
  });
  const expectStaffLock = () => {
    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(tx.$executeRaw.mock.calls[0][0].join('')).toBe("SELECT pg_advisory_xact_lock(hashtextextended('identity.staff_role', 0))");
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.user.findUnique.mock.invocationCallOrder[0]);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 10_000, maxWait: 5_000 });
  };
  it('B1#27: changes role under the staff lock, then logs ids after commit with operation_id', async () => {
    write.mockImplementation(() => { expect(committed).toBe(true); });
    const result = await runWithOperationId('operation', () => staff.setStaffRole('actor', target.id, 'editor'));
    expectStaffLock();
    expect(result).toEqual({ id: target.id, email: target.email, email_verified: true, staff_role: 'editor', given_name: null, family_name: null });
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: target.id }, data: { staffRole: 'editor' } }));
    expect(write).toHaveBeenCalledWith({ level: 'info', event: 'staff_role_changed', operation_id: 'operation',
      actor_id: 'actor', target_id: target.id, staff_role: 'editor' });
  });
  it('B1#28: a sole admin cannot become editor or learner; preserving admin skips the count', async () => {
    tx.user.count.mockResolvedValue(1);
    for (const role of ['editor', null] as const) {
      await expect(staff.setStaffRole('actor', target.id, role)).rejects.toMatchObject({ status: 409, problemType: 'staff-role-rule' });
    }
    expect(tx.user.update).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
    expect(tx.user.count).toHaveBeenCalledWith({ where: { staffRole: 'admin', status: { not: 'deleting' } } });
    tx.user.count.mockClear();
    await staff.setStaffRole('actor', target.id, 'admin');
    expect(tx.user.count).not.toHaveBeenCalled();
  });
  it('B1#27: unverified targets cannot receive either role but can have a role removed', async () => {
    tx.user.findUnique.mockResolvedValue({ ...target, staffRole: 'editor', emailVerifiedAt: null });
    for (const role of ['admin', 'editor'] as const) {
      await expect(staff.setStaffRole('actor', target.id, role)).rejects.toMatchObject({ status: 409, problemType: 'staff-role-rule' });
    }
    expect(tx.user.update).not.toHaveBeenCalled();
    await staff.setStaffRole('actor', target.id, null);
    expect(tx.user.update).toHaveBeenCalledOnce(); expect(tx.user.count).not.toHaveBeenCalled();
  });
  it('refuses promoting a locked account; demoting a locked admin stays allowed', async () => {
    tx.user.findUnique.mockResolvedValue({ ...target, staffRole: null, status: 'locked' });
    for (const role of ['admin', 'editor'] as const) {
      await expect(staff.setStaffRole('actor', target.id, role)).rejects.toMatchObject({ status: 409, problemType: 'staff-role-rule' });
    }
    expect(tx.user.update).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
    tx.user.findUnique.mockResolvedValue({ ...target, staffRole: 'admin', status: 'locked' });
    await staff.setStaffRole('actor', target.id, null);
    expect(tx.user.update).toHaveBeenCalledOnce();
  });
  it('B1#27: missing target is 404 without a write or change log', async () => {
    tx.user.findUnique.mockResolvedValue(null);
    await expect(staff.setStaffRole('actor', target.id, 'editor')).rejects.toMatchObject({ status: 404, problemType: 'not-found' });
    expectStaffLock(); expect(tx.user.update).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
  it('B1#29: CLI grant uses the same lock and normalization and logs after commit', async () => {
    expect(await runWithOperationId('cli', () => staff.grantAdminByEmail('  A@Example.COM '))).toBe('granted');
    expectStaffLock();
    expect(tx.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'a@example.com' } }));
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { staffRole: 'admin' } }));
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ event: 'staff_role_changed', actor_id: null,
      target_id: target.id, operation_id: 'cli' }));
  });
  it('B1#29: unknown or unverified CLI targets return outcomes without changing anything', async () => {
    tx.user.findUnique.mockResolvedValue(null);
    expect(await staff.grantAdminByEmail('missing@example.com')).toBe('not_found');
    tx.user.findUnique.mockResolvedValue({ ...target, emailVerifiedAt: null });
    expect(await staff.grantAdminByEmail(target.email)).toBe('unverified');
    expect(tx.user.update).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
  it('B1#27: exact email lookup normalizes, maps public fields, returns null and rejects invalid input', async () => {
    expect(await staff.findByEmail('  A@Example.COM ')).toEqual({ id: target.id, email: target.email, email_verified: true, staff_role: 'admin', given_name: null, family_name: null });
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: target.email } }));
    prisma.user.findUnique.mockResolvedValue(null); expect(await staff.findByEmail('missing@example.com')).toBeNull();
    await expect(staff.findByEmail('bad')).rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
  });
  it('B1#26: pagination orders by email, takes one extra row, and resumes after the decoded cursor email', async () => {
    const next = { ...target, id: randomUUID(), email: 'b@example.com', staffRole: 'editor' };
    prisma.user.findMany.mockResolvedValueOnce([target, next]).mockResolvedValueOnce([next]);
    const first = await staff.listStaff(1);
    expect(first.items).toHaveLength(1); expect(first.next_page_token).toBe(encodePageToken({ id: target.id }));
    expect(prisma.user.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { staffRole: { not: null } }, orderBy: { email: 'asc' }, take: 2 }));
    const second = await staff.listStaff(1, first.next_page_token!);
    expect(second.items[0].id).toBe(next.id); expect(second.next_page_token).toBeNull();
    expect(prisma.user.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { staffRole: { not: null }, email: { gt: target.email } } }));
  });
  it('B1#26: malformed, non-UUID and deleted cursors return validation-failed before listing (Review Focus #3)', async () => {
    for (const token of ['bad', '', encodePageToken({ id: 'not-uuid' })]) {
      await expect(staff.listStaff(20, token)).rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(staff.listStaff(20, encodePageToken({ id: target.id }))).rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
  it('B1#27: unexpected database errors propagate with no success log', async () => {
    tx.user.update.mockRejectedValue(new Error('database unavailable'));
    await expect(staff.setStaffRole('actor', target.id, 'editor')).rejects.toThrow('database unavailable');
    expect(committed).toBe(false); expect(write).not.toHaveBeenCalled();
  });
});

describe('StaffService.createAccount timezone (unit, isolated persistence)', () => {
  const tx = { $executeRaw: vi.fn(), user: { create: vi.fn() }, passwordCredential: { create: vi.fn() } };
  const prisma = { $transaction: vi.fn() };
  const budget = { assertAvailable: vi.fn() };
  const hasher = { hash: vi.fn() };
  const dispatcher = { afterResponse: vi.fn() };
  const body = { email: 'New@Example.com', staff_role: 'editor' as const, must_change_password: true, timezone: 'Asia/Ho_Chi_Minh' };
  const res = {} as Response;
  let staff: StaffService;
  beforeEach(() => {
    vi.resetAllMocks();
    tx.$executeRaw.mockResolvedValue(1);
    tx.user.create.mockImplementation(async ({ data }) => ({ id: data.id, email: data.email, emailVerifiedAt: data.emailVerifiedAt,
      staffRole: data.staffRole, givenName: data.givenName ?? null, familyName: data.familyName ?? null }));
    prisma.$transaction.mockImplementation(async (fn) => fn(tx));
    budget.assertAvailable.mockResolvedValue(undefined); hasher.hash.mockResolvedValue('hash');
    staff = new StaffService(prisma as unknown as PrismaClient, new AppLogger({ write: vi.fn() }),
      new FakeClock(new Date('2026-10-20T12:00:00Z')), testConfig(), hasher as unknown as PasswordHasher,
      budget as unknown as MailBudget, dispatcher as unknown as MailDispatcher, undefined as never);
  });

  it.each(['+07:00', 'Mars/Base'])('C2/FE32: %s is rejected as validation-failed before budget, hash or DB work', async (timezone) => {
    await expect(staff.createAccount('actor', { ...body, timezone }, res))
      .rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
    expect(budget.assertAvailable).not.toHaveBeenCalled(); expect(hasher.hash).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled(); expect(dispatcher.afterResponse).not.toHaveBeenCalled();
  });
  it('D8: staff create stores names when given, null when absent; no birth date, no consent', async () => {
    const named = await staff.createAccount('actor', { ...body, given_name: 'Lan', family_name: 'Nguyen' }, res);
    expect(named).toMatchObject({ given_name: 'Lan', family_name: 'Nguyen' });
    const data = tx.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ givenName: 'Lan', familyName: 'Nguyen' });
    expect(Object.keys(data).filter((key) => /birth|terms|consent/i.test(key))).toEqual([]);
    tx.user.create.mockClear();
    const bare = await staff.createAccount('actor', body, res);
    expect(bare).toMatchObject({ given_name: null, family_name: null });
    expect(tx.user.create.mock.calls[0][0].data.givenName ?? null).toBeNull();
    expect(tx.user.create.mock.calls[0][0].data.familyName ?? null).toBeNull();
  });
  it('C2: a valid zone is stored under its canonical name, whatever case the admin typed', async () => {
    for (const timezone of ['asia/ho_chi_minh', 'Asia/Ho_Chi_Minh', 'Asia/Saigon']) {
      tx.user.create.mockClear();
      await staff.createAccount('actor', { ...body, timezone }, res);
      expect(tx.user.create.mock.calls[0][0].data.timezone).toBe('Asia/Saigon');
    }
  });
});

describe('StaffService.lockUser / unlockUser (unit, isolated persistence)', () => {
  const clock = new FakeClock(new Date('2026-10-20T12:00:00Z'));
  const actorId = randomUUID(); const targetId = randomUUID();
  const tx = { $executeRaw: vi.fn(), user: { findUnique: vi.fn(), update: vi.fn() }, otpCode: { updateMany: vi.fn() } };
  const prisma = { $transaction: vi.fn(), user: { findUnique: vi.fn() } };
  const sessions = { revokeAllForUser: vi.fn() };
  const logs: LogEntry[] = [];
  const reason = 'Spam from lan@example.com';
  type Stored = { id: string; email: string; givenName: string | null; familyName: string | null; emailVerifiedAt: Date | null;
    staffRole: string | null; status: string; createdAt: Date; lastSeenAt: Date | null; birthDate: Date | null;
    termsAcceptedAt: Date | null; termsVersion: string | null; lockedAt: Date | null; lockedBy: string | null; lockReason: string | null;
    passwordCredential: { userId: string } | null; identities: Array<{ provider: string }> };
  let stored: Stored;
  let committed: boolean;
  let staff: StaffService;
  beforeEach(() => {
    vi.resetAllMocks(); logs.length = 0; committed = false;
    stored = { id: targetId, email: 'lan@example.com', givenName: 'Lan', familyName: null, emailVerifiedAt: clock.now(), staffRole: null,
      status: 'active', createdAt: clock.now(), lastSeenAt: null, birthDate: null, termsAcceptedAt: null, termsVersion: null,
      lockedAt: null, lockedBy: null, lockReason: null, passwordCredential: null, identities: [] };
    tx.$executeRaw.mockResolvedValue(1);
    tx.user.findUnique.mockImplementation(async () => ({ ...stored }));
    tx.user.update.mockImplementation(async ({ data }) => { stored = { ...stored, ...data }; return { ...stored }; });
    tx.otpCode.updateMany.mockResolvedValue({ count: 2 });
    prisma.user.findUnique.mockImplementation(async ({ where }) => (where.id === targetId ? { ...stored }
      : where.id === actorId ? { email: 'admin@example.com' } : null));
    prisma.$transaction.mockImplementation(async (fn) => { const result = await fn(tx); committed = true; return result; });
    staff = new StaffService(prisma as unknown as PrismaClient, new AppLogger({ write: (entry) => { logs.push(entry); } }),
      clock, undefined as never, undefined as never, undefined as never, undefined as never,
      sessions as unknown as SessionService);
  });
  const nothingWritten = () => {
    expect(tx.user.update).not.toHaveBeenCalled(); expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(tx.otpCode.updateMany).not.toHaveBeenCalled();
  };

  it('N4: lock sets status, columns, revokes every chain and invalidates live OTP codes', async () => {
    const detail = await staff.lockUser(actorId, targetId, reason);
    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    const [sql, ...values] = tx.$executeRaw.mock.calls[0];
    expect(sql.join('?')).toBe('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))');
    expect(values).toEqual([`identity.user:${targetId}`]);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.user.findUnique.mock.invocationCallOrder[0]);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 10_000, maxWait: 5_000 });
    expect(tx.user.update).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ where: { id: targetId },
      data: { status: 'locked', lockedAt: clock.now(), lockedBy: actorId, lockReason: reason } }));
    expect(sessions.revokeAllForUser).toHaveBeenCalledExactlyOnceWith(tx, targetId, 'locked');
    expect(tx.otpCode.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: targetId, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: clock.now() } });
    expect(committed).toBe(true);
    expect(detail).toMatchObject({ id: targetId, status: 'locked', locked_at: clock.now().toISOString(),
      locked_by: { id: actorId, email: 'admin@example.com' }, lock_reason: reason });
  });
  it('FE11: locking oneself or an admin → 409 lock-rule, nothing written', async () => {
    stored = { ...stored, id: actorId };
    await expect(staff.lockUser(actorId, actorId, reason)).rejects.toMatchObject({ status: 409, problemType: 'lock-rule', problemTitle: 'Lock rule' });
    stored = { ...stored, id: targetId, staffRole: 'admin' };
    await expect(staff.lockUser(actorId, targetId, reason)).rejects.toMatchObject({ status: 409, problemType: 'lock-rule' });
    nothingWritten(); expect(logs).toEqual([]);
  });
  it('missing target → 404 for lock and unlock, nothing written', async () => {
    tx.user.findUnique.mockResolvedValue(null);
    await expect(staff.lockUser(actorId, targetId, reason)).rejects.toMatchObject({ status: 404, problemType: 'not-found' });
    await expect(staff.unlockUser(actorId, targetId)).rejects.toMatchObject({ status: 404, problemType: 'not-found' });
    nothingWritten(); expect(logs).toEqual([]);
  });
  it('FE12: a demoted ex-admin can be locked', async () => {
    stored = { ...stored, staffRole: 'editor' };
    await expect(staff.lockUser(actorId, targetId, reason)).resolves.toMatchObject({ status: 'locked', staff_role: 'editor' });
    expect(sessions.revokeAllForUser).toHaveBeenCalledOnce();
  });
  it('lock twice and unlock twice change nothing the second time', async () => {
    await staff.lockUser(actorId, targetId, reason);
    vi.clearAllMocks();
    const again = await staff.lockUser(randomUUID(), targetId, 'another reason');
    nothingWritten();
    expect(again).toMatchObject({ status: 'locked', lock_reason: reason, locked_by: { id: actorId } });
    const unlocked = await staff.unlockUser(actorId, targetId);
    expect(tx.$executeRaw.mock.calls.at(-1)!.slice(1)).toEqual([`identity.user:${targetId}`]);
    expect(tx.user.update).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ where: { id: targetId },
      data: { status: 'active', lockedAt: null, lockedBy: null, lockReason: null } }));
    expect(unlocked).toMatchObject({ status: 'active', locked_at: null, locked_by: null, lock_reason: null });
    tx.user.update.mockClear();
    await expect(staff.unlockUser(actorId, targetId)).resolves.toMatchObject({ status: 'active' });
    expect(tx.user.update).not.toHaveBeenCalled(); expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(logs.map((entry) => entry.event)).toEqual(['account_locked', 'account_unlocked']);
  });
  it('logs carry ids only (no reason, no email)', async () => {
    await runWithOperationId('op', () => staff.lockUser(actorId, targetId, reason));
    await runWithOperationId('op', () => staff.unlockUser(actorId, targetId));
    expect(logs).toEqual([
      { level: 'info', event: 'account_locked', operation_id: 'op', actor_id: actorId, target_id: targetId },
      { level: 'info', event: 'account_unlocked', operation_id: 'op', actor_id: actorId, target_id: targetId },
    ]);
    expect(JSON.stringify(logs)).not.toContain('Spam'); expect(JSON.stringify(logs)).not.toContain('example.com');
  });
});
