import { describe, expect, it } from 'vitest';
import { continuousProUntil, lastCoveredDay, periodEnd, type ProSpan } from './period-window.js';

const VN = 'Asia/Ho_Chi_Minh';
const at = (iso: string) => new Date(iso);
const span = (startsAt: string, endsAt: string, revokedAt: string | null = null): ProSpan => ({
  startsAt: at(startsAt), endsAt: at(endsAt), revokedAt: revokedAt === null ? null : at(revokedAt),
});

describe('periodEnd and lastCoveredDay (design §3.7, the five rows of the table)', () => {
  const rows: Array<[string, string, 1 | 3 | 12, string, string]> = [
    // [what Lan does, starts_at, months, ends_at, "Pro tới hết"]
    ['Free, 1 month, money at 05/11/2026 10:02', '2026-11-05T03:02:00Z', 1, '2026-12-05T17:00:00.000Z', '2026-12-05'],
    ['Pro until 06/12 00:00, 12 months', '2026-12-05T17:00:00Z', 12, '2027-12-05T17:00:00.000Z', '2027-12-05'],
    ['Free, 3 months, money at 05/11/2026 10:02', '2026-11-05T03:02:00Z', 3, '2027-02-05T17:00:00.000Z', '2027-02-05'],
    ['Free, 1 month, money at 31/01/2027 10:00 (clamped to 28/02)', '2027-01-31T03:00:00Z', 1, '2027-02-28T17:00:00.000Z', '2027-02-28'],
    ['previous period ended 31/01/2027 00:00, 1 month follows (exact midnight is kept)', '2027-01-30T17:00:00Z', 1, '2027-02-27T17:00:00.000Z', '2027-02-27'],
  ];
  for (const [name, startsAt, months, endsAt, lastDay] of rows) {
    it(name, () => {
      const end = periodEnd(at(startsAt), months, VN);
      expect(end.toISOString()).toBe(endsAt);
      expect(lastCoveredDay(end, VN)).toBe(lastDay);
    });
  }

  it('Review Focus 2: Lan buys at 23:58 on 31/01/2027, 1 month → ends 01/03 00:00, "tới hết 2027-02-28"', () => {
    const end = periodEnd(at('2027-01-31T16:58:00Z'), 1, VN);
    expect(end.toISOString()).toBe('2027-02-28T17:00:00.000Z');
    expect(lastCoveredDay(end, VN)).toBe('2027-02-28');
  });

  it('a start in the last millisecond before midnight still gets the whole next day, one millisecond after midnight too', () => {
    expect(periodEnd(at('2026-11-05T16:59:59.999Z'), 1, VN).toISOString()).toBe('2026-12-05T17:00:00.000Z');
    expect(periodEnd(at('2026-11-05T17:00:00.001Z'), 1, VN).toISOString()).toBe('2026-12-06T17:00:00.000Z');
  });

  it('29/02 of a leap year plus 12 months clamps to 28/02', () => {
    expect(lastCoveredDay(periodEnd(at('2028-02-29T03:00:00Z'), 12, VN), VN)).toBe('2029-02-28');
  });

  it('works in a zone the learner chose (New York, UTC−5 in winter): midnight of the zone, not of Vietnam', () => {
    const end = periodEnd(at('2026-11-05T15:02:00Z'), 1, 'America/New_York');
    expect(end.toISOString()).toBe('2026-12-06T05:00:00.000Z');
    expect(lastCoveredDay(end, 'America/New_York')).toBe('2026-12-05');
  });
});

describe('continuousProUntil (design §3.7)', () => {
  const now = at('2026-11-05T03:02:00Z');

  it('is null with no span', () => {
    expect(continuousProUntil([], now)).toBeNull();
  });

  it('is the end of the span that covers now', () => {
    expect(continuousProUntil([span('2026-11-01T00:00:00Z', '2026-12-05T17:00:00Z')], now)?.toISOString()).toBe('2026-12-05T17:00:00.000Z');
  });

  it('LB1E30: two spans joined end to start give the end of the second', () => {
    const spans = [span('2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z'), span('2026-11-08T00:00:00Z', '2026-12-08T00:00:00Z')];
    expect(continuousProUntil(spans, now)?.toISOString()).toBe('2026-12-08T00:00:00.000Z');
    expect(continuousProUntil([...spans].reverse(), now)?.toISOString()).toBe('2026-12-08T00:00:00.000Z');
  });

  it('a chain of three joined spans is followed to the end', () => {
    const spans = [
      span('2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z'), span('2026-11-08T00:00:00Z', '2026-11-20T00:00:00Z'),
      span('2026-11-20T00:00:00Z', '2027-02-20T00:00:00Z'),
    ];
    expect(continuousProUntil(spans, now)?.toISOString()).toBe('2027-02-20T00:00:00.000Z');
  });

  it('LB1E31: a span that starts later than the end of the running one is not joined, and does not count when nothing runs', () => {
    expect(continuousProUntil([span('2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z'), span('2026-11-09T00:00:00Z', '2026-12-09T00:00:00Z')], now)?.toISOString())
      .toBe('2026-11-08T00:00:00.000Z');
    expect(continuousProUntil([span('2026-11-20T00:00:00Z', '2026-12-20T00:00:00Z')], now)).toBeNull();
  });

  it('a span that starts in the future but exactly where the running one ends is joined (a grant that starts later still counts)', () => {
    const spans = [span('2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z'), span('2026-11-08T00:00:00Z', '2026-11-18T00:00:00Z')];
    expect(continuousProUntil(spans, now)?.toISOString()).toBe('2026-11-18T00:00:00.000Z');
  });

  it('a revoked span is ignored, also in the middle of a chain', () => {
    expect(continuousProUntil([span('2026-11-01T00:00:00Z', '2026-12-05T00:00:00Z', '2026-11-03T00:00:00Z')], now)).toBeNull();
    const chain = [span('2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z'), span('2026-11-08T00:00:00Z', '2026-12-08T00:00:00Z', '2026-11-09T00:00:00Z')];
    expect(continuousProUntil(chain, now)?.toISOString()).toBe('2026-11-08T00:00:00.000Z');
  });

  it('a span that ended exactly now does not cover now (the end is exclusive)', () => {
    expect(continuousProUntil([span('2026-10-01T00:00:00Z', '2026-11-05T03:02:00Z')], now)).toBeNull();
  });

  it('a span that starts exactly now covers it', () => {
    expect(continuousProUntil([span('2026-11-05T03:02:00Z', '2026-11-06T03:02:00Z')], now)?.toISOString()).toBe('2026-11-06T03:02:00.000Z');
  });

  it('overlapping spans take the latest end', () => {
    const spans = [span('2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z'), span('2026-11-02T00:00:00Z', '2026-11-10T00:00:00Z')];
    expect(continuousProUntil(spans, now)?.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });
});
