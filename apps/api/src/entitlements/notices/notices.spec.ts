import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { PAYMENT_MAIL_SHARE } from '../../common/mail/mail-budget.service.js';
import { NoticePlanner } from './notice-planner.service.js';
import { NoticeSender } from './notice-sender.service.js';

const NOW = new Date('2026-11-20T03:00:00.000Z');
const DAY = 86_400_000;
const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const plus = (days: number) => new Date(NOW.getTime() + days * DAY);

type Sub = { id: string; userId: string; status: string; trialDenied: boolean; cancelAtPeriodEnd: boolean; trialEndsAt: Date | null; currentPeriodEnd: Date | null };
type Notice = {
  id: string; userId: string | null; recipientUserId: string; kind: string; subjectKey: string; periodKey: string; state: string;
  dueAt: Date; windowEndsAt: Date; attempts: number; lastErrorAt: Date | null; sentAt: Date | null;
};

function inRange(value: Date | null, range: { gt: Date; lte: Date }): boolean {
  return value !== null && value > range.gt && value <= range.lte;
}

function setup(opts: { subs?: Sub[]; renewalDays?: number | null; budget?: boolean; verified?: boolean; send?: (to: string) => Promise<void> } = {}) {
  const subs = opts.subs ?? [];
  const notices: Notice[] = [];
  const lockedByOther = new Set<string>();
  const calls: string[] = [];
  let seq = 0;
  const tx = {
    $queryRaw: async (_s: TemplateStringsArray, now: Date) => {
      const due = notices
        .filter((n) => !lockedByOther.has(n.id) && n.dueAt <= now
          && (n.state === 'pending' || (n.state === 'failed' && (n.lastErrorAt === null || n.lastErrorAt < now))))
        .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
      return due.slice(0, 1).map((n) => ({
        id: n.id, kind: n.kind, subject_key: n.subjectKey, recipient_user_id: n.recipientUserId, period_key: n.periodKey,
        window_ends_at: n.windowEndsAt,
      }));
    },
    entitlementNotice: {
      update: async ({ where, data }: { where: { id: string }; data: Partial<Notice> }) => {
        calls.push(`${where.id}:${data.state}`);
        Object.assign(notices.find((n) => n.id === where.id)!, data);
      },
    },
    subscription: {
      findUnique: async ({ where }: { where: { id: string } }) => subs.find((s) => s.id === where.id) ?? null,
    },
  };
  const prisma = {
    subscription: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => subs.filter((s) => {
        if (s.status !== where.status) return false;
        if ('trialDenied' in where && s.trialDenied !== where.trialDenied) return false;
        if ('cancelAtPeriodEnd' in where && s.cancelAtPeriodEnd !== where.cancelAtPeriodEnd) return false;
        if (where.trialEndsAt && !inRange(s.trialEndsAt, where.trialEndsAt as { gt: Date; lte: Date })) return false;
        if (where.currentPeriodEnd && !inRange(s.currentPeriodEnd, where.currentPeriodEnd as { gt: Date; lte: Date })) return false;
        return true;
      }),
    },
    entitlementNotice: {
      createMany: async ({ data, skipDuplicates }: { data: Array<Omit<Notice, 'id' | 'attempts' | 'lastErrorAt' | 'sentAt'>>; skipDuplicates: boolean }) => {
        expect(skipDuplicates).toBe(true);
        let count = 0;
        for (const row of data) {
          const exists = notices.some((n) => n.kind === row.kind && n.subjectKey === row.subjectKey && n.periodKey === row.periodKey
            && n.recipientUserId === row.recipientUserId);
          if (exists) continue;
          notices.push({ ...row, id: `n-${++seq}`, attempts: 0, lastErrorAt: null, sentAt: null });
          count += 1;
        }
        return { count };
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Notice> & { attempts?: { increment: number } } }) => {
        const row = notices.find((n) => n.id === where.id)!;
        const { attempts, ...rest } = data;
        calls.push(`${where.id}:${rest.state}`);
        Object.assign(row, rest);
        if (attempts) row.attempts += attempts.increment;
      },
    },
    $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
  };
  const settings = { get: vi.fn(async () => ({ entitlements: { trialReminderDaysBefore: 2, renewalNoticeDaysBefore: opts.renewalDays ?? null } })) };
  const identity = {
    verifiedEmails: vi.fn(async (ids: string[]) => new Map(opts.verified === false ? [] : ids.map((id) => [id, 'lan@example.com']))),
    getProfile: vi.fn(async (id: string) => ({ id, native_language: 'en', timezone: 'Asia/Ho_Chi_Minh' })),
  };
  const budget = { tryConsume: vi.fn(async () => opts.budget ?? true) };
  const sent: Array<{ to: string; subject: string; text: string }> = [];
  const mailer = {
    send: vi.fn(async (msg: { to: string; subject: string; text: string }) => {
      calls.push('send');
      if (opts.send) await opts.send(msg.to);
      sent.push(msg);
    }),
  };
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => logs.push(entry) });
  const clock = new FakeClock(NOW);
  const planner = new NoticePlanner(prisma as never, settings as never);
  const scheduler = { register: vi.fn() };
  const sender = new NoticeSender(prisma as never, clock, planner, identity as never, budget as never, mailer as never,
    scheduler as never, logger);
  return { planner, sender, notices, subs, sent, logs, budget, mailer, calls, lockedByOther, scheduler };
}

const trialing = (fields: Partial<Sub> = {}): Sub => ({
  id: 'sub-t', userId: USER, status: 'trialing', trialDenied: false, cancelAtPeriodEnd: false, trialEndsAt: plus(1.5), currentPeriodEnd: plus(1.5), ...fields,
});
const active = (fields: Partial<Sub> = {}): Sub => ({
  id: 'sub-a', userId: USER, status: 'active', trialDenied: false, cancelAtPeriodEnd: false, trialEndsAt: null, currentPeriodEnd: plus(8), ...fields,
});

describe('NoticePlanner.plan (design §14, R9)', () => {
  it('B5#5: a trial ending in 2 days → one trial_reminder row; a second plan run adds none', async () => {
    const { planner, notices } = setup({ subs: [trialing()] });
    await planner.plan(NOW);
    await planner.plan(NOW);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      kind: 'trial_reminder', subjectKey: 'sub-t', periodKey: plus(1.5).toISOString(), state: 'pending',
      recipientUserId: USER, userId: USER, windowEndsAt: plus(1.5), dueAt: plus(-0.5),
    });
  });

  it('a trial ending in 3 days, a denied trial, or an ended trial gets no reminder yet', async () => {
    const { planner, notices } = setup({ subs: [
      trialing({ id: 'far', trialEndsAt: plus(3) }), trialing({ id: 'denied', trialDenied: true }), trialing({ id: 'past', trialEndsAt: plus(-1) }),
    ] });
    await planner.plan(NOW);
    expect(notices).toEqual([]);
  });

  it('D29: renewal_notice is never planned while the setting is null', async () => {
    const { planner, notices } = setup({ subs: [active({ currentPeriodEnd: plus(1) })] });
    await planner.plan(NOW);
    expect(notices).toEqual([]);
  });

  it('renewal_notice with the setting at 9 → one row 9 days before current_period_end, none for a cancelled subscription', async () => {
    const { planner, notices } = setup({ renewalDays: 9, subs: [active(), active({ id: 'cancelled', cancelAtPeriodEnd: true })] });
    await planner.plan(NOW);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: 'renewal_notice', subjectKey: 'sub-a', periodKey: plus(8).toISOString(), dueAt: plus(-1), windowEndsAt: plus(8) });
  });
});

describe('NoticeSender.send (design §14, R9, R18)', () => {
  async function planned(opts: Parameters<typeof setup>[0] = {}) {
    const ctx = setup({ subs: [trialing()], ...opts });
    await ctx.planner.plan(NOW);
    return ctx;
  }

  it('sends a due trial reminder in the recipient language within the 95% ceiling; sent, sent_at', async () => {
    const { sender, notices, sent, budget } = await planned();
    await sender.send(NOW);
    expect(budget.tryConsume).toHaveBeenCalledWith({ ceiling: PAYMENT_MAIL_SHARE });
    expect(sent).toEqual([expect.objectContaining({ to: 'lan@example.com', subject: 'Your Wordmet Pro trial ends soon' })]);
    expect(notices[0]).toMatchObject({ state: 'sent', sentAt: NOW });
  });

  it('B5E61: budget refused → failed, attempts + 1, not retried in the same run; retried next run inside the window', async () => {
    const ctx = await planned({ budget: false });
    await ctx.sender.send(NOW);
    expect(ctx.notices[0]).toMatchObject({ state: 'failed', attempts: 1, lastErrorAt: NOW });
    expect(ctx.budget.tryConsume).toHaveBeenCalledTimes(1);
    ctx.budget.tryConsume.mockResolvedValue(true);
    await ctx.sender.send(new Date(NOW.getTime() + 3_600_000));
    expect(ctx.notices[0].state).toBe('sent');
  });

  it('window passed → skipped, nothing sent', async () => {
    const { sender, notices, sent, logs } = await planned();
    await sender.send(plus(2));
    expect(notices[0].state).toBe('skipped');
    expect(sent).toEqual([]);
    expect(logs).toContainEqual(expect.objectContaining({ event: 'entitlement_notice_skipped', reason: 'window-passed' }));
  });

  it('D30: a trial email for a subscription denied since planning → skipped', async () => {
    const ctx = await planned();
    ctx.subs[0].trialDenied = true;
    await ctx.sender.send(NOW);
    expect(ctx.notices[0].state).toBe('skipped');
    expect(ctx.sent).toEqual([]);
  });

  it('no verified address → skipped, no budget spent', async () => {
    const { sender, notices, budget } = await planned({ verified: false });
    await sender.send(NOW);
    expect(notices[0].state).toBe('skipped');
    expect(budget.tryConsume).not.toHaveBeenCalled();
  });

  it('B5E60: rows already claimed by another run are not sent twice', async () => {
    const { sender, sent, lockedByOther, notices } = await planned();
    lockedByOther.add(notices[0].id);
    await sender.send(NOW);
    expect(sent).toEqual([]);
  });

  it.each([
    ['unknown', Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }), 'sending', 0],
    ['transient', Object.assign(new Error('try later'), { responseCode: 451 }), 'failed', 1],
    ['permanent', Object.assign(new Error('no such user'), { responseCode: 550 }), 'skipped', 0],
  ])('a %s send error → %s', async (_kind, error, state, attempts) => {
    const { sender, notices } = await planned({ send: async () => { throw error; } });
    await sender.send(NOW);
    expect(notices[0]).toMatchObject({ state, attempts });
  });

  it('a row is set sending only right before its own send: a throw after the first send leaves the other due rows pending', async () => {
    const ctx = setup({ subs: [trialing({ id: 'one' }), trialing({ id: 'two', userId: 'u-2' })] });
    await ctx.planner.plan(NOW);
    ctx.mailer.send.mockImplementationOnce(async () => { ctx.calls.push('send'); }).mockImplementationOnce(async () => {
      throw new Error('process killed');
    });
    ctx.budget.tryConsume.mockImplementationOnce(async () => true).mockImplementationOnce(async () => { throw new Error('db down'); });
    await expect(ctx.sender.send(NOW)).rejects.toThrow('db down');
    expect(ctx.notices.map((n) => n.state)).toEqual(['sent', 'sending']);
    const third = setup({ subs: [trialing({ id: 'a' }), trialing({ id: 'b', userId: 'u-2' }), trialing({ id: 'c', userId: 'u-3' })] });
    await third.planner.plan(NOW);
    third.budget.tryConsume.mockImplementationOnce(async () => { throw new Error('db down'); });
    await expect(third.sender.send(NOW)).rejects.toThrow('db down');
    expect(third.notices.map((n) => n.state)).toEqual(['sending', 'pending', 'pending']);
  });

  it('one job run plans and then sends a due trial reminder', async () => {
    const ctx = setup({ subs: [trialing()] });
    ctx.sender.onModuleInit();
    const [name, job] = ctx.scheduler.register.mock.calls[0] as [string, (now: Date) => Promise<void>];
    expect(name).toBe('entitlement-notices');
    expect(ctx.scheduler.register).toHaveBeenCalledTimes(1);
    await job(NOW);
    expect(ctx.notices[0].state).toBe('sent');
  });

  it('B5E62: send and failure logs carry the notice id and the error kind, never the address', async () => {
    const ok = await planned();
    await ok.sender.send(NOW);
    const failing = await planned({ send: async () => { throw Object.assign(new Error('lan@example.com refused'), { responseCode: 451 }); } });
    await failing.sender.send(NOW);
    const logs = [...ok.logs, ...failing.logs];
    expect(logs).toContainEqual(expect.objectContaining({ event: 'entitlement_notice_sent', notice_id: ok.notices[0].id, kind: 'trial_reminder' }));
    expect(logs).toContainEqual(expect.objectContaining({ event: 'entitlement_notice_failed', error_kind: 'transient' }));
    expect(JSON.stringify(logs)).not.toContain('lan@example.com');
  });
});
