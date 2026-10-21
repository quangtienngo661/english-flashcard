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
  pendingNotice: null, startedAt: now, lastActivityAt: now, endedAt: null, clozeSource: null, aiPlanned: 0, aiSenseIds: [],
  pendingAiRequestId: null, aiStopped: null, aiNoticeShown: false, ...overrides,
});

type Decision = { allowed: true } | ({ allowed: false } & Refusal);

function setup(options: { early?: Decision; late?: Decision; items?: PracticeItem[]; session?: Partial<PracticeSession> } = {}) {
  const calls: string[] = [];
  // Facade reads made while the transaction is open without the transaction's own client (each would borrow a second connection).
  const globalReads: string[] = [];
  const state = { inTx: false };
  const via = (name: string, db: unknown) => { if (state.inTx && db !== tx) globalReads.push(name); };
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
      findUniqueOrThrow: vi.fn(async () => sessionRow(options.session)),
      update: vi.fn(async () => sessionRow(options.session)),
    },
    practiceSessionItem: { findMany: vi.fn(async () => []) },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => {
      calls.push('transaction');
      state.inTx = true;
      try { return await fn(tx); } finally { state.inTx = false; }
    }),
    practiceSession: { updateMany: vi.fn(async () => ({ count: 0 })), findFirst: vi.fn(async () => sessionRow(options.session)) },
  } as unknown as PrismaClient;
  const entitlements = {
    check: vi.fn(async (_userId: string, _feature: string, db?: unknown) => { calls.push('check'); via('check', db); return { allowed: true }; }),
    checkQuota: vi.fn(async (_userId: string, _pool: string, maybeTx?: unknown) => {
      calls.push(maybeTx === undefined ? 'checkQuota' : 'checkQuota(tx)');
      return quotaResults.shift() ?? { allowed: true };
    }),
    recordPracticeSession: vi.fn(async () => undefined),
  };
  const learning = {
    practiceItems: vi.fn(async (_userId: string, _scope: unknown, db?: unknown) => {
      calls.push('practiceItems');
      via('practiceItems', db);
      return options.items ?? [item('s1'), item('s2')];
    }),
    practiceCheck: vi.fn(async (_userId: string, _senseId: string, _groupId: string | null, db?: unknown) => {
      via('practiceCheck', db);
      return { groupExists: true, item: null };
    }),
  };
  const builder = {
    availability: vi.fn(async ({ senseIds, db }: { senseIds: string[]; db?: unknown }) => {
      calls.push('availability');
      via('availability', db);
      return new Map(senseIds.map((id) => [id, ['mcq_definition']]));
    }),
    build: vi.fn(async ({ db }: { db?: unknown }) => { via('build', db); return { skip: true }; }),
  };
  const settings = { get: vi.fn(async (db?: unknown) => { via('settings.get', db); return SETTINGS_DEFAULTS; }) };
  const service = new SessionsService(prisma, new FakeClock(now), settings as unknown as SettingsService,
    entitlements as unknown as EntitlementsService, learning as unknown as LearningService, builder as unknown as QuestionBuilder,
    { statsFor: vi.fn(async () => { calls.push('statsFor'); return new Map(); }) } as unknown as PracticeStats);
  return { service, tx, calls, entitlements, builder, learning, settings, globalReads };
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

describe('SessionsService.start — reads before the transaction (PX4)', () => {
  it('PX4: start reads the source items and the availability before opening the transaction', async () => {
    const { service, calls, builder, learning } = setup();
    await service.start(learner, { ...input, sort: 'least_practiced' });
    const opened = calls.indexOf('transaction');
    expect(opened).toBeGreaterThan(-1);
    // Everything that reads through the global client has run by the time the one transaction connection is taken.
    for (const read of ['check', 'practiceItems', 'statsFor', 'availability']) {
      expect(calls.indexOf(read), read).toBeGreaterThan(-1);
      expect(calls.indexOf(read), read).toBeLessThan(opened);
    }
    expect(calls.indexOf('practiceItems')).toBeLessThan(calls.indexOf('availability'));
    // Inside it: the lock, the close, the counted quota check and the create only.
    expect(calls.slice(opened + 1)).toEqual(['practice-lock', 'updateMany', 'checkQuota(tx)', 'create']);
    expect(learning.practiceItems).toHaveBeenCalledTimes(1);
    expect(builder.availability).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['an empty group', { ...input, source: 'group' as const, group_id: 'g1' }, [], 'group-empty'],
    ['an empty source', input, [], 'source-empty'],
  ])('PX4: %s is refused before a transaction is opened', async (_name, startInput, items, reason) => {
    const { service, calls, tx } = setup({ items });
    await expect(service.start(learner, startInput as never)).rejects.toMatchObject({
      status: 409, problemType: 'practice-no-words', extensions: { reason },
    });
    expect(calls).not.toContain('transaction');
    expect(tx.practiceSession.updateMany).not.toHaveBeenCalled();
  });

  it('PX4: no word fits the chosen types → refused before a transaction, the open session left alone', async () => {
    const { service, calls, tx, builder } = setup();
    builder.availability.mockImplementation(async ({ senseIds }: { senseIds: string[] }) => {
      calls.push('availability');
      return new Map(senseIds.map((id) => [id, []]));
    });
    await expect(service.start(learner, input)).rejects.toMatchObject({
      status: 409, problemType: 'practice-no-words', extensions: { reason: 'no-word-fits-types' },
    });
    expect(calls).not.toContain('transaction');
    expect(tx.practiceSession.updateMany).not.toHaveBeenCalled();
  });

  it('PX4: a refusal by the practice.basic entitlement is thrown before a transaction is opened', async () => {
    const { service, calls, entitlements } = setup();
    entitlements.check.mockImplementationOnce(async () => {
      calls.push('check');
      return { allowed: false, reason: 'plan-required' } as never;
    });
    await expect(service.start(learner, input)).rejects.toMatchObject({ status: 403, problemType: 'entitlement-required' });
    expect(calls).not.toContain('transaction');
  });
});

describe('SessionsService.next — no session quota (Bước 5)', () => {
  it('B5E26: next never calls checkQuota; it keeps the practice.basic check', async () => {
    const { service, entitlements, tx } = setup();
    await expect(service.next(learner, 'sess-1')).resolves.toMatchObject({ state: 'waiting_continue' });
    expect(entitlements.check).toHaveBeenCalledWith(learner.userId, 'practice.basic', tx);
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

describe('SessionsService.current / next — every read goes through the transaction (PX4)', () => {
  const group = { source: 'group' as const, groupId: 'g1', senseIds: ['s1'] };

  it('PX4: next reads the group, the usable words, the entitlement, the settings and the question through tx', async () => {
    const { service, tx, learning, entitlements, settings, builder, globalReads } = setup({ session: group });
    await expect(service.next(learner, 'sess-1')).resolves.toMatchObject({ state: 'waiting_continue' });
    expect(learning.practiceCheck).toHaveBeenCalledWith(learner.userId, 's1', 'g1', tx);
    expect(learning.practiceItems).toHaveBeenCalledWith(learner.userId, { kind: 'group', groupId: 'g1', filter: 'all' }, tx);
    expect(entitlements.check).toHaveBeenCalledWith(learner.userId, 'practice.basic', tx);
    expect(settings.get).toHaveBeenCalledWith(tx);
    expect(builder.build).toHaveBeenCalledWith(expect.objectContaining({ db: tx }));
    expect(globalReads).toEqual([]);
  });

  it('PX4: next on a session of the whole list reads the usable words through tx', async () => {
    const { service, tx, learning, globalReads } = setup();
    await service.next(learner, 'sess-1');
    expect(learning.practiceItems).toHaveBeenCalledWith(learner.userId, { kind: 'senses', senseIds: ['s1'] }, tx);
    expect(globalReads).toEqual([]);
  });

  it('PX4: current reads the group and the usable words through tx', async () => {
    const { service, tx, learning, globalReads } = setup({ session: group });
    await expect(service.current(learner)).resolves.toMatchObject({ item: null });
    expect(learning.practiceCheck).toHaveBeenCalledWith(learner.userId, 's1', 'g1', tx);
    expect(learning.practiceItems).toHaveBeenCalledWith(learner.userId, { kind: 'group', groupId: 'g1', filter: 'all' }, tx);
    expect(globalReads).toEqual([]);
  });
});
