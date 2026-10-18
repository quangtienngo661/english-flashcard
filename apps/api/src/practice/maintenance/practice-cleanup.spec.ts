import { describe, expect, it } from 'vitest';
import { monthsBefore } from './practice-cleanup.service.js';

describe('monthsBefore', () => {
  it('subtracts calendar months in UTC, keeping the time of day', () => {
    expect(monthsBefore(new Date('2026-11-08T03:00:00Z'), 6)).toEqual(new Date('2026-05-08T03:00:00Z'));
    expect(monthsBefore(new Date('2026-02-10T23:30:00Z'), 3)).toEqual(new Date('2025-11-10T23:30:00Z'));
  });

  it('a day the target month lacks becomes its last day', () => {
    expect(monthsBefore(new Date('2026-08-31T12:00:00Z'), 6)).toEqual(new Date('2026-02-28T12:00:00Z'));
    expect(monthsBefore(new Date('2028-09-30T00:00:00Z'), 7)).toEqual(new Date('2028-02-29T00:00:00Z'));
  });
});
