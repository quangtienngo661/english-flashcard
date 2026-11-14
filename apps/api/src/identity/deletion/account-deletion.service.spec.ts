import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { SessionService } from '../sessions/session.service.js';
import { AccountDeletionRegistry, ERASE_ORDER, type AccountDataEraser, type ErasableModule } from './account-eraser.js';
import { AccountDeletionService, type DeleteInput } from './account-deletion.service.js';

const clock = new FakeClock(new Date('2026-10-29T12:00:00Z'));
const USER = randomUUID();
const DAY = 86_400_000;

type Row = {
  email: string; status: string; staffRole: string | null; deletingBy: string | null; emailVerifiedAt: Date | null;
  termsAcceptedAt: Date | null; createdAt: Date;
};

/** The unit double: statements are recorded, rows are one object. Locks, cascades and races are proven in the smoke. */
function setup(overrides: Partial<Row> = {}, opts: { admins?: number; renewing?: boolean; eraserFails?: ErasableModule } = {}) {
  const events: string[] = [];
  let row: Row | null = {
    email: 'lan@example.com', status: 'active', staffRole: null, deletingBy: null, emailVerifiedAt: clock.now(),
    termsAcceptedAt: null, createdAt: new Date(clock.now().getTime() - 30 * DAY), ...overrides,
  };
  const anonIds: string[] = [];
  const deleted: Array<{ userId: string; by: string; deletedAt?: Date }> = [];
  const logs: LogEntry[] = [];
  const tx = {
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join('?');
      events.push(sql.includes('statement_timeout') ? 'timeout' : `lock:${String(values[0] ?? 'identity.staff_role')}`);
      return 1;
    }),
    user: {
      findUnique: vi.fn(async () => (row ? { ...row } : null)),
      update: vi.fn(async ({ data }: { data: Partial<Row> }) => { events.push('tx-a-write'); Object.assign(row!, data); return {}; }),
      count: vi.fn(async (_a: unknown) => opts.admins ?? 2),
      delete: vi.fn(async () => { events.push('user-delete'); row = null; return {}; }),
    },
    otpCode: { updateMany: vi.fn(async () => ({ count: 0 })) },
    deletedAccount: { createMany: vi.fn(async ({ data }: { data: Array<{ userId: string; by: string }> }) => { events.push('deleted-accounts'); deleted.push(...data); return { count: 1 }; }) },
    idempotencyKey: { deleteMany: vi.fn(async () => { events.push('idempotency'); return { count: 0 }; }) },
  };
  const prisma = {
    user: { findUnique: vi.fn(async () => (row ? { staffRole: row.staffRole } : null)) },
    $transaction: vi.fn(async (fn: (t: unknown) => unknown, options: unknown) => { events.push(`tx:${JSON.stringify(options)}`); return fn(tx); }),
  };
  const sessions = { revokeAllForUser: vi.fn(async (_t: unknown, _u: string, reason: string) => { events.push(`revoke:${reason}`); }) };
  const registry = new AccountDeletionRegistry();
  for (const module of ERASE_ORDER) {
    const eraser: AccountDataEraser = {
      module,
      erase: vi.fn(async (_tx, _userId, anonId, options) => {
        events.push(`erase:${module}:${options.checks}`);
        anonIds.push(anonId);
        if (opts.eraserFails === module) throw new Error('boom');
      }),
    };
    registry.registerEraser(eraser);
  }
  const precondition = { renewing: vi.fn(async () => opts.renewing ?? false), turnOffRenewalForAdminDelete: vi.fn() };
  registry.registerPrecondition(precondition as never);
  const retentionYears = vi.fn(async () => 7);
  registry.registerSettingsReader({ unverifiedCleanupDays: async () => 7, transactionRetentionYears: retentionYears });
  const afterResponse = vi.fn();
  const runNow = vi.fn();
  const dispatcher = { afterResponse, runNow } as unknown as MailDispatcher;
  const service = new AccountDeletionService(
    prisma as unknown as PrismaClient, clock, new AppLogger({ write: (e) => logs.push(e) }), registry,
    sessions as unknown as SessionService, dispatcher,
  );
  const res = {} as Response;
  const mailOf = (call: unknown[]) => (call[call.length - 1] as Array<() => Promise<{ to: string; text: string } | null>>)[0]!();
  return { service, events, tx, prisma, sessions, precondition, anonIds, deleted, logs, afterResponse, runNow, res, mailOf, retentionYears, row: () => row };
}

const call = (service: AccountDeletionService, input: Partial<DeleteInput> = {}) =>
  service.delete({ userId: USER, by: 'self', mode: 'normal', ...input });

describe('AccountDeletionService (unit double: statements and order)', () => {
  it('Tx A commits before any eraser runs; Tx B takes the 120 s timeout and the user lock first', async () => {
    const s = setup();
    expect(await call(s.service)).toBe('done');
    const firstErase = s.events.findIndex((e) => e.startsWith('erase:'));
    expect(s.events.indexOf('tx-a-write')).toBeLessThan(firstErase);
    expect(s.events).toContain('revoke:account-deleted');
    expect(s.events.filter((e) => e.startsWith('tx:'))).toEqual([
      'tx:{"timeout":10000,"maxWait":5000}', 'tx:{"timeout":120000,"maxWait":5000}',
    ]);
    const txB = s.events.slice(s.events.indexOf('tx:{"timeout":120000,"maxWait":5000}'));
    expect(txB.slice(0, 3)).toEqual(['tx:{"timeout":120000,"maxWait":5000}', 'timeout', `lock:identity.user:${USER}`]);
    expect(s.events.filter((e) => e.startsWith('erase:')).map((e) => e.split(':')[1])).toEqual([...ERASE_ORDER]);
    expect(txB.slice(-3)).toEqual(['idempotency', 'deleted-accounts', 'user-delete']);
  });

  it('one anonymous id per run: the same for every eraser, different from the user id and between runs', async () => {
    const a = setup();
    await call(a.service);
    const b = setup();
    await call(b.service);
    expect(new Set(a.anonIds).size).toBe(1);
    expect(a.anonIds[0]).not.toBe(USER);
    expect(a.anonIds[0]).not.toBe(b.anonIds[0]);
  });

  it('self: a staff account is refused (staff-account); a renewing plan is refused (subscription-renewing); nothing is written', async () => {
    const staff = setup({ staffRole: 'editor' });
    await expect(call(staff.service)).rejects.toMatchObject({ status: 409, problemType: 'staff-account' });
    expect(staff.events).not.toContain('tx-a-write');
    const renewing = setup({}, { renewing: true });
    await expect(call(renewing.service)).rejects.toMatchObject({ status: 409, problemType: 'subscription-renewing' });
    expect(renewing.events).not.toContain('tx-a-write');
    expect(renewing.events.some((e) => e.startsWith('erase:'))).toBe(false);
  });

  it('admin: deleting oneself → self-delete; the last admin (the others are deleting or none) → last-admin', async () => {
    await expect(call(setup({ staffRole: 'admin' }).service, { by: 'admin', actorId: USER })).rejects.toMatchObject({ problemType: 'self-delete' });
    const last = setup({ staffRole: 'admin' }, { admins: 0 });
    await expect(call(last.service, { by: 'admin', actorId: randomUUID() })).rejects.toMatchObject({ status: 409, problemType: 'last-admin' });
    expect(last.tx.user.count).toHaveBeenCalledWith({ where: { staffRole: 'admin', status: { not: 'deleting' }, id: { not: USER } } });
    expect(last.events).not.toContain('tx-a-write');
  });

  it('a staff target takes identity.staff_role before identity.user (the real race, B8E40, is in the smoke)', async () => {
    const s = setup({ staffRole: 'editor' });
    await call(s.service, { by: 'admin', actorId: randomUUID() });
    const locks = s.events.filter((e) => e.startsWith('lock:'));
    expect(locks.slice(0, 2)).toEqual(['lock:identity.staff_role', `lock:identity.user:${USER}`]);
  });

  it('a learner target never takes the staff lock', async () => {
    const s = setup();
    await call(s.service, { by: 'admin', actorId: randomUUID() });
    expect(s.events).not.toContain('lock:identity.staff_role');
  });

  it('P4: cleanup skips a user who verified or re-registered after the job selected them, deletes a still-due one', async () => {
    const cutoff = new Date(clock.now().getTime() - 7 * DAY);
    const verified = setup({ emailVerifiedAt: clock.now(), createdAt: new Date(cutoff.getTime() - DAY) });
    expect(await call(verified.service, { by: 'cleanup', cleanupCutoff: cutoff })).toBe('skipped');
    const reregistered = setup({ emailVerifiedAt: null, termsAcceptedAt: clock.now() });
    expect(await call(reregistered.service, { by: 'cleanup', cleanupCutoff: cutoff })).toBe('skipped');
    const staff = setup({ emailVerifiedAt: null, staffRole: 'editor', createdAt: new Date(cutoff.getTime() - DAY) });
    expect(await call(staff.service, { by: 'cleanup', cleanupCutoff: cutoff })).toBe('skipped');
    for (const s of [verified, reregistered, staff]) expect(s.events).not.toContain('tx-a-write');
    const due = setup({ emailVerifiedAt: null, status: 'locked', createdAt: new Date(cutoff.getTime() - DAY) });
    expect(await call(due.service, { by: 'cleanup', cleanupCutoff: cutoff })).toBe('done');
    expect(due.deleted).toEqual([{ userId: USER, by: 'cleanup', deletedAt: clock.now() }]);
  });

  it('an eraser throwing → pending, the account stays deleting, no deleted_accounts row, no mail, an error log with the id only', async () => {
    const s = setup({}, { eraserFails: 'content' });
    expect(await call(s.service, { res: s.res })).toBe('pending');
    expect(s.row()?.status).toBe('deleting');
    expect(s.deleted).toEqual([]);
    expect(s.events).not.toContain('user-delete');
    expect(s.afterResponse).not.toHaveBeenCalled();
    const log = s.logs.find((l) => l.event === 'account_deletion_failed');
    expect(log).toMatchObject({ level: 'error', user_id: USER });
    expect(JSON.stringify(log)).not.toContain('lan@example.com');
  });

  it('Review Focus 4: a second run after success finds no user and returns done without a second insert or mail', async () => {
    const s = setup();
    expect(await call(s.service, { res: s.res })).toBe('done');
    s.events.length = 0;
    expect(await call(s.service, { res: s.res })).toBe('done');
    expect(s.deleted).toHaveLength(1);
    expect(s.afterResponse).toHaveBeenCalledTimes(1);
  });

  it('B8E54: a second self request that finds deleting returns pending and does not run Tx B', async () => {
    const s = setup({ status: 'deleting', deletingBy: 'self' });
    expect(await call(s.service)).toBe('pending');
    expect(s.events.some((e) => e.startsWith('erase:'))).toBe(false);
  });

  it('B8E43: an admin request on a deleting account skips Tx A writes and runs Tx B', async () => {
    const s = setup({ status: 'deleting', deletingBy: 'admin' });
    expect(await call(s.service, { by: 'admin', actorId: randomUUID() })).toBe('done');
    expect(s.events).not.toContain('tx-a-write');
    expect(s.deleted).toEqual([{ userId: USER, by: 'admin', deletedAt: clock.now() }]);
  });

  it('P1: resume of a self deletion runs Tx B only, writes by = self and sends exactly one mail', async () => {
    const s = setup({ status: 'deleting', deletingBy: 'self' });
    expect(await call(s.service, { mode: 'resume' })).toBe('done');
    expect(s.events.filter((e) => e.startsWith('tx:'))).toEqual(['tx:{"timeout":120000,"maxWait":5000}']);
    expect(s.deleted).toEqual([{ userId: USER, by: 'self', deletedAt: clock.now() }]);
    expect(s.runNow).toHaveBeenCalledTimes(1);
    expect(s.afterResponse).not.toHaveBeenCalled();
  });

  it('P1: resume of a cleanup deletion deletes it with by = cleanup and no mail', async () => {
    const s = setup({ status: 'deleting', deletingBy: 'cleanup' });
    expect(await call(s.service, { by: 'cleanup', mode: 'resume' })).toBe('done');
    expect(s.deleted).toEqual([{ userId: USER, by: 'cleanup', deletedAt: clock.now() }]);
    expect(s.runNow).not.toHaveBeenCalled();
    expect(s.afterResponse).not.toHaveBeenCalled();
  });

  it('resume never deletes an account that is not deleting', async () => {
    const s = setup({ status: 'active' });
    expect(await call(s.service, { mode: 'resume' })).toBe('skipped');
    expect(s.events.some((e) => e.startsWith('erase:'))).toBe(false);
  });

  it('P6: the mail carries the years from the settings reader and goes after the response closes', async () => {
    const s = setup();
    await call(s.service, { res: s.res });
    expect(s.afterResponse).toHaveBeenCalledTimes(1);
    expect(s.afterResponse.mock.calls[0][0]).toBe(s.res);
    const mail = await s.mailOf(s.afterResponse.mock.calls[0]);
    expect(mail).toMatchObject({ to: 'lan@example.com' });
    expect(mail!.text).toContain('7 năm');
    expect(s.retentionYears).toHaveBeenCalledTimes(1);
  });

  it('final review M4: an address nobody confirmed gets no "deleted" mail (an admin deleting a not-yet-verified account)', async () => {
    const s = setup({ emailVerifiedAt: null });
    expect(await call(s.service, { by: 'admin', actorId: 'admin-1', res: s.res })).toBe('done');
    expect(s.deleted).toHaveLength(1);
    expect(s.afterResponse).not.toHaveBeenCalled();
    expect(s.runNow).not.toHaveBeenCalled();
  });

  it('B8E35: a failing settings read (the mail) still returns done', async () => {
    const s = setup();
    s.retentionYears.mockRejectedValue(new Error('settings down'));
    expect(await call(s.service, { res: s.res })).toBe('done');
    expect(s.deleted).toHaveLength(1);
    expect(s.logs.map((l) => l.event)).toContain('account_deleted_mail_failed');
  });

  it('P2/B8E53: replay checks nothing in Tx A, passes checks "skip" to every eraser and sends no mail', async () => {
    const s = setup({ staffRole: 'admin' }, { admins: 0, renewing: true });
    expect(await call(s.service, { by: 'admin', mode: 'replay' })).toBe('done');
    expect(s.precondition.renewing).not.toHaveBeenCalled();
    expect(s.events.filter((e) => e.startsWith('erase:')).every((e) => e.endsWith(':skip'))).toBe(true);
    expect(s.afterResponse).not.toHaveBeenCalled();
    expect(s.runNow).not.toHaveBeenCalled();
  });

  it('normal mode passes checks "normal" to the erasers', async () => {
    const s = setup();
    await call(s.service);
    expect(s.events.filter((e) => e.startsWith('erase:')).every((e) => e.endsWith(':normal'))).toBe(true);
  });

  it('a user that does not exist is already done (nothing to delete, no mail)', async () => {
    const s = setup();
    s.prisma.user.findUnique.mockResolvedValue(null);
    expect(await call(s.service)).toBe('done');
    expect(s.afterResponse).not.toHaveBeenCalled();
  });

  beforeEach(() => { vi.clearAllMocks(); });
});
