import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { AccountDeletionRegistry, ERASE_ORDER } from './account-eraser.js';
import type { AccountDeletionService } from './account-deletion.service.js';
import { DeletionJobs } from './deletion-jobs.service.js';

const NOW = new Date('2026-10-29T12:00:00Z');
const MIN = 60_000;
const HOUR = 3_600_000;
const clock = new FakeClock(NOW);
void clock;

function setup(opts: { cleanupDays?: number } = {}) {
  const logs: LogEntry[] = [];
  const registered = new Map<string, (now: Date) => Promise<unknown>>();
  const scheduler = { register: (name: string, job: (now: Date) => Promise<unknown>) => registered.set(name, job) };
  const erased: string[] = [];
  const registry = new AccountDeletionRegistry();
  for (const module of ERASE_ORDER) {
    registry.registerEraser({ module, erase: vi.fn(async (_tx, userId: string, anonId: string) => { erased.push(`${module}:${userId}:${anonId}`); }) });
  }
  registry.registerSettingsReader({ unverifiedCleanupDays: async () => opts.cleanupDays ?? 7, transactionRetentionYears: async () => 10 });
  const tx = { $executeRaw: vi.fn(async () => 1), idempotencyKey: { deleteMany: vi.fn(async () => ({ count: 0 })) } };
  const prisma = {
    user: { findMany: vi.fn(async (_a: unknown): Promise<Array<{ id: string; deletingBy: string | null; deletingSince: Date | null }>> => []) },
    deletedAccount: { findMany: vi.fn(async (_a: unknown): Promise<Array<{ userId: string }>> => []) },
    $queryRaw: vi.fn(async (_a: unknown): Promise<Array<{ id: string }>> => []),
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  const deletion = { delete: vi.fn(async (_i: unknown) => 'done' as 'done' | 'pending' | 'skipped') };
  const jobs = new DeletionJobs(
    prisma as unknown as PrismaClient, scheduler as unknown as MaintenanceScheduler, deletion as unknown as AccountDeletionService,
    registry, new AppLogger({ write: (e) => logs.push(e) }),
  );
  jobs.onModuleInit();
  return { jobs, registered, prisma, deletion, erased, logs, tx };
}

describe('DeletionJobs', () => {
  it('registers the three jobs with the scheduler under their names', () => {
    expect([...setup().registered.keys()]).toEqual(['identity.deletion-retry', 'identity.deletion-sweep', 'identity.unverified-cleanup']);
  });

  describe('retry (B8E50, P1)', () => {
    it('selects only accounts deleting for more than 10 minutes (a 5-minute-old one is left alone) and resumes them with their stored deleting_by', async () => {
      const s = setup();
      s.prisma.user.findMany.mockResolvedValue([
        { id: 'u1', deletingBy: 'self', deletingSince: new Date(NOW.getTime() - 11 * MIN) },
        { id: 'u2', deletingBy: 'cleanup', deletingSince: new Date(NOW.getTime() - 3 * HOUR) },
      ]);
      expect(await s.jobs.retryStuck(NOW)).toBe(2);
      expect(s.prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: 'deleting', deletingSince: { lt: new Date(NOW.getTime() - 10 * MIN) } },
      }));
      expect(s.deletion.delete).toHaveBeenNthCalledWith(1, { userId: 'u1', by: 'self', mode: 'resume' });
      expect(s.deletion.delete).toHaveBeenNthCalledWith(2, { userId: 'u2', by: 'cleanup', mode: 'resume' });
    });

    it('logs account_deletion_stuck (warn, user id only) once an account has been deleting for more than 24 hours', async () => {
      const s = setup();
      s.prisma.user.findMany.mockResolvedValue([
        { id: 'old', deletingBy: 'admin', deletingSince: new Date(NOW.getTime() - 25 * HOUR) },
        { id: 'young', deletingBy: 'admin', deletingSince: new Date(NOW.getTime() - 2 * HOUR) },
      ]);
      await s.jobs.retryStuck(NOW);
      const stuck = s.logs.filter((l) => l.event === 'account_deletion_stuck');
      expect(stuck).toEqual([expect.objectContaining({ level: 'warn', user_id: 'old' })]);
    });

    it('one failing account does not stop the others', async () => {
      const s = setup();
      s.prisma.user.findMany.mockResolvedValue([
        { id: 'u1', deletingBy: 'self', deletingSince: new Date(NOW.getTime() - HOUR) },
        { id: 'u2', deletingBy: 'self', deletingSince: new Date(NOW.getTime() - HOUR) },
      ]);
      s.deletion.delete.mockResolvedValueOnce('pending');
      await s.jobs.retryStuck(NOW);
      expect(s.deletion.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('sweep (M1, R1)', () => {
    it('asks for deletions of the last 24 hours only and runs every eraser in a transaction per user with a fresh anonymous id', async () => {
      const s = setup();
      s.prisma.deletedAccount.findMany.mockResolvedValue([{ userId: 'gone-2h' }, { userId: 'gone-5h' }]);
      expect(await s.jobs.sweepLateRows(NOW)).toBe(2);
      expect(s.prisma.deletedAccount.findMany).toHaveBeenCalledWith({
        where: { deletedAt: { gt: new Date(NOW.getTime() - 24 * HOUR) } }, select: { userId: true },
      });
      expect(s.prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(s.erased).toHaveLength(2 * ERASE_ORDER.length);
      const anon = (userId: string) => new Set(s.erased.filter((e) => e.includes(`:${userId}:`)).map((e) => e.split(':')[2]));
      expect(anon('gone-2h').size).toBe(1);
      expect([...anon('gone-2h')][0]).not.toBe([...anon('gone-5h')][0]);
      expect(s.tx.idempotencyKey.deleteMany).toHaveBeenCalledTimes(2);
    });

    it('nothing deleted in the last 24 hours → no transaction (a deletion 25 hours old is not swept)', async () => {
      const s = setup();
      await s.jobs.sweepLateRows(NOW);
      expect(s.prisma.$transaction).not.toHaveBeenCalled();
    });

    it('a failing user is logged with the id and the others still run', async () => {
      const s = setup();
      s.prisma.deletedAccount.findMany.mockResolvedValue([{ userId: 'a' }, { userId: 'b' }]);
      s.prisma.$transaction.mockRejectedValueOnce(new Error('deadlock'));
      await s.jobs.sweepLateRows(NOW);
      expect(s.logs.find((l) => l.event === 'account_sweep_failed')).toMatchObject({ user_id: 'a' });
      expect(s.erased.some((e) => e.includes(':b:'))).toBe(true);
    });
  });

  describe('unverified clean-up (D19, P4)', () => {
    it('selects with the setting\'s cutoff (a locked unverified account included, staff and verified excluded) and hands the cutoff to Tx A', async () => {
      const s = setup({ cleanupDays: 3 });
      s.prisma.$queryRaw.mockResolvedValue([{ id: 'x' }, { id: 'y' }]);
      expect(await s.jobs.cleanUnverified(NOW)).toBe(2);
      const query = s.prisma.$queryRaw.mock.calls[0][0] as { sql: string; values: unknown[] };
      expect(query.sql).toContain("status IN ('active', 'locked')");
      expect(query.sql).toContain('staff_role IS NULL');
      expect(query.sql).toContain('email_verified_at IS NULL');
      expect(query.sql).toContain('COALESCE(terms_accepted_at, created_at)');
      const cutoff = new Date(NOW.getTime() - 3 * 86_400_000);
      expect(query.values).toContain(200);
      expect(query.values).toContainEqual(cutoff);
      expect(s.deletion.delete).toHaveBeenCalledWith({ userId: 'x', by: 'cleanup', mode: 'normal', cleanupCutoff: cutoff });
    });

    it('counts only what was deleted: a skipped (re-verified) account is not', async () => {
      const s = setup();
      s.prisma.$queryRaw.mockResolvedValue([{ id: 'x' }, { id: 'y' }]);
      s.deletion.delete.mockResolvedValueOnce('skipped');
      expect(await s.jobs.cleanUnverified(NOW)).toBe(1);
    });
  });
});
