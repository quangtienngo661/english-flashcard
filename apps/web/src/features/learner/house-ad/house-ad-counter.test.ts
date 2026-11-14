// @vitest-environment jsdom
import { houseAdKey, localDay, readCounter, shouldShowHouseAd, writeCounter, type Counter } from './house-ad-counter';

const ZONE = 'Asia/Ho_Chi_Minh';
const MIN = 60_000;
// 12:00 on 10/11/2026 in Vietnam.
const NOON = new Date('2026-11-10T05:00:00.000Z');
const counter = (over: Partial<Counter> = {}): Counter => ({ date: '2026-11-10', count: 1, last_at: NOON.getTime() - 30 * MIN, ...over });
const ask = (c: Counter | null, over: Partial<Parameters<typeof shouldShowHouseAd>[0]> = {}) =>
  shouldShowHouseAd({ counter: c, now: NOON, zone: ZONE, perDay: 3, minIntervalMinutes: 10, ...over });

describe('shouldShowHouseAd (launch prep B design §4.2, LB2E7–LB2E9)', () => {
  it('the first time ever, and the first time on a new day → true', () => {
    expect(ask(null)).toBe(true);
    expect(ask(counter({ date: '2026-11-09', count: 3, last_at: NOON.getTime() - 20 * 60 * MIN }))).toBe(true);
  });

  it('LB2E7: less than 10 minutes since the last one → false; exactly 10 minutes → true', () => {
    expect(ask(counter({ last_at: NOON.getTime() - 9 * MIN - 59_000 }))).toBe(false);
    expect(ask(counter({ last_at: NOON.getTime() - 10 * MIN }))).toBe(true);
  });

  it('LB2E8: the fourth time of the day → false; two done and a third is allowed', () => {
    expect(ask(counter({ count: 3 }))).toBe(false);
    expect(ask(counter({ count: 2 }))).toBe(true);
  });

  it('LB2E8: after 00:00 in the learner\'s zone the count starts again', () => {
    // 23:50 on 10/11 in Vietnam, three shown; 00:20 on 11/11 in Vietnam is a new day there.
    const last = new Date('2026-11-10T16:50:00.000Z').getTime();
    const after = new Date('2026-11-10T17:20:00.000Z');
    expect(ask(counter({ count: 3, last_at: last }), { now: after })).toBe(true);
    // The same instant in UTC is still 10/11: the day has not turned there.
    expect(ask(counter({ count: 3, last_at: last }), { now: after, zone: 'UTC' })).toBe(false);
  });

  it('LB2E9: zero a day → never, whatever the counter', () => {
    expect(ask(null, { perDay: 0 })).toBe(false);
    expect(ask(counter({ count: 0, last_at: 0 }), { perDay: 0 })).toBe(false);
  });

  it('a minimum gap of 0 minutes allows back-to-back shows up to the daily number', () => {
    expect(ask(counter({ count: 1, last_at: NOON.getTime() }), { minIntervalMinutes: 0 })).toBe(true);
    expect(ask(counter({ count: 3, last_at: NOON.getTime() }), { minIntervalMinutes: 0 })).toBe(false);
  });
});

describe('localDay', () => {
  it('is the calendar day of the instant in the zone, as YYYY-MM-DD', () => {
    expect(localDay('Asia/Ho_Chi_Minh', new Date('2026-11-10T17:20:00.000Z'))).toBe('2026-11-11');
    expect(localDay('UTC', new Date('2026-11-10T17:20:00.000Z'))).toBe('2026-11-10');
  });
});

describe('the counter in localStorage (per learner)', () => {
  beforeEach(() => localStorage.clear());

  it('LB2E10: each learner has a key of their own; nothing stored reads as null', () => {
    expect(houseAdKey('u1')).toBe('wordmet-web.house-ad.u1');
    expect(readCounter('u1')).toBeNull();
    expect(writeCounter('u1', counter({ count: 3 }))).toBe(true);
    expect(readCounter('u1')).toEqual(counter({ count: 3 }));
    expect(readCounter('u2')).toBeNull();
  });

  it('LB2E11: storage that throws on read or write is "unreadable" / not written', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readCounter('u1')).toBe('unreadable');
    get.mockRestore();
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(writeCounter('u1', counter())).toBe(false);
    set.mockRestore();
  });

  it('something that is not a counter (corrupt, another shape) is "unreadable", not a reason to show', () => {
    for (const raw of ['not json', '{"date":1}', '[]', '{"date":"2026-11-10","count":"3","last_at":1}', 'null']) {
      localStorage.setItem(houseAdKey('u1'), raw);
      expect(readCounter('u1'), raw).toBe('unreadable');
    }
  });
});
