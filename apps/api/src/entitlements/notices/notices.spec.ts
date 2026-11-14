import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { PAYMENT_MAIL_SHARE } from '../../common/mail/mail-budget.service.js';
import type { GrantSource, PrepaidSource } from '../rules/plan-rules.js';
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

type Period = { id: string; userId: string; startsAt: Date; endsAt: Date; revokedAt: Date | null };
type Receipt = { reference: string; order: { periodMonths: number; amountMinor: bigint; description: string }; period: { startsAt: Date; endsAt: Date } | null };

function setup(opts: {
  subs?: Sub[]; renewalDays?: number | null; budget?: boolean; verified?: boolean; send?: (to: string) => Promise<void>;
  periods?: Period[]; grants?: Array<{ userId: string; startsAt: Date; endsAt: Date }>; receipts?: Record<string, Receipt>;
} = {}) {
  const subs = opts.subs ?? [];
  const periods = opts.periods ?? [];
  const grants = opts.grants ?? [];
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
    prepaidPeriod: {
      findUnique: async ({ where }: { where: { id: string } }) => periods.find((p) => p.id === where.id) ?? null,
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
    prepaidPeriod: {
      findMany: async ({ where }: { where: { revokedAt: null; endsAt: { gt: Date; lte: Date } } }) => periods
        .filter((p) => p.revokedAt === null && inRange(p.endsAt, where.endsAt))
        .map((p) => ({ id: p.id, userId: p.userId, endsAt: p.endsAt })),
    },
    billingOrderPayment: {
      findUnique: async ({ where }: { where: { id: string } }) => opts.receipts?.[where.id] ?? null,
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
  const settings = { get: vi.fn(async () => ({ entitlements: { trialReminderDaysBefore: 2, renewalNoticeDaysBefore: opts.renewalDays ?? 7 } })) };
  const identity = {
    verifiedEmails: vi.fn(async (ids: string[]) => new Map(opts.verified === false ? [] : ids.map((id) => [id, 'lan@example.com']))),
    getProfile: vi.fn(async (id: string) => ({ id, native_language: 'en', timezone: 'Asia/Ho_Chi_Minh' })),
  };
  const budget = { tryConsume: vi.fn(async () => opts.budget ?? true) };
  const sent: Array<{ to: string; subject: string; text: string; html?: string }> = [];
  const mailer = {
    send: vi.fn(async (msg: { to: string; subject: string; text: string; html?: string }) => {
      calls.push('send');
      if (opts.send) await opts.send(msg.to);
      sent.push(msg);
    }),
  };
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => logs.push(entry) });
  const clock = new FakeClock(NOW);
  // The sources the Pro run is read from: the learner's grants and live prepaid periods (the real repository's shape).
  const sourcesOf = (userId: string, now: Date) => ({
    subscriptions: [],
    grants: grants.filter((g) => g.userId === userId && g.endsAt > now).map((g) => ({ kind: 'plan', startsAt: g.startsAt, endsAt: g.endsAt, revokedAt: null }) as unknown as GrantSource),
    prepaidPeriods: periods.filter((p) => p.userId === userId && p.revokedAt === null && p.endsAt > now)
      .map((p) => ({ id: p.id, startsAt: p.startsAt, endsAt: p.endsAt, revokedAt: p.revokedAt }) as unknown as PrepaidSource),
  });
  const sources = {
    load: vi.fn(async (_db: unknown, userId: string, now: Date) => sourcesOf(userId, now)),
    loadMany: vi.fn(async (_db: unknown, userIds: string[], now: Date) => new Map(userIds.map((id) => [id, sourcesOf(id, now)]))),
  };
  const config = { learnerAppUrl: 'https://app.wordmet.com/', supportEmail: 'help@example.com' };
  const planner = new NoticePlanner(prisma as never, settings as never, sources as never);
  const scheduler = { register: vi.fn() };
  const sender = new NoticeSender(prisma as never, clock, planner, identity as never, budget as never, mailer as never,
    scheduler as never, logger, sources as never, config as never);
  return { planner, sender, notices, subs, periods, grants, sent, logs, budget, mailer, calls, lockedByOther, scheduler, sources };
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

  it('Q8: renewal_notice is always on; at 7 days a renewal in 6.5 days gets a row, one in 8 days not yet', async () => {
    const { planner, notices } = setup({ subs: [active({ id: 'near', currentPeriodEnd: plus(6.5) }), active({ id: 'far', currentPeriodEnd: plus(8) })] });
    await planner.plan(NOW);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: 'renewal_notice', subjectKey: 'near', windowEndsAt: plus(6.5), dueAt: plus(-0.5) });
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

// Review of design §3.10: the email for the last prepaid period of a learner, and the receipt of every payment that opens one.
const END = new Date('2026-11-26T17:00:00.000Z'); // 27/11 00:00 in Vietnam, 6.6 days after NOW: the last covered day is 26/11
const period = (fields: Partial<Period> = {}): Period => ({
  id: 'per-1', userId: USER, startsAt: new Date('2026-10-27T17:00:00.000Z'), endsAt: END, revokedAt: null, ...fields,
});

describe('NoticePlanner.plan: expiry_notice (design §3.10)', () => {
  it('LB1A7: the last period of Lan ends within 7 days → one row (subject = the period, period_key = ends_at, window ends at ends_at); a second run adds none', async () => {
    const { planner, notices } = setup({ periods: [period()] });
    await planner.plan(NOW);
    await planner.plan(NOW);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      kind: 'expiry_notice', subjectKey: 'per-1', periodKey: END.toISOString(), state: 'pending', recipientUserId: USER, userId: USER,
      windowEndsAt: END, dueAt: new Date(END.getTime() - 7 * DAY),
    });
  });

  it('a period ending in 8 days gets no row yet; neither does a revoked one, nor one already over', async () => {
    const { planner, notices } = setup({ periods: [
      period({ id: 'far', endsAt: plus(8) }), period({ id: 'revoked', revokedAt: plus(-1) }), period({ id: 'over', endsAt: plus(-1) }),
    ] });
    await planner.plan(NOW);
    expect(notices).toEqual([]);
  });

  it('the setting renewal_notice_days_before is shared: at 9 days a period ending in 8 days gets its row', async () => {
    const { planner, notices } = setup({ renewalDays: 9, periods: [period({ endsAt: plus(8) })] });
    await planner.plan(NOW);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ dueAt: plus(-1), windowEndsAt: plus(8) });
  });

  it('LB1A2: a following period that starts where this one ends covers it → no row (and the follower, ending later, is not due yet)', async () => {
    const { planner, notices } = setup({ periods: [period(), period({ id: 'per-2', startsAt: END, endsAt: plus(37) })] });
    await planner.plan(NOW);
    expect(notices).toEqual([]);
  });

  it('LB1E43: a Pro grant that starts where the period ends covers it too → no row; a grant with a gap does not', async () => {
    const covered = setup({ periods: [period()], grants: [{ userId: USER, startsAt: END, endsAt: plus(30) }] });
    await covered.planner.plan(NOW);
    expect(covered.notices).toEqual([]);
    const gap = setup({ periods: [period()], grants: [{ userId: USER, startsAt: new Date(END.getTime() + DAY), endsAt: plus(30) }] });
    await gap.planner.plan(NOW);
    expect(gap.notices).toHaveLength(1);
  });

  it('two learners each get their own row', async () => {
    const { planner, notices } = setup({ periods: [period(), period({ id: 'per-b', userId: 'u-2' })] });
    await planner.plan(NOW);
    expect(notices.map((n) => n.recipientUserId).sort()).toEqual(['u-2', USER].sort());
  });
});

describe('NoticeSender.send: expiry_notice and payment_receipt (design §3.10)', () => {
  it('LB1A7: a due expiry_notice goes out in the learner language with the last covered day and the plans link, within the 95% ceiling', async () => {
    const { planner, sender, notices, sent, budget } = setup({ periods: [period()] });
    await planner.plan(new Date(END.getTime() - 7 * DAY));
    await sender.send(NOW);
    expect(budget.tryConsume).toHaveBeenCalledWith({ ceiling: PAYMENT_MAIL_SHARE });
    expect(notices[0]).toMatchObject({ state: 'sent', sentAt: NOW });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'lan@example.com', subject: 'Your Wordmet Pro plan ends soon' });
    expect(sent[0].text).toContain('November 26, 2026');
    expect(sent[0].text).toContain('https://app.wordmet.com/en/app/plans');
    expect(sent[0].text).not.toMatch(/App Store|Google Play|auto-renew|renews/i);
    expect(sent[0].html).toContain('href="https://app.wordmet.com/en/app/plans"');
  });

  it('LB1E43: a period that follows was bought after planning → skipped (covered) at send time, nothing sent', async () => {
    const ctx = setup({ periods: [period()] });
    await ctx.planner.plan(NOW);
    ctx.periods.push(period({ id: 'per-2', startsAt: END, endsAt: plus(37) }));
    await ctx.sender.send(NOW);
    expect(ctx.notices[0].state).toBe('skipped');
    expect(ctx.sent).toEqual([]);
    expect(ctx.budget.tryConsume).not.toHaveBeenCalled();
    expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'entitlement_notice_skipped', reason: 'covered' }));
  });

  it('a period revoked or gone since planning → skipped, nothing sent', async () => {
    for (const change of [(ctx: ReturnType<typeof setup>) => { ctx.periods[0].revokedAt = NOW; }, (ctx: ReturnType<typeof setup>) => { ctx.periods.length = 0; }]) {
      const ctx = setup({ periods: [period()] });
      await ctx.planner.plan(NOW);
      change(ctx);
      await ctx.sender.send(NOW);
      expect(ctx.notices[0].state).toBe('skipped');
      expect(ctx.sent).toEqual([]);
      expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'entitlement_notice_skipped', reason: 'period-gone' }));
    }
  });

  it('the claim does not mistake the new kinds for a trial email: no subscription with that id exists and the email still goes out', async () => {
    const ctx = setup({ periods: [period()] });
    await ctx.planner.plan(NOW);
    await ctx.sender.send(NOW);
    expect(ctx.logs).not.toContainEqual(expect.objectContaining({ reason: 'trial-denied' }));
    expect(ctx.notices[0].state).toBe('sent');
  });

  it('LB1E44: the budget refused → failed, attempts + 1, retried the next run', async () => {
    const ctx = setup({ periods: [period()], budget: false });
    await ctx.planner.plan(NOW);
    await ctx.sender.send(NOW);
    expect(ctx.notices[0]).toMatchObject({ state: 'failed', attempts: 1, lastErrorAt: NOW });
    ctx.budget.tryConsume.mockResolvedValue(true);
    await ctx.sender.send(new Date(NOW.getTime() + 3_600_000));
    expect(ctx.notices[0].state).toBe('sent');
  });

  const receiptRow = (over: Partial<Notice> = {}): Notice => ({
    id: 'r-1', userId: USER, recipientUserId: USER, kind: 'payment_receipt', subjectKey: 'pay-1', periodKey: '2026-11-20T03:00:00.000Z', state: 'pending',
    dueAt: NOW, windowEndsAt: plus(7), attempts: 0, lastErrorAt: null, sentAt: null, ...over,
  });
  const RECEIPTS = {
    'pay-1': {
      reference: 'FT26309ABC', order: { periodMonths: 3, amountMinor: 199000n, description: 'WM0XSNJGK' },
      period: { startsAt: new Date('2026-11-20T03:00:00.000Z'), endsAt: END },
    },
  };

  it('a payment_receipt names the period, the amount, the transfer note, the reference and both days, in the learner language', async () => {
    const ctx = setup({ receipts: RECEIPTS });
    ctx.notices.push(receiptRow());
    await ctx.sender.send(NOW);
    expect(ctx.notices[0]).toMatchObject({ state: 'sent', sentAt: NOW });
    expect(ctx.sent).toHaveLength(1);
    expect(ctx.sent[0].subject).toBe('Your Wordmet Pro receipt');
    for (const part of ['3 months', '199,000', 'WM0XSNJGK', 'FT26309ABC', 'November 20, 2026', 'November 26, 2026', 'No refunds', 'https://app.wordmet.com/en/app/plans']) {
      expect(ctx.sent[0].text, part).toContain(part);
    }
    expect(ctx.sent[0].text).not.toMatch(/App Store|Google Play|auto-renew|renews/i);
    expect(ctx.budget.tryConsume).toHaveBeenCalledWith({ ceiling: PAYMENT_MAIL_SHARE });
    // The HTML twin: the plans button, the footer links from the app origin without its trailing slash, and the configured support address.
    expect(ctx.sent[0].html).toContain('href="https://app.wordmet.com/en/app/plans"');
    expect(ctx.sent[0].html).toContain('href="https://app.wordmet.com/en/privacy"');
    expect(ctx.sent[0].html).toContain('href="mailto:help@example.com"');
  });

  it('a receipt whose payment (or period) is gone → skipped, nothing sent; one past its 7-day window → skipped', async () => {
    const gone = setup({ receipts: {} });
    gone.notices.push(receiptRow());
    await gone.sender.send(NOW);
    expect(gone.notices[0].state).toBe('skipped');
    expect(gone.sent).toEqual([]);
    expect(gone.logs).toContainEqual(expect.objectContaining({ event: 'entitlement_notice_skipped', reason: 'payment-gone' }));
    const noPeriod = setup({ receipts: { 'pay-1': { ...RECEIPTS['pay-1'], period: null } } });
    noPeriod.notices.push(receiptRow());
    await noPeriod.sender.send(NOW);
    expect(noPeriod.notices[0].state).toBe('skipped');
    const late = setup({ receipts: RECEIPTS });
    late.notices.push(receiptRow());
    await late.sender.send(plus(8));
    expect(late.notices[0].state).toBe('skipped');
    expect(late.logs).toContainEqual(expect.objectContaining({ event: 'entitlement_notice_skipped', reason: 'window-passed' }));
  });

  it('a receipt is not an expiry notice: it is not skipped because Pro goes on after the period (a later period exists)', async () => {
    const ctx = setup({ receipts: RECEIPTS, periods: [period(), period({ id: 'per-2', startsAt: END, endsAt: plus(37) })] });
    ctx.notices.push(receiptRow());
    await ctx.sender.send(NOW);
    expect(ctx.notices[0].state).toBe('sent');
  });

  it('logs of the new kinds carry the notice id and kind, never the address, the reference or the transfer note', async () => {
    const ctx = setup({ receipts: RECEIPTS });
    ctx.notices.push(receiptRow());
    await ctx.sender.send(NOW);
    const text = JSON.stringify(ctx.logs);
    expect(text).toContain('payment_receipt');
    for (const secret of ['lan@example.com', 'FT26309ABC', 'WM0XSNJGK']) expect(text).not.toContain(secret);
  });
});
