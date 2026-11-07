import { describe, expect, it, vi } from 'vitest';
import { addDays } from '../../common/time/local-date.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { streakAsOf, streakDays } from './streak.js';

const today = '2026-11-07';

describe('streakDays (round C, DC28)', () => {
  it('no study days → 0', () => {
    expect(streakDays([], today)).toBe(0);
  });

  it('today only → 1', () => {
    expect(streakDays(['2026-11-07'], today)).toBe(1);
  });

  it('today not studied yet: the streak counts back from yesterday', () => {
    expect(streakDays(['2026-11-06', '2026-11-05'], today)).toBe(2);
  });

  it('a gap ends the streak', () => {
    expect(streakDays(['2026-11-07', '2026-11-06', '2026-11-04'], today)).toBe(2);
  });

  it('the last study day is two days ago → 0', () => {
    expect(streakDays(['2026-11-05'], today)).toBe(0);
  });

  it('12 days up to yesterday plus today → 13', () => {
    const days = Array.from({ length: 13 }, (_, i) => addDays(today, -i));
    expect(streakDays(days, today)).toBe(13);
    expect(streakDays(days.slice(1), today)).toBe(12);
  });

  it('a date repeated in the list counts once', () => {
    expect(streakDays(['2026-11-07', '2026-11-07', '2026-11-06'], today)).toBe(2);
  });

  it('a date in the future (the zone moved west) is ignored', () => {
    expect(streakDays(['2026-11-08', '2026-11-07', '2026-11-06'], today)).toBe(2);
  });

  it('a long streak across a month and a year boundary', () => {
    const days = Array.from({ length: 1000 }, (_, i) => addDays(today, -i));
    expect(streakDays(days, today)).toBe(1000);
  });
});

describe('streakAsOf', () => {
  const db = (dates: string[]) => {
    const findMany = vi.fn(async (_args: unknown) => dates.map((d) => ({ localDate: new Date(`${d}T00:00:00.000Z`) })));
    return { findMany, client: { learningActivityDay: { findMany } } as unknown as PrismaClient };
  };

  it('reads only the learner\'s study days up to today, newest first, at most 4000', async () => {
    const { findMany, client } = db(['2026-11-07', '2026-11-06']);
    await expect(streakAsOf(client, 'u1', today)).resolves.toEqual({ days: 2, studiedToday: true });
    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 'u1', studied: true, localDate: { lte: new Date('2026-11-07T00:00:00.000Z') } },
      orderBy: { localDate: 'desc' }, take: 4000, select: { localDate: true },
    });
  });

  it('today not studied: the streak stands but studiedToday is false', async () => {
    const { client } = db(['2026-11-06', '2026-11-05']);
    await expect(streakAsOf(client, 'u1', today)).resolves.toEqual({ days: 2, studiedToday: false });
  });

  it('nothing studied → 0 days', async () => {
    const { client } = db([]);
    await expect(streakAsOf(client, 'u1', today)).resolves.toEqual({ days: 0, studiedToday: false });
  });
});
