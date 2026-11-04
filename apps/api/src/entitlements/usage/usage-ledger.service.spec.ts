import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { SETTINGS_DEFAULTS, type AppSettings } from '../../settings/index.js';
import type { GrantSource, SubscriptionSource } from '../rules/plan-rules.js';
import { UsageLedgerService } from './usage-ledger.service.js';

const USER = '00000000-0000-4000-8000-000000000001';
const OP = 'op-1';
const NOW = new Date('2026-11-10T05:00:00Z');
const LATER = new Date(NOW.getTime() + 60_000);
const EARLIER = new Date(NOW.getTime() - 60_000);

const pro: SubscriptionSource = {
  id: 'sub-1', provider: 'fake', externalSubscriptionId: 'ext-1', status: 'active', trialDenied: false, cancelAtPeriodEnd: false,
  trialEndsAt: null, currentPeriodEnd: new Date('2026-12-01T00:00:00Z'), graceEndsAt: null,
  quotaAnchorAt: new Date('2026-11-01T00:00:00Z'), interval: 'month', pendingInterval: null,
};
const CYCLE = { start: new Date('2026-11-01T00:00:00Z'), end: new Date('2026-12-01T00:00:00Z') };

type Row = { id: string; status: 'reserved' | 'confirmed' | 'released'; release_reason: string | null; expires_at: Date | null };

type Setup = {
  entitlements?: Partial<AppSettings['entitlements']>;
  subscriptions?: SubscriptionSource[];
  grants?: GrantSource[];
  rows?: Row[];
  aiUsed?: number;
  capUsed?: { confirmed: number; reserved: number };
  confirmedInCycle?: number;
  creditsInCycle?: number;
  credit?: boolean;
  /** Whether this operation has a confirmed `use` row inside the cycle (B5-7). Defaults to true so the older refund cases keep their meaning. */
  confirmedUse?: boolean;
  /** Launch prep A: the learner's timezone (`null` = no profile; Vietnam by default), the sources that already ended, and the Free cap's count. */
  timezone?: string | null;
  ended?: { subscriptions: SubscriptionSource[]; grants: GrantSource[] };
  capUsedFree?: { confirmed: number; reserved: number };
};

/**
 * A fake world in which the shared client, Settings and any query not passed the transaction throw while an Entitlements
 * lock is held ("No second connection inside a locked transaction"). `events` records locks and writes in order.
 */
function setup(input: Setup = {}) {
  const events: string[] = [];
  let locked = false;
  const guard = (what: string) => {
    if (locked) throw new Error(`${what} used while a lock is held`);
  };
  const execs: string[] = [];
  const tx = {
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join('?');
      if (sql.includes('pg_advisory_xact_lock')) {
        events.push(`lock:${String(values[0])}`);
        locked = true;
      } else {
        execs.push(sql);
        events.push(sql.trim().split(/\s+/).slice(0, 3).join(' '));
      }
      return 1;
    }),
    $queryRaw: vi.fn(async () => input.rows ?? []),
    usageRecord: {
      update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        events.push(`update:${args.where.id}:${String(args.data.status)}:${String(args.data.releaseReason ?? '')}`);
        return {};
      }),
      findFirst: vi.fn(async () => (input.credit ? { id: 'credit-1' } : null)),
    },
  };
  const prisma = new Proxy({}, {
    get(_target, key) {
      if (key === '$transaction') {
        return async (fn: (client: typeof tx) => Promise<unknown>, options: unknown) => {
          events.push(`tx:${JSON.stringify(options)}`);
          try {
            return await fn(tx);
          } finally {
            locked = false;
          }
        };
      }
      guard(`prisma.${String(key)}`);
      return undefined;
    },
  });
  const onTx = (db: unknown, what: string) => {
    if (db !== tx) throw new Error(`${what} not given the transaction`);
  };
  const settings = {
    get: vi.fn(async () => {
      guard('SettingsService.get');
      return { ...SETTINGS_DEFAULTS, entitlements: { ...SETTINGS_DEFAULTS.entitlements, ...input.entitlements } };
    }),
  };
  const sources = {
    load: vi.fn(async (db: unknown, _userId?: string, _now?: Date, _endedSince?: Date) => {
      onTx(db, 'sources.load');
      return { subscriptions: input.subscriptions ?? [pro], grants: input.grants ?? [], ended: input.ended ?? { subscriptions: [], grants: [] } };
    }),
  };
  const identity = {
    getProfile: vi.fn(async (_userId: string, db?: unknown) => {
      onTx(db, 'identity.getProfile');
      return input.timezone === null ? null : { timezone: input.timezone ?? 'Asia/Ho_Chi_Minh' };
    }),
  };
  const usage = {
    aiUsed: vi.fn(async (db: unknown) => (onTx(db, 'aiUsed'), input.aiUsed ?? 0)),
    capUsed: vi.fn(async (db: unknown) => (onTx(db, 'capUsed'), input.capUsed ?? { confirmed: 0, reserved: 0 })),
    capUsedFree: vi.fn(async (db: unknown) => (onTx(db, 'capUsedFree'), input.capUsedFree ?? { confirmed: 0, reserved: 0 })),
    confirmedInCycle: vi.fn(async (db: unknown) => (onTx(db, 'confirmedInCycle'), input.confirmedInCycle ?? 0)),
    creditsInCycle: vi.fn(async (db: unknown) => (onTx(db, 'creditsInCycle'), input.creditsInCycle ?? 0)),
    hasConfirmedUseInCycle: vi.fn(async (db: unknown) => (onTx(db, 'hasConfirmedUseInCycle'), input.confirmedUse ?? true)),
  };
  const logger = { warn: vi.fn(), info: vi.fn() };
  const service = new UsageLedgerService(
    prisma as never, new FakeClock(NOW), settings as never, identity as never, sources as never, usage as never, logger as never,
  );
  return { service, events, execs, tx, usage, logger, sources, settings, identity };
}

const POOL_LOCK = `lock:entitlements.pool:${USER}:ai_practice`;
const DAILY_LOCK = 'lock:entitlements.ai_daily';

describe('UsageLedgerService.reserve', () => {
  it('reserve takes lockPool before lockAiDaily, then inserts a reserved row expiring in 2 minutes on the Vietnam day', async () => {
    const { service, events, execs } = setup();
    expect(await service.reserve(USER, 'ai_practice', OP))
      .toEqual({ state: 'reserved', expires_at: new Date(NOW.getTime() + 120_000).toISOString() });
    expect(events.filter((event) => event.startsWith('lock:'))).toEqual([POOL_LOCK, DAILY_LOCK]);
    expect(events.at(-1)).toBe('INSERT INTO usage_records');
    expect(execs.at(-1)).toMatch(/'use', 'reserved'/);
    expect(execs.at(-1)).toMatch(/ON CONFLICT DO NOTHING/);
    expect(events[0]).toBe('tx:{"timeout":10000,"maxWait":5000}');
  });

  it.each([
    ['the switch is off', { entitlements: { aiEnabled: false } }, { reason: 'ai-unavailable', retry_after_seconds: null }],
    ['the limit is 0', { subscriptions: [], entitlements: { freeAiPracticePerCycle: 0, freeAiLookupPerCycle: 0 } }, { reason: 'plan-required' }],
    ['no unit is left', { aiUsed: 300 }, { reason: 'quota-exhausted', resets_at: CYCLE.end.toISOString() }],
  ] as const)('a reserve refused for the user (%s) never takes lockAiDaily and writes nothing', async (_name, input, refusal) => {
    const { service, events } = setup(input as Setup);
    expect(await service.reserve(USER, 'ai_practice', OP)).toEqual({ state: 'refused', ...refusal });
    expect(events).not.toContain(DAILY_LOCK);
    expect(events.some((event) => event.startsWith('INSERT') || event.startsWith('update'))).toBe(false);
  });

  it('no cap (aiDailyCap null): a reserve goes through however many units the day has used', async () => {
    const { service, events } = setup({ entitlements: { aiDailyCap: null }, capUsed: { confirmed: 90_000, reserved: 5_000 } });
    expect(await service.reserve(USER, 'ai_practice', 'op-nocap')).toEqual({ state: 'reserved', expires_at: expect.any(String) });
    expect(events.some((event) => event.startsWith('INSERT'))).toBe(true);
  });

  it('B5E11/B5E12: the cap counts confirmed and reserved units of the day; reached → ai-unavailable with retry_after, nothing written', async () => {
    const { service, events, usage } = setup({ entitlements: { aiDailyCap: 1000 }, capUsed: { confirmed: 997, reserved: 3 } });
    expect(await service.reserve(USER, 'ai_practice', OP))
      .toEqual({ state: 'refused', reason: 'ai-unavailable', retry_after_seconds: 12 * 3600 });
    expect(usage.capUsed).toHaveBeenCalledWith(expect.anything(), '2026-11-10', NOW);
    expect(events.some((event) => event.startsWith('INSERT'))).toBe(false);
  });

  it('counts the user\'s units in the current cycle from the anchor', async () => {
    const { service, usage } = setup();
    await service.reserve(USER, 'ai_practice', OP);
    expect(usage.aiUsed).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice', CYCLE, NOW);
  });

  it('B5E2: a live reserved row is returned and nothing is written', async () => {
    const { service, events } = setup({ rows: [{ id: 'r1', status: 'reserved', release_reason: null, expires_at: LATER }] });
    expect(await service.reserve(USER, 'ai_practice', OP)).toEqual({ state: 'reserved', expires_at: LATER.toISOString() });
    expect(events).not.toContain(DAILY_LOCK);
    expect(events.some((event) => event.startsWith('INSERT') || event.startsWith('update'))).toBe(false);
  });

  it('a confirmed row → state confirmed (the caller does not call AI again)', async () => {
    const { service } = setup({ rows: [{ id: 'r1', status: 'confirmed', release_reason: null, expires_at: EARLIER }] });
    expect(await service.reserve(USER, 'ai_practice', OP)).toEqual({ state: 'confirmed' });
  });

  it('an expired reserved row is released (expired) first, then a new row is reserved', async () => {
    const { service, events } = setup({ rows: [{ id: 'r1', status: 'reserved', release_reason: null, expires_at: EARLIER }] });
    expect((await service.reserve(USER, 'ai_practice', OP)).state).toBe('reserved');
    const updateAt = events.indexOf('update:r1:released:expired');
    expect(updateAt).toBeGreaterThan(-1);
    expect(events.indexOf('INSERT INTO usage_records')).toBeGreaterThan(updateAt);
  });

  it('B5E3: the newest row was released → a new reservation', async () => {
    const { service } = setup({ rows: [{ id: 'r1', status: 'released', release_reason: 'caller', expires_at: EARLIER }] });
    expect((await service.reserve(USER, 'ai_practice', OP)).state).toBe('reserved');
  });
});

describe('UsageLedgerService.confirm', () => {
  it('reserved and not expired → confirmed', async () => {
    const { service, events } = setup({ rows: [{ id: 'r1', status: 'reserved', release_reason: null, expires_at: LATER }] });
    expect(await service.confirm(USER, 'ai_practice', OP)).toEqual({ state: 'confirmed' });
    expect(events).toContain('update:r1:confirmed:');
    expect(events[1]).toBe(POOL_LOCK);
  });

  it('B5E6: late with a unit left → confirmed', async () => {
    const { service, events } = setup({ aiUsed: 10, rows: [{ id: 'r1', status: 'released', release_reason: 'expired', expires_at: EARLIER }] });
    expect(await service.confirm(USER, 'ai_practice', OP)).toEqual({ state: 'confirmed' });
    expect(events).toContain('update:r1:confirmed:');
  });

  it('B5E7: late with no unit left → released as late-confirm-free', async () => {
    const { service, events } = setup({ aiUsed: 300, rows: [{ id: 'r1', status: 'reserved', release_reason: null, expires_at: EARLIER }] });
    expect(await service.confirm(USER, 'ai_practice', OP)).toEqual({ state: 'released' });
    expect(events).toContain('update:r1:released:late-confirm-free');
  });

  it('B5E8: already confirmed → confirmed, nothing written', async () => {
    const { service, events } = setup({ rows: [{ id: 'r1', status: 'confirmed', release_reason: null, expires_at: EARLIER }] });
    expect(await service.confirm(USER, 'ai_practice', OP)).toEqual({ state: 'confirmed' });
    expect(events.some((event) => event.startsWith('update'))).toBe(false);
  });

  it('B5E75: released by the caller → released, nothing written', async () => {
    const { service, events } = setup({ rows: [{ id: 'r1', status: 'released', release_reason: 'caller', expires_at: LATER }] });
    expect(await service.confirm(USER, 'ai_practice', OP)).toEqual({ state: 'released' });
    expect(events.some((event) => event.startsWith('update'))).toBe(false);
  });

  it('no row → not-found, logged with ids only', async () => {
    const { service, logger } = setup();
    expect(await service.confirm(USER, 'ai_practice', OP)).toEqual({ state: 'not-found' });
    expect(logger.warn).toHaveBeenCalledWith('usage_confirm_not_found', { user_id: USER, pool: 'ai_practice', operation_id: OP });
  });
});

describe('UsageLedgerService.release', () => {
  it('reserved → released (caller)', async () => {
    const { service, events } = setup({ rows: [{ id: 'r1', status: 'reserved', release_reason: null, expires_at: LATER }] });
    expect(await service.release(USER, 'ai_practice', OP)).toEqual({ state: 'released' });
    expect(events).toContain('update:r1:released:caller');
  });

  it('confirmed → confirmed, unchanged; none → not-found; released → released', async () => {
    const confirmed = setup({ rows: [{ id: 'r1', status: 'confirmed', release_reason: null, expires_at: EARLIER }] });
    expect(await confirmed.service.release(USER, 'ai_practice', OP)).toEqual({ state: 'confirmed' });
    expect(confirmed.events.some((event) => event.startsWith('update'))).toBe(false);
    expect(await setup().service.release(USER, 'ai_practice', OP)).toEqual({ state: 'not-found' });
    const released = setup({ rows: [{ id: 'r1', status: 'released', release_reason: 'caller', expires_at: EARLIER }] });
    expect(await released.service.release(USER, 'ai_practice', OP)).toEqual({ state: 'released' });
  });
});

describe('UsageLedgerService.refund', () => {
  it('B5E18/B5E88: refund with 0 confirmed in the cycle (reservations do not count) → refunded false, nothing written', async () => {
    const { service, events } = setup({ confirmedInCycle: 0, aiUsed: 2 });
    expect(await service.refund(USER, 'ai_practice', OP, 'report-1')).toEqual({ refunded: false });
    expect(events.some((event) => event.startsWith('INSERT'))).toBe(false);
  });

  it('every confirmed unit already credited → refunded false', async () => {
    const { service } = setup({ confirmedInCycle: 2, creditsInCycle: 2 });
    expect(await service.refund(USER, 'ai_practice', OP, 'report-1')).toEqual({ refunded: false });
  });

  it('B5#22: a confirmed unit in the cycle → one credit row with the report id', async () => {
    const { service, execs } = setup({ confirmedInCycle: 1 });
    expect(await service.refund(USER, 'ai_practice', OP, 'report-1')).toEqual({ refunded: true });
    expect(execs.filter((sql) => sql.includes('INSERT INTO usage_records'))).toHaveLength(1);
    expect(execs.at(-1)).toMatch(/'credit', 'confirmed'/);
    expect(execs.at(-1)).toMatch(/ON CONFLICT DO NOTHING/);
  });

  it('B5E19/B5#22: second refund → true, no insert attempted', async () => {
    const { service, execs } = setup({ credit: true, confirmedInCycle: 0 });
    expect(await service.refund(USER, 'ai_practice', OP, 'report-1')).toEqual({ refunded: true });
    expect(execs.some((sql) => sql.includes('INSERT'))).toBe(false);
  });

  it('B5E20: refund of a unit used last cycle counts against the current cycle', async () => {
    const { service, usage } = setup({ confirmedInCycle: 1 });
    await service.refund(USER, 'ai_practice', OP, 'report-1');
    expect(usage.confirmedInCycle).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice', CYCLE);
    expect(usage.creditsInCycle).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice', CYCLE);
  });

  // B5-7: the unit being refunded must be a confirmed use of this very operation, inside the current cycle.
  it('LA2#1: the operation has no confirmed use (a released one, or none), although the cycle has confirmed uses → refunded false, no credit row', async () => {
    const { service, events, execs } = setup({ confirmedInCycle: 3, confirmedUse: false });
    expect(await service.refund(USER, 'ai_practice', OP, 'report-1')).toEqual({ refunded: false });
    expect(events.some((event) => event.startsWith('INSERT'))).toBe(false);
    expect(execs.some((sql) => sql.includes('INSERT'))).toBe(false);
  });

  it('LA2#2: the confirmed use is looked for inside the current cycle only (a use confirmed in an earlier cycle does not qualify)', async () => {
    const { service, usage } = setup({ confirmedInCycle: 1, confirmedUse: false });
    expect(await service.refund(USER, 'ai_practice', OP, 'report-1')).toEqual({ refunded: false });
    expect(usage.hasConfirmedUseInCycle).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice', OP, CYCLE);
  });

  it('a confirmed use of the operation inside the cycle still refunds', async () => {
    const { service, usage } = setup({ confirmedInCycle: 1, confirmedUse: true });
    expect(await service.refund(USER, 'ai_practice', OP, 'report-1')).toEqual({ refunded: true });
    expect(usage.hasConfirmedUseInCycle).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice', OP, CYCLE);
  });

  it('no window (a Free account whose AI numbers are both 0) → refunded false', async () => {
    const { service } = setup({ subscriptions: [], confirmedInCycle: 5, entitlements: { freeAiPracticePerCycle: 0, freeAiLookupPerCycle: 0 } });
    expect(await service.refund(USER, 'ai_practice', OP, 'report-1')).toEqual({ refunded: false });
  });
});

describe('No second connection inside a locked transaction', () => {
  it('reserve, confirm, release and refund issue no query on the shared client while a lock is held', async () => {
    // Each fake throws if the shared client, Settings or a non-tx query is used after lockPool.
    const live: Row[] = [{ id: 'r1', status: 'reserved', release_reason: null, expires_at: EARLIER }];
    await expect(setup({ rows: live }).service.reserve(USER, 'ai_lookup', OP)).resolves.toMatchObject({ state: 'reserved' });
    await expect(setup({ rows: live }).service.confirm(USER, 'ai_lookup', OP)).resolves.toBeDefined();
    await expect(setup({ rows: live }).service.release(USER, 'ai_lookup', OP)).resolves.toBeDefined();
    await expect(setup({ confirmedInCycle: 1 }).service.refund(USER, 'ai_lookup', OP, 'r')).resolves.toEqual({ refunded: true });
  });

  it('the fakes do catch a Settings read under a lock (control)', async () => {
    const { service, sources, settings } = setup();
    sources.load.mockImplementationOnce(async () => {
      await settings.get();
      return { subscriptions: [pro], grants: [], ended: { subscriptions: [], grants: [] } };
    });
    await expect(service.reserve(USER, 'ai_practice', OP)).rejects.toThrow('SettingsService.get used while a lock is held');
  });
});

// ---- Launch prep A, design 6: the Free plan has a calendar-month window and its own daily cap -------------------------------------
const MONTH = { start: new Date('2026-10-31T17:00:00Z'), end: new Date('2026-11-30T17:00:00Z') }; // November for Lan in Vietnam
const FREE = { subscriptions: [] as SubscriptionSource[] };
const wasPro = (endedAt: string): SubscriptionSource => ({ ...pro, status: 'expired', endedAt: new Date(endedAt) });
const inserts = (tx: ReturnType<typeof setup>['tx']) => tx.$executeRaw.mock.calls.filter(([strings]) => strings.join('?').includes('INSERT INTO usage_records'));

describe('UsageLedgerService for a Free account (launch prep A, design 6.2)', () => {
  it('LA3#1: Lan (Free) reserves an AI question; her units are counted in the calendar month of her zone, found from the first of the month', async () => {
    const { service, usage, sources } = setup(FREE);
    expect(await service.reserve(USER, 'ai_practice', OP)).toMatchObject({ state: 'reserved' });
    expect(usage.aiUsed).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice', MONTH, NOW);
    expect(sources.load).toHaveBeenCalledWith(expect.anything(), USER, NOW, MONTH.start);
  });

  it('LA3#2: 15 used in the month → quota-exhausted, and resets_at is 00:00 on 01/12 in Vietnam', async () => {
    const { service } = setup({ ...FREE, aiUsed: 15 });
    expect(await service.reserve(USER, 'ai_practice', OP)).toEqual({ state: 'refused', reason: 'quota-exhausted', resets_at: '2026-11-30T17:00:00.000Z' });
  });

  it('LA3#4: the sixth AI lookup of the month is refused, the fifth is not', async () => {
    expect(await setup({ ...FREE, aiUsed: 4 }).service.reserve(USER, 'ai_lookup', OP)).toMatchObject({ state: 'reserved' });
    expect(await setup({ ...FREE, aiUsed: 5 }).service.reserve(USER, 'ai_lookup', OP))
      .toEqual({ state: 'refused', reason: 'quota-exhausted', resets_at: '2026-11-30T17:00:00.000Z' });
  });

  it('LA3#7 and LA3E5: Pro ended on 08/11 → the Free window starts at that moment, not at the first of the month', async () => {
    const { service, usage } = setup({ ...FREE, ended: { subscriptions: [wasPro('2026-11-08T03:00:00Z')], grants: [] } });
    await service.reserve(USER, 'ai_practice', OP);
    expect(usage.aiUsed).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice', { start: new Date('2026-11-08T03:00:00Z'), end: MONTH.end }, NOW);
  });

  it('the zone is the learner\'s: New York gives the New York month; no profile gives UTC', async () => {
    const newYork = setup({ ...FREE, timezone: 'America/New_York' });
    await newYork.service.reserve(USER, 'ai_practice', OP);
    expect(newYork.usage.aiUsed).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice',
      { start: new Date('2026-11-01T04:00:00Z'), end: new Date('2026-12-01T05:00:00Z') }, NOW);
    const utc = setup({ ...FREE, timezone: null });
    await utc.service.reserve(USER, 'ai_practice', OP);
    expect(utc.usage.aiUsed).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice',
      { start: new Date('2026-11-01T00:00:00Z'), end: new Date('2026-12-01T00:00:00Z') }, NOW);
    expect(utc.identity.getProfile).toHaveBeenCalledWith(USER, utc.tx);
  });

  it('LA3#8: a limits grant with 50 AI questions from 10/11 gives the cycle of the grant (10/11 → 10/12) and the limit 50', async () => {
    const grant: GrantSource = {
      id: 'g-1', kind: 'limits', limits: { ai_practice_per_cycle: 50 }, startsAt: new Date('2026-11-10T00:00:00Z'),
      endsAt: new Date('2027-01-01T00:00:00Z'), revokedAt: null, createdAt: new Date('2026-11-10T00:00:00Z'),
    };
    const full = setup({ ...FREE, grants: [grant], aiUsed: 50 });
    expect(await full.service.reserve(USER, 'ai_practice', OP))
      .toEqual({ state: 'refused', reason: 'quota-exhausted', resets_at: '2026-12-10T00:00:00.000Z' });
    expect(await setup({ ...FREE, grants: [grant], aiUsed: 49 }).service.reserve(USER, 'ai_practice', OP)).toMatchObject({ state: 'reserved' });
  });

  it('LA3#11: free_ai_practice_per_cycle 0 → plan-required for the questions only; the lookups keep their 5', async () => {
    const entitlements = { freeAiPracticePerCycle: 0 };
    expect(await setup({ ...FREE, entitlements }).service.reserve(USER, 'ai_practice', OP)).toEqual({ state: 'refused', reason: 'plan-required' });
    expect(await setup({ ...FREE, entitlements }).service.reserve(USER, 'ai_lookup', OP)).toMatchObject({ state: 'reserved' });
  });

  it('LA3#12: a limits grant with ai_practice_per_cycle 0 → plan-required, however much Free gives', async () => {
    const grant: GrantSource = {
      id: 'g-0', kind: 'limits', limits: { ai_practice_per_cycle: 0 }, startsAt: new Date('2026-11-01T00:00:00Z'),
      endsAt: new Date('2027-01-01T00:00:00Z'), revokedAt: null, createdAt: new Date('2026-11-01T00:00:00Z'),
    };
    expect(await setup({ ...FREE, grants: [grant] }).service.reserve(USER, 'ai_practice', OP)).toEqual({ state: 'refused', reason: 'plan-required' });
  });
});

describe('UsageLedgerService and the Free daily cap (launch prep A, design 6.4, DA19)', () => {
  it('the row is written with the plan the learner had at that moment: free for Lan, pro for a Pro learner', async () => {
    const free = setup(FREE);
    await free.service.reserve(USER, 'ai_practice', OP);
    expect(inserts(free.tx).at(-1)?.slice(1)).toContain('free');
    const paid = setup();
    await paid.service.reserve(USER, 'ai_practice', OP);
    expect(inserts(paid.tx).at(-1)?.slice(1)).toContain('pro');
    expect(inserts(paid.tx).at(-1)?.slice(1)).not.toContain('free');
  });

  it('LA3#10: the Free accounts together used 500 today → the next Free account gets ai-unavailable with the seconds to Vietnam midnight', async () => {
    const { service, usage, events } = setup({ ...FREE, capUsedFree: { confirmed: 497, reserved: 3 } });
    expect(await service.reserve(USER, 'ai_practice', OP)).toEqual({ state: 'refused', reason: 'ai-unavailable', retry_after_seconds: 12 * 3600 });
    expect(usage.capUsedFree).toHaveBeenCalledWith(expect.anything(), '2026-11-10', NOW);
    expect(events.some((event) => event.startsWith('INSERT'))).toBe(false);
  });

  it('LA3#10: one unit under the Free cap still goes through', async () => {
    const { service } = setup({ ...FREE, capUsedFree: { confirmed: 498, reserved: 1 } });
    expect(await service.reserve(USER, 'ai_practice', OP)).toMatchObject({ state: 'reserved' });
  });

  it('LA3#10: a Pro learner is not held by the Free cap, which is not even counted for them', async () => {
    const { service, usage } = setup({ capUsedFree: { confirmed: 5_000, reserved: 0 } });
    expect(await service.reserve(USER, 'ai_practice', OP)).toMatchObject({ state: 'reserved' });
    expect(usage.capUsedFree).not.toHaveBeenCalled();
  });

  it('LA3#15: the system cap reached → Free gets ai-unavailable like every plan, and the Free count is not needed', async () => {
    const { service, usage } = setup({ ...FREE, capUsed: { confirmed: 1000, reserved: 0 } });
    expect(await service.reserve(USER, 'ai_practice', OP)).toMatchObject({ state: 'refused', reason: 'ai-unavailable' });
    expect(usage.capUsedFree).not.toHaveBeenCalled();
  });

  it('LA3E20: free_ai_daily_cap 0 → ai-unavailable without seconds for Free, before the daily lock; Pro is untouched', async () => {
    const free = setup({ ...FREE, entitlements: { freeAiDailyCap: 0 } });
    expect(await free.service.reserve(USER, 'ai_practice', OP)).toEqual({ state: 'refused', reason: 'ai-unavailable', retry_after_seconds: null });
    expect(free.events).not.toContain(DAILY_LOCK);
    expect(await setup({ entitlements: { freeAiDailyCap: 0 } }).service.reserve(USER, 'ai_practice', OP)).toMatchObject({ state: 'reserved' });
  });

  it('LA3E22: a late confirm does not look at the Free cap (B5-6): the unit is confirmed even when the cap is full', async () => {
    const { service, events, usage } = setup({
      ...FREE, aiUsed: 3, capUsedFree: { confirmed: 600, reserved: 0 },
      rows: [{ id: 'r1', status: 'reserved', release_reason: null, expires_at: EARLIER }],
    });
    expect(await service.confirm(USER, 'ai_practice', OP)).toEqual({ state: 'confirmed' });
    expect(events).toContain('update:r1:confirmed:');
    expect(usage.capUsedFree).not.toHaveBeenCalled();
  });
});

describe('UsageLedgerService keeps the plan a row was reserved under (LA3E21)', () => {
  it('LA3E21: confirm and late confirm change the status columns only, never `plan`, so a unit reserved as Free and confirmed after Lan is Pro still counts as Free that day', async () => {
    const confirmed = setup({ rows: [{ id: 'r1', status: 'reserved', release_reason: null, expires_at: LATER }] });
    await confirmed.service.confirm(USER, 'ai_practice', OP);
    const late = setup({ aiUsed: 3, rows: [{ id: 'r1', status: 'reserved', release_reason: null, expires_at: EARLIER }] });
    await late.service.confirm(USER, 'ai_practice', OP);
    for (const { tx } of [confirmed, late]) {
      const updates = tx.usageRecord.update.mock.calls.map(([args]) => Object.keys(args.data));
      expect(updates.length).toBe(1);
      expect(updates[0]).not.toContain('plan');
    }
  });
});

describe('UsageLedgerService.refund for a Free account (launch prep A, design 6.5)', () => {
  it('LA3#5: a Free account\'s AI error is refunded: the confirmed use is looked for inside the month and one credit is written', async () => {
    const { service, usage, execs } = setup({ ...FREE, confirmedInCycle: 1 });
    expect(await service.refund(USER, 'ai_practice', OP, 'report-1')).toEqual({ refunded: true });
    expect(usage.hasConfirmedUseInCycle).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice', OP, MONTH);
    expect(execs.at(-1)).toMatch(/'credit', 'confirmed'/);
  });

  it('LA3E7: a use confirmed while Pro, reported after Lan is Free again → the window starts after Pro ended, so the use is outside it', async () => {
    const { service, usage } = setup({
      ...FREE, ended: { subscriptions: [wasPro('2026-11-08T03:00:00Z')], grants: [] }, confirmedInCycle: 1, confirmedUse: false,
    });
    expect(await service.refund(USER, 'ai_practice', OP, 'report-1')).toEqual({ refunded: false });
    expect(usage.hasConfirmedUseInCycle).toHaveBeenCalledWith(expect.anything(), USER, 'ai_practice', OP,
      { start: new Date('2026-11-08T03:00:00Z'), end: MONTH.end });
  });
});
