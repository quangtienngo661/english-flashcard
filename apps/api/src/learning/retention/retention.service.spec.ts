import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { RetentionService } from './retention.service.js';

const NOW = new Date('2026-12-15T03:00:00Z'); // 10:00 on 15/12 in Vietnam
const day = (date: string) => new Date(`${date}T00:00:00.000Z`);

type Row = { userId: string; localDate: Date };
type Where = { userId?: { in: string[] }; localDate?: { gte: Date; lte: Date } };
const inWhere = (row: Row, where?: Where) => (where?.userId === undefined || where.userId.in.includes(row.userId))
  && (where?.localDate === undefined || (row.localDate >= where.localDate.gte && row.localDate <= where.localDate.lte));

// Lan registered Sunday 23:30 Vietnam time, Minh Monday 00:00 (17:00 UTC on the Sunday), `e1` is an editor, `u1` never verified.
const REGISTRATIONS = [
  { userId: 'lan', createdAt: new Date('2026-11-01T16:30:00Z'), emailVerified: true, staff: false },
  { userId: 'minh', createdAt: new Date('2026-11-01T17:00:00Z'), emailVerified: true, staff: false },
  { userId: 'e1', createdAt: new Date('2026-11-01T18:00:00Z'), emailVerified: true, staff: true },
  { userId: 'u1', createdAt: new Date('2026-11-01T19:00:00Z'), emailVerified: false, staff: false },
];
const ROWS: Row[] = [
  ...['2026-11-03', '2026-11-05', '2026-11-06', '2026-12-10'].map((date) => ({ userId: 'lan', localDate: day(date) })),
  { userId: 'minh', localDate: day('2026-11-09') },
  { userId: 'e1', localDate: day('2026-11-08') }, { userId: 'e1', localDate: day('2026-12-14') },
  { userId: 'x', localDate: day('2026-12-12') },
];

function setup(options: { windowDays?: number; registrations?: typeof REGISTRATIONS; rows?: Row[]; staff?: string[] } = {}) {
  const rows = options.rows ?? ROWS;
  const settings = structuredClone(SETTINGS_DEFAULTS);
  settings.learning.activeWindowDays = options.windowDays ?? 7;
  const activity = {
    findMany: vi.fn(async ({ where }: { where?: Where; select: unknown }) => rows.filter((row) => inWhere(row, where))),
    groupBy: vi.fn(async ({ where }: { by: string[]; where?: Where }) => (
      [...new Set(rows.filter((row) => inWhere(row, where)).map((row) => row.userId))].map((userId) => ({ userId })))),
  };
  const prisma = { learningActivityDay: activity } as unknown as PrismaClient;
  const registrations = vi.fn(async () => options.registrations ?? REGISTRATIONS);
  const staffUserIds = vi.fn(async () => options.staff ?? ['e1']);
  const identity = { registrations, staffUserIds } as unknown as IdentityService;
  const settingsService = { get: vi.fn(async () => settings) } as unknown as SettingsService;
  return { service: new RetentionService(prisma, identity, settingsService), activity, registrations, staffUserIds };
}

describe('RetentionService.report (nhóm B M6, design §10)', () => {
  it('Review focus 3: Sunday 23:30 Vietnam time is in the first cohort, Monday 00:00 in the next; staff and unverified are left out', async () => {
    const { service, registrations, activity } = setup();
    const view = await service.report({ from: '2026-10-28', to: '2026-11-03' }, NOW);
    expect(registrations).toHaveBeenCalledExactlyOnceWith(new Date('2026-10-25T17:00:00.000Z'), new Date('2026-11-08T17:00:00.000Z'));
    expect(view).toEqual({
      from: '2026-10-26', to: '2026-11-03', window_days: 7, today: { date: '2026-12-15', active: 2, stopped: 1 },
      cohorts: [
        { week_start: '2026-10-26', size: 1, d7: 1, d30: 0 },
        { week_start: '2026-11-02', size: 1, d7: 1, d30: 0 },
      ],
    });
    // The members' rows: only learners that count, from D7's window start to the last D30.
    expect(activity.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: { in: ['lan', 'minh'] }, localDate: { gte: day('2026-10-27'), lte: day('2026-12-08') } },
      select: { userId: true, localDate: true },
    });
  });

  it('today: the window read covers [today − 6, today], "ever" has no filter, and staff are taken out of both numbers', async () => {
    const { service, activity, staffUserIds } = setup();
    const { today } = await service.report({ from: '2026-10-28', to: '2026-11-03' }, NOW);
    expect(activity.groupBy).toHaveBeenCalledTimes(2);
    expect(activity.groupBy).toHaveBeenCalledWith({ by: ['userId'], where: { localDate: { gte: day('2026-12-09'), lte: day('2026-12-15') } } });
    expect(activity.groupBy).toHaveBeenCalledWith({ by: ['userId'] });
    expect(staffUserIds).toHaveBeenCalledOnce();
    // Window: lan (10/12), x (12/12), e1 (14/12); ever also has minh; e1 is staff.
    expect(today).toEqual({ date: '2026-12-15', active: 2, stopped: 1 });
  });

  it('Review focus 5: a window of 1 day changes today\'s window read and D7 (Lan did nothing on 08/11) but not what a day-exact D7 still counts', async () => {
    const { service, activity } = setup({ windowDays: 1 });
    const view = await service.report({ from: '2026-10-28', to: '2026-11-03' }, NOW);
    expect(view.window_days).toBe(1);
    expect(view.cohorts).toEqual([
      { week_start: '2026-10-26', size: 1, d7: 0, d30: 0 },
      { week_start: '2026-11-02', size: 1, d7: 1, d30: 0 },
    ]);
    expect(activity.groupBy).toHaveBeenCalledWith({ by: ['userId'], where: { localDate: { gte: day('2026-12-15'), lte: day('2026-12-15') } } });
    expect(activity.findMany.mock.calls[0][0].where?.localDate).toEqual({ gte: day('2026-11-02'), lte: day('2026-12-08') });
    expect(view.today).toEqual({ date: '2026-12-15', active: 0, stopped: 3 });
  });

  it('Review focus 5: a window of 60 days reaches back, so Lan is still "đang học" on D30 and today, and nothing is stored', async () => {
    const { service, activity } = setup({ windowDays: 60 });
    const view = await service.report({ from: '2026-10-28', to: '2026-11-03' }, NOW);
    expect(view.window_days).toBe(60);
    // D30 of Lan (01/12): the window [03/10, 01/12] holds her days of November; Minh's D30 (02/12): [04/10, 02/12] holds 09/11.
    expect(view.cohorts).toEqual([
      { week_start: '2026-10-26', size: 1, d7: 1, d30: 1 },
      { week_start: '2026-11-02', size: 1, d7: 1, d30: 1 },
    ]);
    expect(activity.findMany.mock.calls[0][0].where?.localDate).toEqual({ gte: day('2026-09-04'), lte: day('2026-12-08') });
    expect(activity.groupBy).toHaveBeenCalledWith({ by: ['userId'], where: { localDate: { gte: day('2026-10-17'), lte: day('2026-12-15') } } });
    expect(view.today).toEqual({ date: '2026-12-15', active: 3, stopped: 0 });
  });

  it('no member in the range: no members\' read, the weeks are listed with size 0 and null (never a rate)', async () => {
    const { service, activity } = setup({ registrations: [] });
    const view = await service.report({ from: '2026-10-28', to: '2026-11-03' }, NOW);
    expect(activity.findMany).not.toHaveBeenCalled();
    expect(view.cohorts).toEqual([
      { week_start: '2026-10-26', size: 0, d7: null, d30: null },
      { week_start: '2026-11-02', size: 0, d7: null, d30: null },
    ]);
  });

  it('only staff and unverified accounts registered: still no members\' read', async () => {
    const { service, activity } = setup({ registrations: REGISTRATIONS.filter(({ userId }) => userId === 'e1' || userId === 'u1') });
    const view = await service.report({ from: '2026-10-28', to: '2026-11-03' }, NOW);
    expect(activity.findMany).not.toHaveBeenCalled();
    expect(view.cohorts.map(({ size }) => size)).toEqual([0, 0]);
  });

  it('a member who never learned stays in the size with D7 and D30 of 0 (B45); a cohort not old enough is null (B46)', async () => {
    const { service } = setup({ rows: [] });
    const old = await service.report({ from: '2026-10-28', to: '2026-11-03' }, NOW);
    expect(old.cohorts).toEqual([
      { week_start: '2026-10-26', size: 1, d7: 0, d30: 0 }, { week_start: '2026-11-02', size: 1, d7: 0, d30: 0 },
    ]);
    // A week's D7 is known from week_start + 13 (08/11 and 15/11), its D30 from week_start + 36 (01/12 and 08/12): on 14/11 only the first D7.
    const young = await service.report({ from: '2026-10-28', to: '2026-11-03' }, new Date('2026-11-14T03:00:00Z'));
    expect(young.cohorts).toEqual([
      { week_start: '2026-10-26', size: 1, d7: 0, d30: null }, { week_start: '2026-11-02', size: 1, d7: null, d30: null },
    ]);
  });

  it('the day boundary is Vietnam time: "today" at 17:00 UTC is already the next Vietnamese day', async () => {
    const { service } = setup();
    const view = await service.report({ from: '2026-10-28', to: '2026-11-03' }, new Date('2026-12-14T17:00:00Z'));
    expect(view.today.date).toBe('2026-12-15');
  });

  it('a missing range is the 90 days ending today; the view starts at the Monday of the first day', async () => {
    const { service, registrations } = setup();
    const view = await service.report({}, NOW);
    // 90 days ending 15/12 begin on 17/09 (a Thursday); its Monday is 14/09. The last week begins Monday 14/12.
    expect(view.from).toBe('2026-09-14');
    expect(view.to).toBe('2026-12-15');
    expect(view.cohorts[0].week_start).toBe('2026-09-14');
    expect(view.cohorts.at(-1)?.week_start).toBe('2026-12-14');
    expect(view.cohorts).toHaveLength(14);
    expect(registrations).toHaveBeenCalledExactlyOnceWith(new Date('2026-09-13T17:00:00.000Z'), new Date('2026-12-20T17:00:00.000Z'));
  });

  it('a reversed range is 400 validation-failed and a range over 366 days too, before anything is read', async () => {
    const { service, registrations, activity } = setup();
    await expect(service.report({ from: '2026-11-04', to: '2026-11-03' }, NOW)).rejects.toMatchObject({
      status: 400, problemType: 'validation-failed',
    });
    await expect(service.report({ from: '2025-01-01', to: '2026-11-03' }, NOW)).rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
    expect(registrations).not.toHaveBeenCalled();
    expect(activity.findMany).not.toHaveBeenCalled();
  });

  it('the view holds counts and dates of weeks only: no user id, no e-mail, no registration or learning date of a person', async () => {
    const { service } = setup();
    const view = await service.report({ from: '2026-10-28', to: '2026-11-03' }, NOW);
    const text = JSON.stringify(view);
    for (const secret of ['lan', 'minh', 'e1', 'x"', 'u1', '@', '2026-11-05', '2026-11-09', '16:30', '17:00']) {
      expect(text, secret).not.toContain(secret);
    }
    expect(Object.keys(view)).toEqual(['from', 'to', 'window_days', 'today', 'cohorts']);
    for (const cohort of view.cohorts) expect(Object.keys(cohort)).toEqual(['week_start', 'size', 'd7', 'd30']);
  });
});
