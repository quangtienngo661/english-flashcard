import { describe, expect, it } from 'vitest';
import { nextLastEventAt, orderDecision } from './event-order.js';

const at = (iso: string) => new Date(iso);
const LAST = at('2026-11-15T10:00:00Z');

describe('orderDecision (design §9.2 "Thứ tự", R1)', () => {
  it('B5E43: a state event older than last_event_at → stale', () => {
    expect(orderDecision('state', at('2026-11-15T09:59:59Z'), LAST)).toBe('stale');
  });

  it('B5E71: a state event with the same occurred_at → apply', () => {
    expect(orderDecision('state', at('2026-11-15T10:00:00Z'), LAST)).toBe('apply');
  });

  it('a newer state event, or a subscription without last_event_at → apply', () => {
    expect(orderDecision('state', at('2026-11-15T10:00:01Z'), LAST)).toBe('apply');
    expect(orderDecision('state', at('2020-01-01T00:00:00Z'), null)).toBe('apply');
  });

  it('an additive event is never stale', () => {
    expect(orderDecision('additive', at('2026-11-01T00:00:00Z'), LAST)).toBe('apply');
  });
});

describe('nextLastEventAt', () => {
  it('is the max of last_event_at and occurred_at', () => {
    expect(nextLastEventAt(LAST, at('2026-11-01T00:00:00Z'))).toEqual(LAST);
    expect(nextLastEventAt(LAST, at('2026-11-20T00:00:00Z'))).toEqual(at('2026-11-20T00:00:00Z'));
    expect(nextLastEventAt(null, at('2026-11-01T00:00:00Z'))).toEqual(at('2026-11-01T00:00:00Z'));
  });
});
