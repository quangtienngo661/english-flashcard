import { describe, expect, it } from 'vitest';
import { rangeProblem, todayInAdminZone } from './cost-range';

describe('todayInAdminZone', () => {
  it('is the Vietnam day: 17:00 UTC is already the next day', () => {
    expect(todayInAdminZone(new Date('2026-10-26T16:59:00Z'))).toBe('2026-10-26');
    expect(todayInAdminZone(new Date('2026-10-26T17:00:00Z'))).toBe('2026-10-27');
  });
});

describe('rangeProblem (design §6.6)', () => {
  it('accepts one day and exactly 366 days', () => {
    expect(rangeProblem('2026-10-27', '2026-10-27')).toBeNull();
    expect(rangeProblem('2025-10-27', '2026-10-27')).toBeNull(); // 366 days counting both ends
  });
  it('rejects from after to, and more than 366 days', () => {
    expect(rangeProblem('2026-10-28', '2026-10-27')).toEqual({ from: 'fromAfterTo' });
    expect(rangeProblem('2025-10-26', '2026-10-27')).toEqual({ to: 'tooLong' });
  });
  it('rejects an empty date before anything else', () => {
    expect(rangeProblem('', '2026-10-27')).toEqual({ from: 'required' });
    expect(rangeProblem('2026-10-27', '')).toEqual({ to: 'required' });
  });
});
