import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { runWithOperationId } from '../../common/logging/request-context.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Profile } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS } from '../../settings/index.js';
import type { SubscriptionSource } from '../rules/plan-rules.js';
import { createGrantSchema, listGrantsQuery, updateGrantSchema } from './grants.schemas.js';
import { grantStatus, GrantsService } from './grants.service.js';

const NOW = new Date('2026-11-10T05:00:00Z');
const DAY = 86_400_000;
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const EDITOR = '00000000-0000-4000-8000-0000000000e1';
const LEARNER = '00000000-0000-4000-8000-000000000001';
const REASON = 'Bù cho Lan vì lỗi thanh toán';
const iso = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

type GrantRow = {
  id: string; userId: string; kind: string; plan: string | null; limits: unknown; startsAt: Date; endsAt: Date; reason: string;
  grantedBy: string; grantedByRole: string; revokedAt: Date | null; revokedBy: string | null; revokeReason: string | null;
  paidRenewalAction: string | null; createdAt: Date;
};

function profile(id: string, staffRole: Profile['staff_role'], email = `${id.slice(-2)}@example.test`): Profile {
  return {
    id, email, email_verified: true, native_language: 'vi', timezone: 'Asia/Ho_Chi_Minh', staff_role: staffRole,
    permissions: [], must_change_password: false, given_name: null, family_name: null, birth_date: null, terms_accepted_at: null,
  };
}

function paidSub(overrides: Partial<SubscriptionSource> = {}): SubscriptionSource {
  return {
    id: 'sub-row-1', provider: 'fake', externalSubscriptionId: 'fake_sub_9', status: 'active', trialDenied: false,
    cancelAtPeriodEnd: false, trialEndsAt: null, currentPeriodEnd: new Date(NOW.getTime() + 20 * DAY), graceEndsAt: null,
    quotaAnchorAt: new Date(NOW.getTime() - 10 * DAY), interval: 'month', pendingInterval: null, ...overrides,
  };
}

/** Minimal Prisma `where` matcher for the shapes the service uses. */
function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'OR') return (condition as Array<Record<string, unknown>>).some((part) => matches(row, part));
    if (key === 'AND') return (condition as Array<Record<string, unknown>>).every((part) => matches(row, part));
    const value = row[key];
    if (condition === null || typeof condition !== 'object' || condition instanceof Date) {
      return condition instanceof Date ? (value as Date)?.getTime() === condition.getTime() : value === condition;
    }
    const ops = condition as Record<string, unknown>;
    const v = value instanceof Date ? value.getTime() : value;
    const t = (x: unknown) => (x instanceof Date ? x.getTime() : x) as number;
    return (!('lte' in ops) || (v as number) <= t(ops.lte)) && (!('lt' in ops) || (v as number) < t(ops.lt))
      && (!('gt' in ops) || (v as number) > t(ops.gt)) && (!('gte' in ops) || (v as number) >= t(ops.gte))
      && (!('not' in ops) || value !== ops.not) && (!('in' in ops) || (ops.in as unknown[]).includes(value));
  });
}

type Setup = {
  profiles?: Profile[];
  grants?: Array<Partial<GrantRow>>;
  subscriptions?: SubscriptionSource[];
  adapter?: { cancelAtPeriodEnd?: (id: string) => Promise<void> } | null;
  changes?: Array<Record<string, unknown>>;
};

function setup(input: Setup = {}) {
  const profiles = new Map((input.profiles ?? [profile(ADMIN, 'admin'), profile(EDITOR, 'editor'), profile(LEARNER, null)])
    .map((p) => [p.id, p]));
  let seq = 0;
  const grants: GrantRow[] = (input.grants ?? []).map((g) => ({
    id: `grant-${++seq}`, userId: LEARNER, kind: 'plan', plan: 'pro', limits: null, startsAt: new Date(NOW.getTime() - 5 * DAY),
    endsAt: new Date(NOW.getTime() + 5 * DAY), reason: 'old', grantedBy: ADMIN, grantedByRole: 'admin', revokedAt: null,
    revokedBy: null, revokeReason: null, paidRenewalAction: null, createdAt: new Date(NOW.getTime() - 5 * DAY), ...g,
  }));
  const changes: Array<Record<string, unknown>> = [...(input.changes ?? [])];
  const events: string[] = [];
  let locked = false;
  const guard = (what: string) => {
    if (locked) throw new Error(`${what} used while a lock is held`);
  };

  const grantDelegate = (shared: boolean) => {
    const check = (what: string) => shared && guard(`prisma.entitlementGrant.${what}`);
    return {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (check('findUnique'), grants.find((g) => g.id === where.id) ?? null)),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        check('findUniqueOrThrow');
        const row = grants.find((g) => g.id === where.id);
        if (!row) throw new Error('not found');
        return row;
      }),
      findMany: vi.fn(async ({ where, take }: { where: Record<string, unknown>; take?: number }) => {
        check('findMany');
        return grants.filter((g) => matches(g, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)).slice(0, take);
      }),
      create: vi.fn(async ({ data }: { data: Partial<GrantRow> }) => {
        check('create');
        const row = {
          id: `grant-${++seq}`, plan: null, limits: null, revokedAt: null, revokedBy: null, revokeReason: null,
          paidRenewalAction: null, createdAt: NOW, ...data,
        } as GrantRow;
        grants.push(row);
        events.push(`create:${row.id}`);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<GrantRow> }) => {
        check('update');
        const row = grants.find((g) => g.id === where.id)!;
        Object.assign(row, data);
        events.push(`update:${row.id}:${Object.keys(data).join(',')}`);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<GrantRow> }) => {
        check('updateMany');
        const hit = grants.filter((g) => matches(g, where));
        for (const row of hit) Object.assign(row, data);
        events.push(`updateMany:${hit.map((g) => g.id).join(',')}`);
        return { count: hit.length };
      }),
    };
  };
  const changeDelegate = (shared: boolean) => ({
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      if (shared) guard('prisma.entitlementGrantChange.create');
      const row = { id: `change-${changes.length + 1}`, createdAt: NOW, ...data };
      changes.push(row);
      events.push('change');
      return row;
    }),
    findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (shared) guard('prisma.entitlementGrantChange.findMany');
      // Newest first by created_at, then id; rows created here all have NOW, so a later one sorts first by its id.
      return changes.filter((c) => matches(c, where)).sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()
        || String(b.id).localeCompare(String(a.id), undefined, { numeric: true }));
    }),
  });

  const tx = {
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      if (strings.join('?').includes('pg_advisory_xact_lock')) {
        events.push(`lock:${String(values[0])}`);
        locked = true;
      }
      return 1;
    }),
    $queryRaw: vi.fn(async () => [{ id: 'locked' }]),
    entitlementGrant: grantDelegate(false),
    entitlementGrantChange: changeDelegate(false),
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => {
      events.push('tx');
      try {
        return await fn(tx);
      } finally {
        locked = false;
        events.push('commit');
      }
    }),
    entitlementGrant: grantDelegate(true),
    entitlementGrantChange: changeDelegate(true),
  };
  const identity = {
    getProfile: vi.fn(async (id: string) => (guard('IdentityService.getProfile'), profiles.get(id) ?? null)),
    emailsOf: vi.fn(async (ids: string[]) => {
      guard('IdentityService.emailsOf');
      return new Map(ids.flatMap((id) => {
        const p = profiles.get(id);
        return p ? [[id, p.email] as [string, string]] : [];
      }));
    }),
    findUserIdByEmail: vi.fn(async (email: string) => {
      guard('IdentityService.findUserIdByEmail');
      return [...profiles.values()].find((p) => p.email === email.trim().toLowerCase())?.id ?? null;
    }),
  };
  const settings = { get: vi.fn(async () => (guard('SettingsService.get'), SETTINGS_DEFAULTS)) };
  const sources = {
    load: vi.fn(async (db: unknown) => {
      if (db !== tx) throw new Error('sources.load not given the transaction');
      return { subscriptions: input.subscriptions ?? [], grants: [] };
    }),
  };
  const adapter = input.adapter === undefined ? { cancelAtPeriodEnd: vi.fn(async () => { events.push('adapter'); }) } : input.adapter;
  const registry = { get: vi.fn(() => adapter ?? undefined) };
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => logs.push(entry) });
  const clock = new FakeClock(NOW);
  const service = new GrantsService(
    prisma as never, clock, identity as never, settings as never, sources as never, registry as never, logger,
  );
  return { service, grants, changes, events, logs, adapter, registry, clock, tx, prisma, identity };
}

async function problem(promise: Promise<unknown>): Promise<{ status: number; type: string; extensions?: Record<string, unknown> }> {
  const error = await promise.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const p = error as ProblemDetailsException;
  return { status: p.getStatus(), type: p.problemType, ...(p.extensions ? { extensions: p.extensions } : {}) };
}

const planBody = (overrides: Record<string, unknown> = {}) =>
  createGrantSchema.parse({ user_id: LEARNER, kind: 'plan', plan: 'pro', ends_at: iso(30 * DAY), reason: REASON, ...overrides });

afterEach(() => {
  vi.useRealTimers();
});

describe('createGrantSchema (R12)', () => {
  const limits = (value: Record<string, unknown>) =>
    createGrantSchema.safeParse({ user_id: LEARNER, kind: 'limits', limits: value, ends_at: iso(DAY), reason: 'r' }).success;

  it('R12: limits 0 accepted, 201 sessions or 5001 AI units refused, kind limits with no key refused', () => {
    expect(limits({ practice_sessions_per_day: 0, ai_practice_per_cycle: 0, ai_lookup_per_cycle: 0 })).toBe(true);
    expect(limits({ practice_sessions_per_day: 200, ai_practice_per_cycle: 5000, ai_lookup_per_cycle: 5000 })).toBe(true);
    expect(limits({ practice_sessions_per_day: 201 })).toBe(false);
    expect(limits({ ai_practice_per_cycle: 5001 })).toBe(false);
    expect(limits({ ai_lookup_per_cycle: 5001 })).toBe(false);
    expect(limits({ ai_lookup_per_cycle: 1.5 })).toBe(false);
    expect(limits({})).toBe(false);
    expect(limits({ other: 1 })).toBe(false);
  });

  it('B5E36: a missing ends_at or reason, and kind / plan / limits that do not match, are refused', () => {
    const base = { user_id: LEARNER, kind: 'plan', plan: 'pro', ends_at: iso(DAY), reason: 'r' };
    expect(createGrantSchema.safeParse(base).success).toBe(true);
    expect(createGrantSchema.safeParse({ ...base, ends_at: undefined }).success).toBe(false);
    expect(createGrantSchema.safeParse({ ...base, reason: '   ' }).success).toBe(false);
    expect(createGrantSchema.safeParse({ ...base, reason: 'x'.repeat(301) }).success).toBe(false);
    expect(createGrantSchema.safeParse({ ...base, plan: undefined }).success).toBe(false);
    expect(createGrantSchema.safeParse({ ...base, limits: { practice_sessions_per_day: 5 } }).success).toBe(false);
    expect(createGrantSchema.safeParse({ ...base, kind: 'limits', plan: undefined }).success).toBe(false);
    expect(createGrantSchema.safeParse({ ...base, ends_at: '2026-12-01' }).success).toBe(false);
    expect(createGrantSchema.safeParse({ ...base, user_id: 'not-a-uuid' }).success).toBe(false);
  });

  it('PATCH needs at least one date and a reason; the list query bounds its numbers', () => {
    expect(updateGrantSchema.safeParse({ reason: 'r' }).success).toBe(false);
    expect(updateGrantSchema.safeParse({ ends_at: iso(DAY), reason: '' }).success).toBe(false);
    expect(updateGrantSchema.safeParse({ ends_at: iso(DAY), reason: 'r' }).success).toBe(true);
    expect(listGrantsQuery.safeParse({ expiring_within_days: '0' }).success).toBe(false);
    expect(listGrantsQuery.safeParse({ expiring_within_days: '366' }).success).toBe(false);
    expect(listGrantsQuery.parse({}).page_size).toBe(20);
  });
});

describe('GrantsService.create', () => {
  it('B5#18: admin grants Pro to a free learner → row saved, the view returned', async () => {
    const { service, grants } = setup();
    const view = await service.create(ADMIN, planBody());
    expect(grants).toHaveLength(1);
    expect(view).toMatchObject({
      user_id: LEARNER, kind: 'plan', plan: 'pro', limits: null, starts_at: NOW.toISOString(), ends_at: iso(30 * DAY),
      reason: REASON, granted_by: ADMIN, granted_by_role: 'admin', revoked_at: null, paid_renewal_action: null,
    });
  });

  it('B5E35: editor grants Pro 30 days → granted_by_role editor', async () => {
    const view = await setup().service.create(EDITOR, planBody());
    expect(view).toMatchObject({ granted_by: EDITOR, granted_by_role: 'editor' });
  });

  it('B5E33/B5E34: an editor refused for the target or for AI limits → 409 grant-not-allowed with the reason, nothing saved', async () => {
    const { service, grants } = setup();
    expect(await problem(service.create(EDITOR, planBody({ user_id: ADMIN }))))
      .toEqual({ status: 409, type: 'grant-not-allowed', extensions: { reason: 'target-is-admin' } });
    expect(await problem(service.create(EDITOR, planBody({ user_id: EDITOR }))))
      .toEqual({ status: 409, type: 'grant-not-allowed', extensions: { reason: 'self-grant' } });
    const ai = createGrantSchema.parse({ user_id: LEARNER, kind: 'limits', limits: { ai_practice_per_cycle: 0 }, ends_at: iso(DAY), reason: 'r' });
    expect(await problem(service.create(EDITOR, ai)))
      .toEqual({ status: 409, type: 'grant-not-allowed', extensions: { reason: 'ai-limits-admin-only' } });
    expect(grants).toHaveLength(0);
  });

  it('B5E85: unknown user_id → 404 not-found', async () => {
    expect(await problem(setup().service.create(ADMIN, planBody({ user_id: '00000000-0000-4000-8000-0000000000ff' }))))
      .toEqual({ status: 404, type: 'not-found' });
  });

  it('B5E36: ends_at in the past, ends_at before starts_at, starts_at 6 minutes ago → 400, nothing saved', async () => {
    const { service, grants } = setup();
    for (const body of [
      planBody({ ends_at: iso(-60_000) }),
      planBody({ starts_at: iso(2 * DAY), ends_at: iso(DAY) }),
      planBody({ starts_at: iso(2 * DAY), ends_at: iso(2 * DAY) }),
      planBody({ starts_at: iso(-6 * 60_000) }),
    ]) {
      expect(await problem(service.create(ADMIN, body))).toEqual({ status: 400, type: 'validation-failed' });
    }
    expect(grants).toHaveLength(0);
  });

  it('starts_at 4 minutes ago is accepted (clock skew)', async () => {
    const view = await setup().service.create(ADMIN, planBody({ starts_at: iso(-4 * 60_000) }));
    expect(view.starts_at).toBe(iso(-4 * 60_000));
  });

  it('B5E78: a Pro grant starting now revokes the active plan grant (replaced, by the new granter)', async () => {
    const { service, grants } = setup({ grants: [{ kind: 'plan' }] });
    await service.create(EDITOR, planBody());
    expect(grants[0]).toMatchObject({ revokedAt: NOW, revokedBy: EDITOR, revokeReason: 'replaced' });
    expect(grants[1]).toMatchObject({ revokedAt: null });
  });

  it('B5E99: a plan grant with a future starts_at revokes nothing; a limits grant never revokes', async () => {
    const future = setup({ grants: [{ kind: 'plan' }] });
    await future.service.create(ADMIN, planBody({ starts_at: iso(10 * DAY), ends_at: iso(40 * DAY) }));
    expect(future.grants[0].revokedAt).toBeNull();
    const limits = setup({ grants: [{ kind: 'plan' }] });
    await limits.service.create(ADMIN, createGrantSchema.parse({
      user_id: LEARNER, kind: 'limits', limits: { practice_sessions_per_day: 9 }, ends_at: iso(DAY), reason: 'r',
    }));
    expect(limits.grants[0].revokedAt).toBeNull();
  });

  it('B5E79: Pro for a learner with a paid auto-renewing subscription, without the flag → 409 target-has-paid-subscription, nothing saved', async () => {
    const { service, grants, events } = setup({ subscriptions: [paidSub()], grants: [{ kind: 'plan' }] });
    expect(await problem(service.create(ADMIN, planBody())))
      .toEqual({ status: 409, type: 'grant-not-allowed', extensions: { reason: 'target-has-paid-subscription' } });
    expect(grants).toHaveLength(1);
    expect(grants[0].revokedAt).toBeNull();
    expect(events).not.toContain('adapter');
  });

  it('a cancelled, on_hold or ended subscription needs no flag', async () => {
    for (const sub of [paidSub({ cancelAtPeriodEnd: true }), paidSub({ status: 'on_hold' }),
      paidSub({ currentPeriodEnd: new Date(NOW.getTime() - 10 * DAY) })]) {
      const { service, grants } = setup({ subscriptions: [sub] });
      await service.create(ADMIN, planBody());
      expect(grants).toHaveLength(1);
    }
  });

  it('B5#31/B5E28: with the flag → cancelAtPeriodEnd called after commit with the provider\'s subscription id, turned_off', async () => {
    const { service, events, adapter } = setup({ subscriptions: [paidSub()] });
    const view = await service.create(ADMIN, planBody({ confirm_turn_off_paid_renewal: true }));
    expect(adapter?.cancelAtPeriodEnd).toHaveBeenCalledWith('fake_sub_9');
    expect(events.indexOf('adapter')).toBeGreaterThan(events.indexOf('commit'));
    expect(view.paid_renewal_action).toBe('turned_off');
  });

  it('B5E80: adapter without the method → not_supported, logged with the subscription id only', async () => {
    const { service, logs } = setup({ subscriptions: [paidSub()], adapter: {} });
    const view = await service.create(ADMIN, planBody({ confirm_turn_off_paid_renewal: true }));
    expect(view.paid_renewal_action).toBe('not_supported');
    expect(logs).toContainEqual(expect.objectContaining({ event: 'paid_renewal_not_cancelled', subscription_id: 'sub-row-1' }));
  });

  it('no adapter for the provider, or a call that throws → not_supported, the grant still created', async () => {
    expect((await setup({ subscriptions: [paidSub()], adapter: null }).service
      .create(ADMIN, planBody({ confirm_turn_off_paid_renewal: true }))).paid_renewal_action).toBe('not_supported');
    const failing = setup({ subscriptions: [paidSub()], adapter: { cancelAtPeriodEnd: async () => { throw new Error('down'); } } });
    const view = await failing.service.create(ADMIN, planBody({ confirm_turn_off_paid_renewal: true }));
    expect(view.paid_renewal_action).toBe('not_supported');
    expect(failing.grants).toHaveLength(1);
  });

  it('an adapter call that times out → not_supported, the grant still created', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { service, grants } = setup({ subscriptions: [paidSub()], adapter: { cancelAtPeriodEnd: () => new Promise<void>(() => {}) } });
    const pending = service.create(ADMIN, planBody({ confirm_turn_off_paid_renewal: true }));
    await vi.advanceTimersByTimeAsync(5_000);
    expect((await pending).paid_renewal_action).toBe('not_supported');
    expect(grants).toHaveLength(1);
  });

  it('two paid subscriptions, one adapter without the method → not_supported', async () => {
    const turnOff = vi.fn(async () => {});
    const { service, registry } = setup({ subscriptions: [paidSub(), paidSub({ id: 'sub-row-2', provider: 'apple', externalSubscriptionId: 'a1' })] });
    registry.get.mockImplementation(((provider: string) => (provider === 'fake' ? { cancelAtPeriodEnd: turnOff } : {})) as never);
    const view = await service.create(ADMIN, planBody({ confirm_turn_off_paid_renewal: true }));
    expect(turnOff).toHaveBeenCalledWith('fake_sub_9');
    expect(view.paid_renewal_action).toBe('not_supported');
  });

  it('a limits grant ignores paid subscriptions (no flag needed, no adapter call)', async () => {
    const { service, events } = setup({ subscriptions: [paidSub()] });
    await service.create(ADMIN, createGrantSchema.parse({
      user_id: LEARNER, kind: 'limits', limits: { ai_practice_per_cycle: 500 }, ends_at: iso(DAY), reason: 'r',
    }));
    expect(events).not.toContain('adapter');
  });
});

describe('GrantsService.revoke', () => {
  it('B5E84: a grant with a future starts_at can be revoked before it starts', async () => {
    const { service, grants } = setup({ grants: [{ startsAt: new Date(NOW.getTime() + 3 * DAY), endsAt: new Date(NOW.getTime() + 9 * DAY) }] });
    const view = await service.revoke(ADMIN, 'grant-1', 'mistake');
    expect(view).toMatchObject({ revoked_at: NOW.toISOString(), revoked_by: ADMIN, revoke_reason: 'mistake' });
    expect(grants[0].revokedAt).toEqual(NOW);
  });

  it('B5E39: revoking an expired grant → 409 grant-not-active', async () => {
    const { service } = setup({ grants: [{ endsAt: new Date(NOW.getTime() - 1) }] });
    expect(await problem(service.revoke(ADMIN, 'grant-1', 'r'))).toEqual({ status: 409, type: 'grant-not-active' });
  });

  it('revoking twice returns the same view', async () => {
    const { service, clock } = setup({ grants: [{}] });
    const first = await service.revoke(ADMIN, 'grant-1', 'r');
    clock.advance(60_000);
    expect(await service.revoke(ADMIN, 'grant-1', 'other')).toEqual(first);
  });

  it('B5E38: a learner granted by an editor who later became an editor → another editor gets target-is-staff; admin may revoke', async () => {
    const other = '00000000-0000-4000-8000-0000000000e2';
    const { service } = setup({
      profiles: [profile(ADMIN, 'admin'), profile(EDITOR, 'editor'), profile(other, 'editor')],
      grants: [{ userId: other, grantedBy: EDITOR, grantedByRole: 'editor' }],
    });
    expect(await problem(service.revoke(EDITOR, 'grant-1', 'r')))
      .toEqual({ status: 409, type: 'grant-not-allowed', extensions: { reason: 'target-is-staff' } });
    expect((await service.revoke(ADMIN, 'grant-1', 'r')).revoked_by).toBe(ADMIN);
  });

  it('B5E82: an editor revoking a grant of "AI: 0" → ai-limits-admin-only', async () => {
    const { service } = setup({ grants: [{ kind: 'limits', plan: null, limits: { ai_practice_per_cycle: 0 } }] });
    expect(await problem(service.revoke(EDITOR, 'grant-1', 'r')))
      .toEqual({ status: 409, type: 'grant-not-allowed', extensions: { reason: 'ai-limits-admin-only' } });
  });

  it('an unknown grant → 404', async () => {
    expect(await problem(setup().service.revoke(ADMIN, 'missing', 'r'))).toEqual({ status: 404, type: 'not-found' });
  });
});

describe('GrantsService.update (D38)', () => {
  const started = { startsAt: new Date('2026-11-01T00:00:00Z'), endsAt: new Date('2026-11-30T00:00:00Z') };

  it('B5E95: ends_at 30/11 → 31/12 is saved with one change row holding the old and new dates', async () => {
    const { service, changes } = setup({ grants: [started] });
    const view = await service.update(ADMIN, 'grant-1', updateGrantSchema.parse({ ends_at: '2026-12-31T00:00:00Z', reason: 'kéo dài' }));
    expect(view.ends_at).toBe('2026-12-31T00:00:00.000Z');
    expect(view.starts_at).toBe('2026-11-01T00:00:00.000Z');
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      grantId: 'grant-1', changedBy: ADMIN, changedByRole: 'admin', reason: 'kéo dài',
      oldStartsAt: started.startsAt, newStartsAt: started.startsAt, oldEndsAt: started.endsAt, newEndsAt: new Date('2026-12-31T00:00:00Z'),
    });
    expect(view.changes).toEqual([expect.objectContaining({
      id: 'change-1', old_ends_at: '2026-11-30T00:00:00.000Z', new_ends_at: '2026-12-31T00:00:00.000Z', changed_by_role: 'admin',
    })]);
  });

  it('B5E96: changing starts_at of a grant that has started → 400, nothing changed', async () => {
    const { service, changes, grants } = setup({ grants: [started] });
    expect(await problem(service.update(ADMIN, 'grant-1', updateGrantSchema.parse({ starts_at: '2026-11-12T00:00:00Z', reason: 'r' }))))
      .toEqual({ status: 400, type: 'validation-failed' });
    expect(changes).toHaveLength(0);
    expect(grants[0].startsAt).toEqual(started.startsAt);
  });

  it('update of a not-yet-started grant moves starts_at (not earlier than 5 minutes ago)', async () => {
    const future = { startsAt: new Date(NOW.getTime() + 3 * DAY), endsAt: new Date(NOW.getTime() + 9 * DAY) };
    const { service, changes } = setup({ grants: [future] });
    const view = await service.update(ADMIN, 'grant-1', updateGrantSchema.parse({ starts_at: iso(DAY), reason: 'r' }));
    expect(view.starts_at).toBe(iso(DAY));
    expect(changes).toHaveLength(1);
    expect(await problem(setup({ grants: [future] }).service
      .update(ADMIN, 'grant-1', updateGrantSchema.parse({ starts_at: iso(-6 * 60_000), reason: 'r' }))))
      .toEqual({ status: 400, type: 'validation-failed' });
  });

  it('B5E97: editor changes the dates of a grant with AI limits, or of an admin\'s grant → refused, nothing changed', async () => {
    const ai = setup({ grants: [{ ...started, kind: 'limits', plan: null, limits: { ai_lookup_per_cycle: 3 } }] });
    expect(await problem(ai.service.update(EDITOR, 'grant-1', updateGrantSchema.parse({ ends_at: '2026-12-31T00:00:00Z', reason: 'r' }))))
      .toEqual({ status: 409, type: 'grant-not-allowed', extensions: { reason: 'ai-limits-admin-only' } });
    expect(ai.changes).toHaveLength(0);
    const admins = setup({ grants: [{ ...started, userId: ADMIN }] });
    expect(await problem(admins.service.update(EDITOR, 'grant-1', updateGrantSchema.parse({ ends_at: '2026-12-31T00:00:00Z', reason: 'r' }))))
      .toEqual({ status: 409, type: 'grant-not-allowed', extensions: { reason: 'target-is-admin' } });
  });

  it('B5E98: changing the dates of a revoked or expired grant → 409 grant-not-active', async () => {
    const body = updateGrantSchema.parse({ ends_at: '2026-12-31T00:00:00Z', reason: 'r' });
    expect(await problem(setup({ grants: [{ ...started, revokedAt: NOW }] }).service.update(ADMIN, 'grant-1', body)))
      .toEqual({ status: 409, type: 'grant-not-active' });
    expect(await problem(setup({ grants: [{ ...started, endsAt: NOW }] }).service.update(ADMIN, 'grant-1', body)))
      .toEqual({ status: 409, type: 'grant-not-active' });
  });

  it('B5E100: the same dates again → the grant as it is, no change row', async () => {
    const { service, changes } = setup({ grants: [started] });
    const view = await service.update(ADMIN, 'grant-1', updateGrantSchema.parse({
      starts_at: '2026-11-01T00:00:00Z', ends_at: '2026-11-30T00:00:00Z', reason: 'again',
    }));
    expect(view.ends_at).toBe('2026-11-30T00:00:00.000Z');
    expect(changes).toHaveLength(0);
  });

  it('B5E101: shortening ends_at to a time already past → 400', async () => {
    const { service } = setup({ grants: [started] });
    expect(await problem(service.update(ADMIN, 'grant-1', updateGrantSchema.parse({ ends_at: iso(-60_000), reason: 'r' }))))
      .toEqual({ status: 400, type: 'validation-failed' });
  });
});

describe('GrantsService.list', () => {
  it('create sends created_at from the clock (milliseconds), so a page token (ISO, ms) never skips a row of the same millisecond', async () => {
    const { service, tx } = setup();
    await service.create(ADMIN, planBody());
    expect(tx.entitlementGrant.create.mock.calls[0][0].data.createdAt).toEqual(NOW);
  });

  it('B5#21: granted_by and expiring_within_days filter; newest first; pages with a token bound to the filters', async () => {
    const { service } = setup({ grants: [
      { grantedBy: EDITOR, endsAt: new Date(NOW.getTime() + 3 * DAY), createdAt: new Date(NOW.getTime() - 3 * DAY) },
      { grantedBy: EDITOR, endsAt: new Date(NOW.getTime() + 6 * DAY), createdAt: new Date(NOW.getTime() - 2 * DAY) },
      { grantedBy: EDITOR, endsAt: new Date(NOW.getTime() + 30 * DAY), createdAt: new Date(NOW.getTime() - DAY) },
      { grantedBy: ADMIN, endsAt: new Date(NOW.getTime() + 2 * DAY) },
      { grantedBy: EDITOR, endsAt: new Date(NOW.getTime() + 2 * DAY), revokedAt: NOW },
    ] });
    const query = listGrantsQuery.parse({ granted_by: EDITOR, expiring_within_days: '7', page_size: '1' });
    const first = await service.list(query);
    expect(first.items.map((g) => g.id)).toEqual(['grant-2']);
    const second = await service.list({ ...query, page_token: first.next_page_token! });
    expect(second.items.map((g) => g.id)).toEqual(['grant-1']);
    expect(second.next_page_token).toBeNull();
    expect(await problem(service.list({ ...listGrantsQuery.parse({ page_size: '1' }), page_token: first.next_page_token! })))
      .toEqual({ status: 400, type: 'validation-failed' });
  });

  it('active=false lists revoked and ended grants only', async () => {
    const { service } = setup({ grants: [{}, { revokedAt: NOW }, { endsAt: new Date(NOW.getTime() - 1) }] });
    expect((await service.list(listGrantsQuery.parse({ active: 'false' }))).items.map((g) => g.id).sort()).toEqual(['grant-2', 'grant-3']);
    expect((await service.list(listGrantsQuery.parse({ active: 'true' }))).items.map((g) => g.id)).toEqual(['grant-1']);
  });
});

describe('GrantsService.lookup (design §5.2)', () => {
  const OTHER_EDITOR = '00000000-0000-4000-8000-0000000000e2';
  const lookupSetup = () => setup({ profiles: [
    profile(ADMIN, 'admin', 'admin@example.test'), profile(EDITOR, 'editor', 'editor@example.test'),
    profile(OTHER_EDITOR, 'editor', 'other@example.test'), profile(LEARNER, null, 'lan@example.test'),
  ] });

  it('an editor looking up a learner: grantable', async () => {
    const { service } = lookupSetup();
    expect(await service.lookup(EDITOR, 'lan@example.test'))
      .toEqual({ user: { id: LEARNER, email: 'lan@example.test' }, grantable: true, reason: null });
  });

  it('an editor looking up another editor: target-is-staff; an admin: target-is-admin; themselves: self-grant', async () => {
    const { service } = lookupSetup();
    expect(await service.lookup(EDITOR, 'other@example.test'))
      .toEqual({ user: { id: OTHER_EDITOR, email: 'other@example.test' }, grantable: false, reason: 'target-is-staff' });
    expect((await service.lookup(EDITOR, 'admin@example.test')).reason).toBe('target-is-admin');
    expect(await service.lookup(EDITOR, 'editor@example.test'))
      .toEqual({ user: { id: EDITOR, email: 'editor@example.test' }, grantable: false, reason: 'self-grant' });
  });

  it('an admin may grant to anyone: grantable true, reason null', async () => {
    const { service } = lookupSetup();
    expect((await service.lookup(ADMIN, 'other@example.test'))).toMatchObject({ grantable: true, reason: null });
    expect((await service.lookup(ADMIN, 'lan@example.test'))).toMatchObject({ grantable: true, reason: null });
  });

  it('an unknown address is 404 not-found; the match ignores case and spaces', async () => {
    const { service } = lookupSetup();
    expect(await problem(service.lookup(ADMIN, 'nobody@example.test'))).toEqual({ status: 404, type: 'not-found' });
    expect(await service.lookup(EDITOR, '  LAN@Example.TEST ')).toMatchObject({ user: { id: LEARNER }, grantable: true });
  });
});

describe('locks and logs', () => {
  it('no shared-client query while lockUser is held (create, revoke, update), and the lock is the target user\'s', async () => {
    const { service, events } = setup({ grants: [{ kind: 'plan' }], subscriptions: [paidSub()] });
    await service.create(ADMIN, planBody({ confirm_turn_off_paid_renewal: true }));
    await service.update(ADMIN, 'grant-2', updateGrantSchema.parse({ ends_at: iso(60 * DAY), reason: 'r' }));
    await service.revoke(ADMIN, 'grant-2', 'r');
    expect(events.filter((e) => e.startsWith('lock:'))).toEqual(Array(3).fill(`lock:entitlements.user:${LEARNER}`));
  });

  it('create, revoke and update look up emails after the transaction (the fake emailsOf throws under the lock), one call each', async () => {
    const { service, identity } = setup({ grants: [{ kind: 'plan' }], subscriptions: [paidSub()] });
    await service.create(ADMIN, planBody({ confirm_turn_off_paid_renewal: true }));
    await service.update(ADMIN, 'grant-2', updateGrantSchema.parse({ ends_at: iso(60 * DAY), reason: 'r' }));
    await service.revoke(ADMIN, 'grant-2', 'r');
    expect(identity.emailsOf).toHaveBeenCalledTimes(3);
  });

  it('B5E62: create, revoke and update logs carry ids and operation_id, never the reason text or an email', async () => {
    const { service, logs } = setup({ subscriptions: [paidSub()], adapter: {} });
    await runWithOperationId('op-123', async () => {
      const view = await service.create(ADMIN, planBody({ confirm_turn_off_paid_renewal: true }));
      await service.update(ADMIN, view.id, updateGrantSchema.parse({ ends_at: iso(40 * DAY), reason: 'bí mật 2' }));
      await service.revoke(ADMIN, view.id, 'bí mật 3');
    });
    const events = logs.map((entry) => entry.event);
    expect(events).toEqual(expect.arrayContaining([
      'entitlement_grant_created', 'paid_renewal_not_cancelled', 'entitlement_grant_updated', 'entitlement_grant_revoked',
    ]));
    for (const entry of logs) expect(entry.operation_id).toBe('op-123');
    const text = JSON.stringify(logs);
    for (const secret of [REASON, 'bí mật 2', 'bí mật 3', '@example.test']) expect(text).not.toContain(secret);
    expect(text).toContain(LEARNER);
  });
});

describe('grant status, people and last change (design §5.1, §5.4 10.4–10.5)', () => {
  const ref = (id: string, email: string | null) => ({ id, email, system: false });
  const LEARNER_EMAIL = '01@example.test';
  const ADMIN_EMAIL = 'a1@example.test';
  const EDITOR_EMAIL = 'e1@example.test';

  it('grantStatus: replaced → revoked → expired → scheduled → active, in that order', () => {
    const base = { revokedAt: null, startsAt: new Date(NOW.getTime() - DAY), endsAt: new Date(NOW.getTime() + DAY) };
    expect(grantStatus(base, NOW, false)).toBe('active');
    expect(grantStatus({ ...base, startsAt: new Date(NOW.getTime() + 1) }, NOW, false)).toBe('scheduled');
    expect(grantStatus({ ...base, endsAt: NOW }, NOW, false)).toBe('expired');
    expect(grantStatus({ ...base, endsAt: NOW, revokedAt: NOW }, NOW, false)).toBe('revoked');
    expect(grantStatus({ ...base, endsAt: NOW, revokedAt: NOW }, NOW, true)).toBe('replaced');
    expect(grantStatus(base, NOW, true)).toBe('replaced');
  });

  it('B5E78: after a Pro grant starting now, the old row is replaced and the new one active (list, create and forUser)', async () => {
    const { service } = setup({ grants: [{ kind: 'plan' }] });
    const created = await service.create(EDITOR, planBody());
    expect(created.status).toBe('active');
    const listed = await service.list(listGrantsQuery.parse({}));
    expect(listed.items.map((g) => [g.id, g.status])).toEqual([['grant-2', 'active'], ['grant-1', 'replaced']]);
    expect(listed.items[1].revoked_by_user).toEqual(ref(EDITOR, EDITOR_EMAIL));
    expect((await service.forUser(LEARNER)).map((g) => g.status)).toEqual(['active', 'replaced']);
  });

  it('T7: the replacing grant is found even when the list filters it out (granted_by of the old grant)', async () => {
    const { service } = setup({ grants: [{ kind: 'plan' }] });
    await service.create(EDITOR, planBody());
    const listed = await service.list(listGrantsQuery.parse({ granted_by: ADMIN }));
    expect(listed.items.map((g) => [g.id, g.status])).toEqual([['grant-1', 'replaced']]);
  });

  it('T7: a manual revoke whose reason is typed "replaced" is still revoked', async () => {
    const { service } = setup({ grants: [{ kind: 'plan' }] });
    const view = await service.revoke(ADMIN, 'grant-1', 'replaced');
    expect(view).toMatchObject({ status: 'revoked', revoke_reason: 'replaced', revoked_by_user: ref(ADMIN, ADMIN_EMAIL) });
    expect((await service.list(listGrantsQuery.parse({}))).items[0].status).toBe('revoked');
  });

  it('starts_at > now → scheduled; ends_at ≤ now → expired', async () => {
    const { service } = setup({ grants: [
      { startsAt: new Date(NOW.getTime() + DAY), endsAt: new Date(NOW.getTime() + 9 * DAY), createdAt: new Date(NOW.getTime() - DAY) },
      { endsAt: NOW, createdAt: new Date(NOW.getTime() - 2 * DAY) },
    ] });
    expect((await service.list(listGrantsQuery.parse({}))).items.map((g) => [g.id, g.status]))
      .toEqual([['grant-1', 'scheduled'], ['grant-2', 'expired']]);
  });

  it('every view names its people as { id, email, system }; an unknown id has email null', async () => {
    const gone = '00000000-0000-4000-8000-0000000000dd';
    const { service } = setup({ grants: [{ grantedBy: gone }] });
    const [view] = (await service.list(listGrantsQuery.parse({}))).items;
    expect(view).toMatchObject({
      user_id: LEARNER, user: ref(LEARNER, LEARNER_EMAIL), granted_by: gone, granted_by_user: ref(gone, null),
      revoked_by: null, revoked_by_user: null, status: 'active', last_change: null,
    });
  });

  it('10.5: last_change is the newest of two changes, with changed_by_user; null for a grant with none; one emailsOf per page', async () => {
    const change = (id: string, ago: number, by: string) => ({
      id, grantId: 'grant-1', changedBy: by, changedByRole: 'admin', oldStartsAt: NOW, newStartsAt: NOW, oldEndsAt: NOW,
      newEndsAt: NOW, reason: id, createdAt: new Date(NOW.getTime() - ago),
    });
    const { service, identity } = setup({
      grants: [{}, { createdAt: new Date(NOW.getTime() - 9 * DAY) }],
      changes: [change('change-old', 2 * DAY, ADMIN), change('change-new', DAY, EDITOR)],
    });
    const { items } = await service.list(listGrantsQuery.parse({}));
    expect(items[0].last_change).toMatchObject({
      id: 'change-new', reason: 'change-new', changed_by: EDITOR, changed_by_user: ref(EDITOR, EDITOR_EMAIL),
    });
    expect(items[1].last_change).toBeNull();
    expect(identity.emailsOf).toHaveBeenCalledTimes(1);
  });

  it('update returns changes[] with changed_by_user and last_change equal to the newest change', async () => {
    const { service } = setup({ grants: [{}] });
    const view = await service.update(EDITOR, 'grant-1', updateGrantSchema.parse({ ends_at: iso(20 * DAY), reason: 'r' }));
    expect(view.changes).toEqual([expect.objectContaining({ id: 'change-1', changed_by_user: ref(EDITOR, EDITOR_EMAIL) })]);
    expect(view.last_change).toEqual(view.changes![0]);
  });

  it('§5.2: an unknown user_email or granted_by_email → empty list, no grant findMany; known emails filter like the ids', async () => {
    const { service, prisma } = setup({ grants: [{ grantedBy: EDITOR }, { userId: ADMIN, createdAt: new Date(NOW.getTime() - 9 * DAY) }] });
    for (const query of [{ user_email: 'nobody@example.test' }, { granted_by_email: 'nobody@example.test' }]) {
      expect(await service.list(listGrantsQuery.parse(query))).toEqual({ items: [], next_page_token: null });
    }
    expect(prisma.entitlementGrant.findMany).not.toHaveBeenCalled();
    expect((await service.list(listGrantsQuery.parse({ user_email: ' 01@Example.test ' }))).items.map((g) => g.id)).toEqual(['grant-1']);
    expect((await service.list(listGrantsQuery.parse({ granted_by_email: EDITOR_EMAIL }))).items.map((g) => g.id)).toEqual(['grant-1']);
    // Both the id and the email apply (AND): a user_id of another person gives nothing.
    expect((await service.list(listGrantsQuery.parse({ user_id: ADMIN, user_email: LEARNER_EMAIL }))).items).toEqual([]);
  });

  it('§5.2: the page token is bound to the email filters', async () => {
    const { service } = setup({ grants: [{}, { createdAt: new Date(NOW.getTime() - 9 * DAY) }] });
    const first = await service.list(listGrantsQuery.parse({ user_email: LEARNER_EMAIL, page_size: '1' }));
    expect(first.next_page_token).not.toBeNull();
    expect(await problem(service.list({ ...listGrantsQuery.parse({ page_size: '1' }), page_token: first.next_page_token! })))
      .toEqual({ status: 400, type: 'validation-failed' });
    const second = await service.list({ ...listGrantsQuery.parse({ user_email: LEARNER_EMAIL, page_size: '1' }), page_token: first.next_page_token! });
    expect(second.items.map((g) => g.id)).toEqual(['grant-2']);
  });

  it('listGrantsQuery accepts user_email and granted_by_email up to 320 characters', () => {
    expect(listGrantsQuery.safeParse({ user_email: 'a@b.c', granted_by_email: 'x@y.z' }).success).toBe(true);
    expect(listGrantsQuery.safeParse({ user_email: 'x'.repeat(321) }).success).toBe(false);
    expect(listGrantsQuery.safeParse({ granted_by_email: 'x'.repeat(321) }).success).toBe(false);
  });
});
