import { describe, expect, it } from 'vitest';
import { aiCycle, calendarMonthCycle } from './ai-cycle.js';
import { cycleAt } from './cycle.js';
import type { Resolved } from './plan-rules.js';

const at = (iso: string) => new Date(iso);
const VN = 'Asia/Ho_Chi_Minh';

function resolved(over: Partial<Resolved> & { ai?: [number, number] } = {}): Resolved {
  const [practice, lookup] = over.ai ?? [15, 5];
  return {
    plan: 'free', anchor: null, limits: { practice_sessions: 3, ai_practice: practice, ai_lookup: lookup },
    limitFrom: { practice_sessions: { kind: 'plan' }, ai_practice: { kind: 'plan' }, ai_lookup: { kind: 'plan' } }, proSources: [],
    ...over,
  };
}

describe('calendarMonthCycle (design 6.2): the learner\'s calendar month in the learner\'s zone', () => {
  it('Lan in Vietnam on 15/11/2026: from 00:00 01/11 to 00:00 01/12, local time', () => {
    expect(calendarMonthCycle(VN, at('2026-11-15T03:00:00Z'))).toEqual({ start: at('2026-10-31T17:00:00Z'), end: at('2026-11-30T17:00:00Z') });
  });

  it('the first instant of the month belongs to it, and the first instant of the next month to the next cycle', () => {
    expect(calendarMonthCycle(VN, at('2026-10-31T17:00:00Z')).start).toEqual(at('2026-10-31T17:00:00Z'));
    expect(calendarMonthCycle(VN, at('2026-10-31T16:59:59.999Z')).end).toEqual(at('2026-10-31T17:00:00Z'));
    expect(calendarMonthCycle(VN, at('2026-11-30T17:00:00Z'))).toEqual({ start: at('2026-11-30T17:00:00Z'), end: at('2026-12-31T17:00:00Z') });
  });

  it('February, and February of a leap year', () => {
    expect(calendarMonthCycle(VN, at('2027-02-28T10:00:00Z'))).toEqual({ start: at('2027-01-31T17:00:00Z'), end: at('2027-02-28T17:00:00Z') });
    expect(calendarMonthCycle(VN, at('2028-02-29T10:00:00Z'))).toEqual({ start: at('2028-01-31T17:00:00Z'), end: at('2028-02-29T17:00:00Z') });
  });

  it('December rolls into January of the next year', () => {
    expect(calendarMonthCycle(VN, at('2026-12-20T03:00:00Z'))).toEqual({ start: at('2026-11-30T17:00:00Z'), end: at('2026-12-31T17:00:00Z') });
  });

  it('a zone that changes its clock inside the month: New York in March 2027 (DST starts on the 14th)', () => {
    expect(calendarMonthCycle('America/New_York', at('2027-03-20T12:00:00Z'))).toEqual({
      start: at('2027-03-01T05:00:00Z'), end: at('2027-04-01T04:00:00Z'),
    });
  });

  it('LA3E3: the very west and the very east of the clock (Pacific/Kiritimati +14, Pacific/Pago_Pago −11) at 23:30 on 30/11', () => {
    expect(calendarMonthCycle('Pacific/Kiritimati', at('2026-11-30T09:30:00Z'))).toEqual({
      start: at('2026-10-31T10:00:00Z'), end: at('2026-11-30T10:00:00Z'),
    });
    expect(calendarMonthCycle('Pacific/Pago_Pago', at('2026-12-01T10:30:00Z'))).toEqual({
      start: at('2026-11-01T11:00:00Z'), end: at('2026-12-01T11:00:00Z'),
    });
  });
});

describe('aiCycle (design 6.2): one rule for the four places that need the cycle', () => {
  const now = at('2026-11-25T03:00:00Z');

  it('with an anchor (Pro, trial, a limits grant with AI) the cycle is the one from the anchor, as before', () => {
    const anchor = at('2026-11-10T00:00:00Z');
    expect(aiCycle(resolved({ plan: 'pro', anchor }), VN, now, at('2026-11-20T03:00:00Z'))).toEqual(cycleAt(anchor, now));
    expect(aiCycle(resolved({ anchor }), VN, now, null)).toEqual(cycleAt(anchor, now));
  });

  it('LA3#6: Free without an anchor whose last Pro source ended on 20/11 10:00 (Vietnam) gets 20/11 10:00 → 01/12', () => {
    const lastEnd = at('2026-11-20T03:00:00Z');
    expect(aiCycle(resolved(), VN, now, lastEnd)).toEqual({ start: lastEnd, end: at('2026-11-30T17:00:00Z') });
  });

  it('Free with no source that ended this month gets the whole month', () => {
    expect(aiCycle(resolved(), VN, now, null)).toEqual({ start: at('2026-10-31T17:00:00Z'), end: at('2026-11-30T17:00:00Z') });
  });

  it('a source end that is not inside this month (a bug upstream) never starts the window before the month', () => {
    expect(aiCycle(resolved(), VN, now, at('2026-10-25T00:00:00Z'))).toEqual({ start: at('2026-10-31T17:00:00Z'), end: at('2026-11-30T17:00:00Z') });
  });

  it('either AI pool above 0 is enough for Free to have a cycle', () => {
    expect(aiCycle(resolved({ ai: [0, 5] }), VN, now, null)).not.toBeNull();
    expect(aiCycle(resolved({ ai: [15, 0] }), VN, now, null)).not.toBeNull();
  });

  it('LA3#11: both AI pools at 0 (the admin switched the allowance off) → no cycle', () => {
    expect(aiCycle(resolved({ ai: [0, 0] }), VN, now, null)).toBeNull();
  });

  it('LA3E6: a Pro account without an anchor never turns into a calendar month', () => {
    expect(aiCycle(resolved({ plan: 'pro' }), VN, now, null)).toBeNull();
  });

  it('a trial without an anchor is not a calendar month either', () => {
    expect(aiCycle(resolved({ plan: 'trial' }), VN, now, null)).toBeNull();
  });
});
