import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { Learner } from '../../content/index.js';
import type { EntitlementsService, Refusal } from '../../entitlements/index.js';
import type { PracticeSession, PrismaClient } from '../../generated/prisma/client.js';
import type { LearningService, PracticeItem } from '../../learning/index.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import type { QuestionBuilder } from '../questions/question-builder.service.js';
import type { ItemWithQuestion } from './session-views.js';
import type { PracticeStats } from '../weak/practice-stats.js';
import { SessionsService } from './sessions.service.js';

const learner: Learner = { userId: '00000000-0000-4000-8000-000000000001', nativeLanguage: 'vi' };
const now = new Date('2026-10-19T03:00:00Z');
const RESETS_AT = '2026-10-19T17:00:00.000Z';

const item = (senseId: string): PracticeItem => ({
  item_id: `i-${senseId}`, sense_id: senseId, level: 1, due_date: '2026-10-19', priority: false, section: 'learning',
  due_now: true, added_at: '2026-10-01T00:00:00.000Z', last_needs_review_at: null,
} as unknown as PracticeItem);

const sessionRow = (overrides: Partial<PracticeSession> = {}): PracticeSession => ({
  id: 'sess-1', userId: learner.userId, source: 'all', groupId: null, groupFilter: null, sort: 'level_asc',
  types: ['mcq_definition'], promptStyle: 'meaning', targetCount: 5, senseIds: ['s1'], status: 'active', continued: null,
  pendingNotice: null, startedAt: now, lastActivityAt: now, endedAt: null, ...overrides,
});

type Decision = { allowed: true } | ({ allowed: false } & Refusal);

function setup(options: { early?: Decision; late?: Decision; items?: PracticeItem[] } = {}) {
  const calls: string[] = [];
  const quotaResults = [options.early ?? { allowed: true }, options.late ?? { allowed: true }];
  const tx = {
    $executeRaw: vi.fn(async () => { calls.push('practice-lock'); return 0; }),
    $queryRaw: vi.fn(async () => [{ id: 'sess-1' }]),
    practiceSession: {
      updateMany: vi.fn(async () => { calls.push('updateMany'); return { count: 1 }; }),
      create: vi.fn(async ({ data }: { data: Partial<PracticeSession> }) => {
        calls.push('create');
        return sessionRow(data);
      }),
      findUniqueOrThrow: vi.fn(async () => sessionRow()),
      update: vi.fn(async () => sessionRow()),
    },
    practiceSessionItem: { findMany: vi.fn(async () => []) },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => { calls.push('transaction'); return fn(tx); }),
    practiceSession: { updateMany: vi.fn(async () => ({ count: 0 })) },
  } as unknown as PrismaClient;
  const entitlements = {
    check: vi.fn(async () => { calls.push('check'); return { allowed: true }; }),
    checkQuota: vi.fn(async (_userId: string, _pool: string, maybeTx?: unknown) => {
      calls.push(maybeTx === undefined ? 'checkQuota' : 'checkQuota(tx)');
      return quotaResults.shift() ?? { allowed: true };
    }),
    recordPracticeSession: vi.fn(async () => undefined),
  };
  const learning = {
    practiceItems: vi.fn(async () => { calls.push('practiceItems'); return options.items ?? [item('s1'), item('s2')]; }),
    practiceCheck: vi.fn(async () => ({ groupExists: true, item: null })),
  } as unknown as LearningService;
  const builder = {
    availability: vi.fn(async ({ senseIds }: { senseIds: string[] }) => {
      calls.push('availability');
      return new Map(senseIds.map((id) => [id, ['mcq_definition']]));
    }),
    build: vi.fn(async () => ({ skip: true })),
  };
  const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
  const service = new SessionsService(prisma, new FakeClock(now), settings, entitlements as unknown as EntitlementsService,
    learning, builder as unknown as QuestionBuilder, { statsFor: vi.fn(async () => new Map()) } as unknown as PracticeStats);
  return { service, tx, calls, entitlements, builder };
}

const input = { source: 'all' as const, types: ['mcq_definition' as const] };
const exhausted: Decision = { allowed: false, reason: 'quota-exhausted', resets_at: RESETS_AT };

describe('SessionsService.start — session quota (Bước 5)', () => {
  it('B5E73/R4: start calls checkQuota after updateMany and before create, passing the transaction', async () => {
    const { service, tx, calls, entitlements } = setup();
    await service.start(learner, input);
    expect(calls.indexOf('checkQuota(tx)')).toBeGreaterThan(calls.indexOf('updateMany'));
    expect(calls.indexOf('checkQuota(tx)')).toBeLessThan(calls.indexOf('create'));
    expect(entitlements.checkQuota).toHaveBeenLastCalledWith(learner.userId, 'practice_sessions', tx);
  });

  it('B5#2: a refusal after updateMany → 403 quota-exhausted with resets_at, create never called', async () => {
    const { service, tx } = setup({ late: exhausted });
    await expect(service.start(learner, input)).rejects.toMatchObject({
      status: 403, problemType: 'quota-exhausted', extensions: { resets_at: RESETS_AT },
    });
    expect(tx.practiceSession.create).not.toHaveBeenCalled();
  });

  it('an exhausted learner is refused by the early check before the availability walk, even for an empty group', async () => {
    for (const items of [[item('s1')], []]) {
      const { service, builder, calls, tx } = setup({ early: exhausted, items });
      await expect(service.start(learner, { ...input, source: items.length ? 'all' : 'group', group_id: 'g1' } as never))
        .rejects.toMatchObject({ status: 403, problemType: 'quota-exhausted' });
      expect(builder.availability).not.toHaveBeenCalled();
      expect(calls).not.toContain('practiceItems');
      expect(calls[0]).toBe('checkQuota');
      expect(tx.practiceSession.create).not.toHaveBeenCalled();
    }
  });

  it('B5E83: plan-required → 403 entitlement-required', async () => {
    const { service } = setup({ early: { allowed: false, reason: 'plan-required' } });
    await expect(service.start(learner, input)).rejects.toMatchObject({ status: 403, problemType: 'entitlement-required' });
  });

  it('B5E22: starting a session records nothing', async () => {
    const { service, entitlements } = setup();
    await service.start(learner, input);
    expect(entitlements.recordPracticeSession).not.toHaveBeenCalled();
  });
});

describe('SessionsService.next — no session quota (Bước 5)', () => {
  it('B5E26: next never calls checkQuota; it keeps the practice.basic check', async () => {
    const { service, entitlements } = setup();
    await expect(service.next(learner, 'sess-1')).resolves.toMatchObject({ state: 'waiting_continue' });
    expect(entitlements.check).toHaveBeenCalledWith(learner.userId, 'practice.basic');
    expect(entitlements.checkQuota).not.toHaveBeenCalled();
  });

  it('B5E25: voiding an item does not call recordPracticeSession', async () => {
    const { service, tx, entitlements } = setup();
    const voidItem = (service as unknown as { voidItem: (t: unknown, i: ItemWithQuestion) => Promise<void> }).voidItem
      .bind(service);
    Object.assign(tx.practiceSessionItem, { updateMany: vi.fn(async () => ({ count: 1 })) });
    await voidItem(tx, { id: 'it-1' } as ItemWithQuestion);
    expect(entitlements.recordPracticeSession).not.toHaveBeenCalled();
  });
});
