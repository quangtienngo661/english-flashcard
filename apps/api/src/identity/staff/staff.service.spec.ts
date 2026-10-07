import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLogger } from '../../common/logging/app-logger.js';
import { runWithOperationId } from '../../common/logging/request-context.js';
import { encodePageToken } from '../../common/pagination/page-token.util.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { StaffService } from './staff.service.js';

describe('StaffService (unit, isolated persistence)', () => {
  const tx = { $executeRaw: vi.fn(), user: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn() } };
  const prisma = { $transaction: vi.fn(), user: { findUnique: vi.fn(), findMany: vi.fn() } };
  const write = vi.fn();
  const target = { id: randomUUID(), email: 'a@example.com', emailVerifiedAt: new Date(), staffRole: 'admin' as string | null };
  let staff: StaffService;
  let committed: boolean;
  beforeEach(() => {
    vi.resetAllMocks(); committed = false;
    tx.$executeRaw.mockResolvedValue(1);
    tx.user.findUnique.mockResolvedValue({ ...target }); tx.user.count.mockResolvedValue(2);
    tx.user.update.mockImplementation(async ({ data }) => ({ ...target, ...data }));
    prisma.user.findUnique.mockResolvedValue({ ...target }); prisma.user.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (fn) => { const result = await fn(tx); committed = true; return result; });
    staff = new StaffService(prisma as unknown as PrismaClient, new AppLogger({ write }));
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
    expect(result).toEqual({ id: target.id, email: target.email, email_verified: true, staff_role: 'editor' });
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
    expect(tx.user.count).toHaveBeenCalledWith({ where: { staffRole: 'admin' } });
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
    expect(await staff.findByEmail('  A@Example.COM ')).toEqual({ id: target.id, email: target.email, email_verified: true, staff_role: 'admin' });
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
