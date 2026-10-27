import { describe, expect, it } from 'vitest';
import { endAfterDay, grantsQuery, lastDay, startOfDay, vnDay } from './entitlements-api';

const NONE = { user_email: '', granted_by_email: '', active: 'all', expiring_within_days: '' };

describe('entitlements-api', () => {
  it('§6.11: the query carries only the filters that are set, then page_size and page_token', () => {
    expect(grantsQuery(NONE)).toBe('page_size=20');
    expect(grantsQuery({ user_email: 'lan@example.com', granted_by_email: 'an@wordmet.com', active: 'true', expiring_within_days: '7' }, 'tok')).toBe(
      'user_email=lan%40example.com&granted_by_email=an%40wordmet.com&active=true&expiring_within_days=7&page_size=20&page_token=tok',
    );
  });

  it('§6.11: dates are Vietnam days: a grant covers its last day and ends at the midnight after it', () => {
    // 22/11/2026 00:00 +07:00 is 21/11 17:00 UTC: the last day shown is 21/11, not 22/11.
    expect(lastDay('2026-11-21T17:00:00.000Z')).toBe('2026-11-21');
    expect(vnDay('2026-10-21T17:00:00.000Z')).toBe('2026-10-22');
    expect(startOfDay('2026-10-22')).toBe('2026-10-22T00:00:00+07:00');
    expect(endAfterDay('2026-11-21')).toBe('2026-11-22T00:00:00+07:00');
    expect(endAfterDay('2026-12-31')).toBe('2027-01-01T00:00:00+07:00');
    expect(new Date(endAfterDay('2026-11-21')).toISOString()).toBe('2026-11-21T17:00:00.000Z');
  });
});
