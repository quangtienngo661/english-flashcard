import { describe, expect, it } from 'vitest';
import { ProblemDetailsException } from '../problem-details/problem-details.exception.js';
import { dayRange, daysOf } from './day-range.js';

const ZONE = 'Asia/Ho_Chi_Minh';
// 20/10/2026 01:30 in Vietnam.
const NOW = new Date('2026-10-19T18:30:00.000Z');

function violations(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ProblemDetailsException);
    return ((error as ProblemDetailsException).extensions?.violations ?? []) as string[];
  }
  throw new Error('expected a 400');
}

describe('dayRange', () => {
  it('defaults to the N days ending today in the zone, with UTC instants at the zone midnights', () => {
    expect(dayRange({}, ZONE, NOW, 30)).toEqual({
      from: '2026-09-21', to: '2026-10-20',
      start: new Date('2026-09-20T17:00:00.000Z'), end: new Date('2026-10-20T17:00:00.000Z'),
    });
  });

  it('a lone from runs to today; a lone to reaches back N days', () => {
    expect(dayRange({ from: '2026-10-18' }, ZONE, NOW, 30)).toMatchObject({ from: '2026-10-18', to: '2026-10-20' });
    expect(dayRange({ to: '2026-10-07' }, ZONE, NOW, 7)).toMatchObject({ from: '2026-10-01', to: '2026-10-07' });
  });

  it('a reversed range or one longer than 366 days → 400 with the field', () => {
    expect(violations(() => dayRange({ from: '2026-10-21', to: '2026-10-20' }, ZONE, NOW, 30))).toEqual(['from: Must not be after to']);
    expect(violations(() => dayRange({ from: '2025-10-19', to: '2026-10-20' }, ZONE, NOW, 30)))
      .toEqual(['to: The range must be at most 366 days']);
    expect(dayRange({ from: '2025-10-20', to: '2026-10-20' }, ZONE, NOW, 30).from).toBe('2025-10-20');
  });
});

describe('daysOf', () => {
  it('lists every day, both ends included', () => {
    expect(daysOf({ from: '2026-10-30', to: '2026-11-02' })).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(daysOf({ from: '2026-10-20', to: '2026-10-20' })).toEqual(['2026-10-20']);
  });
});
