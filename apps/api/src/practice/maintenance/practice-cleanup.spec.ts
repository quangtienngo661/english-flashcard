import { describe, expect, it, vi } from 'vitest';
import type { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { SettingsService } from '../../settings/index.js';
import type { ReportsService } from '../reports/reports.service.js';
import { monthsBefore, PracticeCleanupService } from './practice-cleanup.service.js';
import { PracticePrivateSensesCleanup } from './private-senses-cleanup.provider.js';

describe('monthsBefore', () => {
  it('subtracts calendar months in UTC, keeping the time of day', () => {
    expect(monthsBefore(new Date('2026-11-08T03:00:00Z'), 6)).toEqual(new Date('2026-05-08T03:00:00Z'));
    expect(monthsBefore(new Date('2026-02-10T23:30:00Z'), 3)).toEqual(new Date('2025-11-10T23:30:00Z'));
  });

  it('a day the target month lacks becomes its last day', () => {
    expect(monthsBefore(new Date('2026-08-31T12:00:00Z'), 6)).toEqual(new Date('2026-02-28T12:00:00Z'));
    expect(monthsBefore(new Date('2028-09-30T00:00:00Z'), 7)).toEqual(new Date('2028-02-29T00:00:00Z'));
  });
});

describe('PracticeCleanupService.runOnce (Bước 7 design §12.1)', () => {
  const NOW = new Date('2026-11-08T03:00:00Z');
  const CUTOFF = new Date('2026-05-08T03:00:00Z');
  const make = (pendingRefunds: Array<{ id: string; userId: string; aiOperationId: string | null }> = []) => {
    const count = (n: number) => vi.fn(async () => ({ count: n }));
    const prisma = {
      practiceSessionItem: { deleteMany: count(1) },
      practiceQuestion: { deleteMany: count(2) },
      practiceSession: { deleteMany: count(3), updateMany: count(4) },
      practiceReport: { deleteMany: count(5), findMany: vi.fn(async () => pendingRefunds) },
      practiceAiRequest: { deleteMany: count(6) },
    };
    const settings = { get: async () => ({ practice: { historyMonths: 6, idleSessionCloseHours: 24 } }) } as unknown as SettingsService;
    const reports = { refund: vi.fn(async () => undefined) };
    const service = new PracticeCleanupService(prisma as unknown as PrismaClient, {} as MaintenanceScheduler, settings,
      reports as unknown as ReportsService);
    return { service, prisma, reports };
  };

  it('B7E60: unasked questions go, except an AI question made after the history cutoff (an unseen one from yesterday stays)', async () => {
    const { service, prisma } = make();
    await service.runOnce(NOW);
    expect(prisma.practiceQuestion.deleteMany).toHaveBeenCalledWith({
      where: { items: { none: {} }, NOT: { source: 'ai', createdAt: { gte: CUTOFF } } },
    });
  });

  it('AI requests older than 7 days are deleted', async () => {
    const { service, prisma } = make();
    await service.runOnce(NOW);
    expect(prisma.practiceAiRequest.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: new Date('2026-11-01T03:00:00Z') } } });
  });

  it('B7E77: each confirmed report with refunded = null is refunded again, once per report; the counts include both', async () => {
    const pending = [{ id: 'r-1', userId: 'u-1', aiOperationId: 'req-1' }, { id: 'r-2', userId: 'u-2', aiOperationId: 'req-2' }];
    const { service, prisma, reports } = make(pending);
    expect(await service.runOnce(NOW)).toEqual({
      items: 1, questions: 2, sessions: 3, reports: 5, abandoned: 4, ai_requests: 6, refunds_retried: 2,
    });
    expect(prisma.practiceReport.findMany).toHaveBeenCalledWith({
      where: { status: 'confirmed', refunded: null }, select: { id: true, userId: true, aiOperationId: true }, orderBy: { resolvedAt: 'asc' },
    });
    expect(reports.refund).toHaveBeenCalledTimes(2);
    expect(reports.refund).toHaveBeenCalledWith(pending[0]);
    expect(reports.refund).toHaveBeenCalledWith(pending[1]);
  });
});

describe('PracticePrivateSensesCleanup.deleteForSenses (design §12.1, B7E115)', () => {
  const USER = 'u-1';
  const make = (requestIds: string[]) => {
    const calls: string[] = [];
    const record = (name: string, result: unknown = { count: 0 }) => vi.fn(async (...args: unknown[]) => {
      calls.push(name);
      return typeof result === 'function' ? (result as (...a: unknown[]) => unknown)(...args) : result;
    });
    const tx = {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        const sql = strings.join('?');
        if (sql.includes('FROM practice_sessions')) { calls.push('lock sessions'); return []; }
        if (sql.includes('FROM practice_ai_requests')) { calls.push('lock ai requests'); return requestIds.map((id) => ({ id })); }
        if (sql.includes('FROM practice_session_items')) { calls.push('lock items'); return []; }
        throw new Error(`unexpected query ${sql}`);
      }),
      practiceAiRequest: { deleteMany: record('delete ai requests') },
      practiceWordCheck: { deleteMany: record('delete word checks') },
      practiceSession: { updateMany: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        calls.push('pendingAiRequestId' in data ? 'clear pending' : 'notice');
        return { count: 0 };
      }) },
      practiceReport: { deleteMany: record('delete reports') },
      practiceSessionItem: { deleteMany: record('delete items') },
      practiceQuestion: { deleteMany: record('delete questions') },
    };
    return { tx, calls };
  };

  it('locks sessions, then the AI requests, then items; requests and word checks go before reports, items and questions', async () => {
    const { tx, calls } = make(['req-1']);
    await new PracticePrivateSensesCleanup().deleteForSenses(tx as never, USER, ['s-1']);
    expect(calls).toEqual([
      'lock sessions', 'lock ai requests', 'lock items', 'delete ai requests', 'delete word checks', 'clear pending', 'notice',
      'delete reports', 'delete items', 'delete questions',
    ]);
    expect(tx.practiceAiRequest.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['req-1'] } } });
    expect(tx.practiceWordCheck.deleteMany).toHaveBeenCalledWith({ where: { userId: USER, senseId: { in: ['s-1'] } } });
    expect(tx.practiceSession.updateMany).toHaveBeenCalledWith({
      where: { userId: USER, pendingAiRequestId: { in: ['req-1'] } }, data: { pendingAiRequestId: null },
    });
    expect(tx.practiceQuestion.deleteMany).toHaveBeenCalledWith({ where: { userId: USER, senseId: { in: ['s-1'] } } });
  });

  it('with no AI request for those senses nothing points at them, so no pending pointer is cleared', async () => {
    const { tx, calls } = make([]);
    await new PracticePrivateSensesCleanup().deleteForSenses(tx as never, USER, ['s-1']);
    expect(calls).not.toContain('delete ai requests');
    expect(calls).not.toContain('clear pending');
    expect(calls).toContain('delete word checks');
  });

  it('no senses → nothing at all', async () => {
    const { tx, calls } = make(['req-1']);
    await new PracticePrivateSensesCleanup().deleteForSenses(tx as never, USER, []);
    expect(calls).toEqual([]);
  });
});
