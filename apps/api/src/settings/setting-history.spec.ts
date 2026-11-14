import { describe, expect, it } from 'vitest';
import { settingValueAt, type SettingKeyChange } from './setting-history.js';

const C = (at: string, oldValue: unknown, newValue: unknown): SettingKeyChange => ({ oldValue, newValue, changedAt: new Date(at) });
// END(d) = the Vietnam midnight after day d (UTC+7, so 17:00 UTC of d).
const END = (date: string) => new Date(`${date}T17:00:00.000Z`);

const CHANGES = [C('2026-10-17T05:00:00Z', 1000, 3), C('2026-10-19T03:00:00Z', 3, 5), C('2026-10-19T08:00:00Z', 5, 7)];

describe('settingValueAt (design §8.1, B44)', () => {
  it('never changed → the current value', () => {
    expect(settingValueAt([], 9, END('2026-10-17'))).toBe(9);
  });

  it('before the first change → that change’s old value (the value in force before any save)', () => {
    expect(settingValueAt(CHANGES, 7, END('2026-10-16'))).toBe(1000);
  });

  it('a change at exactly the instant has not happened yet (strictly before)', () => {
    expect(settingValueAt(CHANGES, 7, new Date('2026-10-17T05:00:00Z'))).toBe(1000);
  });

  it('a change earlier in the day is in force at the end of that day, and stays until the next change', () => {
    expect(settingValueAt(CHANGES, 7, END('2026-10-17'))).toBe(3);
    expect(settingValueAt(CHANGES, 7, END('2026-10-18'))).toBe(3);
  });

  it('two changes in one day → the last value (B44)', () => {
    expect(settingValueAt(CHANGES, 7, END('2026-10-19'))).toBe(7);
  });

  it('a change at 00:00 Vietnam belongs to the new day (Review focus 3)', () => {
    // 17:00Z on the 17th is 00:00 on the 18th.
    expect(settingValueAt([C('2026-10-17T17:00:00Z', 1000, 3)], 3, END('2026-10-17'))).toBe(1000);
    expect(settingValueAt([C('2026-10-17T17:00:00Z', 1000, 3)], 3, END('2026-10-18'))).toBe(3);
  });

  it('a stored null (a value left empty) is a value like any other', () => {
    expect(settingValueAt([C('2026-10-17T05:00:00Z', 75, null)], null, END('2026-10-16'))).toBe(75);
    expect(settingValueAt([C('2026-10-17T05:00:00Z', 75, null)], null, END('2026-10-17'))).toBeNull();
  });
});
