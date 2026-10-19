import { describe, expect, it } from 'vitest';
import { addMonthsClamped, aiDay, cycleAt, nextAiDayStart } from './cycle.js';

const at = (iso: string) => new Date(iso);
const iso = (value: Date) => value.toISOString();

describe('addMonthsClamped', () => {
  it('D13: anchor 31/01 10:00 gives cycles starting 28/02, 31/03, 30/04 at 10:00 (the anchor does not drift)', () => {
    const anchor = at('2026-01-31T10:00:00Z');
    expect(iso(addMonthsClamped(anchor, 0))).toBe('2026-01-31T10:00:00.000Z');
    expect(iso(addMonthsClamped(anchor, 1))).toBe('2026-02-28T10:00:00.000Z');
    expect(iso(addMonthsClamped(anchor, 2))).toBe('2026-03-31T10:00:00.000Z');
    expect(iso(addMonthsClamped(anchor, 3))).toBe('2026-04-30T10:00:00.000Z');
    expect(iso(addMonthsClamped(anchor, 4))).toBe('2026-05-31T10:00:00.000Z');
  });

  it('anchor 29/02/2028 → 28/02/2029, 29/03/2029', () => {
    const anchor = at('2028-02-29T08:15:00Z');
    expect(iso(addMonthsClamped(anchor, 12))).toBe('2029-02-28T08:15:00.000Z');
    expect(iso(addMonthsClamped(anchor, 13))).toBe('2029-03-29T08:15:00.000Z');
  });

  it('crosses a year end: anchor 30/11 → 30/12, 30/01, 28/02', () => {
    const anchor = at('2026-11-30T00:00:00Z');
    expect(iso(addMonthsClamped(anchor, 1))).toBe('2026-12-30T00:00:00.000Z');
    expect(iso(addMonthsClamped(anchor, 2))).toBe('2027-01-30T00:00:00.000Z');
    expect(iso(addMonthsClamped(anchor, 3))).toBe('2027-02-28T00:00:00.000Z');
  });
});

describe('cycleAt', () => {
  const anchor = at('2026-01-31T10:00:00Z');

  it('now exactly at a cycle start belongs to the new cycle', () => {
    const cycle = cycleAt(anchor, at('2026-03-31T10:00:00Z'));
    expect(iso(cycle.start)).toBe('2026-03-31T10:00:00.000Z');
    expect(iso(cycle.end)).toBe('2026-04-30T10:00:00.000Z');
  });

  it('one millisecond before a cycle start still belongs to the previous cycle', () => {
    const cycle = cycleAt(anchor, at('2026-03-31T09:59:59.999Z'));
    expect(iso(cycle.start)).toBe('2026-02-28T10:00:00.000Z');
    expect(iso(cycle.end)).toBe('2026-03-31T10:00:00.000Z');
  });

  it('a now several months after the anchor finds the cycle that contains it', () => {
    const cycle = cycleAt(anchor, at('2026-05-15T00:00:00Z'));
    expect(iso(cycle.start)).toBe('2026-04-30T10:00:00.000Z');
    expect(iso(cycle.end)).toBe('2026-05-31T10:00:00.000Z');
  });

  it('a now before the anchor gives the first cycle (k = 0)', () => {
    const cycle = cycleAt(anchor, at('2026-01-01T00:00:00Z'));
    expect(iso(cycle.start)).toBe('2026-01-31T10:00:00.000Z');
    expect(iso(cycle.end)).toBe('2026-02-28T10:00:00.000Z');
  });

  it('anchor 23:30 UTC on the 31st: cycles stay at 23:30 UTC and the clamped day, whatever the local date', () => {
    const late = at('2026-01-31T23:30:00Z');
    const march = cycleAt(late, at('2026-03-01T00:00:00Z'));
    expect(iso(march.start)).toBe('2026-02-28T23:30:00.000Z');
    expect(iso(march.end)).toBe('2026-03-31T23:30:00.000Z');
    const beforeEnd = cycleAt(late, at('2026-02-28T23:29:59.999Z'));
    expect(iso(beforeEnd.start)).toBe('2026-01-31T23:30:00.000Z');
    expect(iso(beforeEnd.end)).toBe('2026-02-28T23:30:00.000Z');
  });
});

describe('the AI cap day', () => {
  it('B5E13: aiDay is the Vietnam date (16:59:59 UTC → day d, 17:00 UTC → day d+1)', () => {
    expect(aiDay(at('2026-11-01T16:59:59Z'))).toBe('2026-11-01');
    expect(aiDay(at('2026-11-01T17:00:00Z'))).toBe('2026-11-02');
  });

  it('nextAiDayStart is the next 00:00 in Vietnam (17:00 UTC)', () => {
    expect(iso(nextAiDayStart(at('2026-11-01T16:59:00Z')))).toBe('2026-11-01T17:00:00.000Z');
    expect(iso(nextAiDayStart(at('2026-11-01T17:00:00Z')))).toBe('2026-11-02T17:00:00.000Z');
  });
});
