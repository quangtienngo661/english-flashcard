import { describe, expect, it } from 'vitest';
import { decideCap, decideConfirm, decideReserve } from './ledger-rules.js';

const NOW = new Date('2026-11-10T05:00:00Z'); // 12:00 in Vietnam
const LATER = new Date(NOW.getTime() + 60_000);
const EARLIER = new Date(NOW.getTime() - 1);
const CYCLE_END = new Date('2026-12-01T00:00:00Z');

const base = { existing: null, now: NOW, aiEnabled: true, limit: 300, used: 10, cycleEnd: CYCLE_END, cap: 1000 };

describe('decideReserve (design §7.1 order)', () => {
  it('B5E2: an unexpired reserved row is returned', () => {
    expect(decideReserve({ ...base, existing: { status: 'reserved', expiresAt: LATER } }))
      .toEqual({ action: 'return-existing', state: 'reserved' });
  });

  it('a confirmed row → state confirmed (the unit is already used), even with the switch off and no units left', () => {
    expect(decideReserve({ ...base, aiEnabled: false, used: 300, existing: { status: 'confirmed', expiresAt: EARLIER } }))
      .toEqual({ action: 'return-existing', state: 'confirmed' });
  });

  it('B5E3: no live row (the old one was released) → goes on to the cap check', () => {
    expect(decideReserve({ ...base, existing: null })).toEqual({ action: 'check-cap' });
  });

  it('an expired reserved row → release it, then continue', () => {
    expect(decideReserve({ ...base, existing: { status: 'reserved', expiresAt: NOW } }))
      .toEqual({ action: 'release-expired-then-continue' });
  });

  it('B5#17/B5E14: switch off → ai-unavailable, retry_after null', () => {
    expect(decideReserve({ ...base, aiEnabled: false }))
      .toEqual({ action: 'refuse', refusal: { reason: 'ai-unavailable', retry_after_seconds: null } });
  });

  it('B5E65: cap 0 → ai-unavailable without Retry-After, like the switch', () => {
    expect(decideReserve({ ...base, cap: 0, limit: 0 }))
      .toEqual({ action: 'refuse', refusal: { reason: 'ai-unavailable', retry_after_seconds: null } });
  });

  it('limit 0 → plan-required', () => {
    expect(decideReserve({ ...base, limit: 0, used: 0 })).toEqual({ action: 'refuse', refusal: { reason: 'plan-required' } });
  });

  it('remaining 0 → quota-exhausted with resets_at = cycle end', () => {
    expect(decideReserve({ ...base, used: 300 }))
      .toEqual({ action: 'refuse', refusal: { reason: 'quota-exhausted', resets_at: '2026-12-01T00:00:00.000Z' } });
    expect(decideReserve({ ...base, used: 301 }).action).toBe('refuse');
  });

  it('all user checks pass → check-cap (never insert directly)', () => {
    expect(decideReserve({ ...base, used: 299 })).toEqual({ action: 'check-cap' });
  });
});

describe('decideCap (design §7.3)', () => {
  it('B5E12: cap 1000, capUsed 1000 (3 of them reserved) → ai-unavailable with retry_after to Vietnam midnight', () => {
    // 12:00 in Vietnam → 12 hours to 00:00.
    expect(decideCap({ capUsed: 1000, cap: 1000, now: NOW }))
      .toEqual({ action: 'refuse', refusal: { reason: 'ai-unavailable', retry_after_seconds: 12 * 3600 } });
  });

  it('retry_after rounds up to a whole second', () => {
    const now = new Date('2026-11-10T16:59:59.500Z');
    expect(decideCap({ capUsed: 5, cap: 5, now }))
      .toEqual({ action: 'refuse', refusal: { reason: 'ai-unavailable', retry_after_seconds: 1 } });
  });

  it('below the cap → insert', () => {
    expect(decideCap({ capUsed: 999, cap: 1000, now: NOW })).toEqual({ action: 'insert' });
  });
});

describe('decideConfirm (R7)', () => {
  const ok = { now: NOW, remainingWithoutRow: 5, otherActive: false };

  it('reserved, not expired → confirm', () => {
    expect(decideConfirm({ ...ok, latest: { status: 'reserved', releaseReason: null, expiresAt: LATER } })).toBe('confirm');
  });

  it('B5E9: reserved before the plan ended → confirm still accepted (no units left now)', () => {
    expect(decideConfirm({ ...ok, remainingWithoutRow: 0, latest: { status: 'reserved', releaseReason: null, expiresAt: LATER } }))
      .toBe('confirm');
  });

  it('B5E6: reserved past 2 minutes, units still left → late-confirm', () => {
    expect(decideConfirm({ ...ok, latest: { status: 'reserved', releaseReason: null, expiresAt: NOW } })).toBe('late-confirm');
  });

  it('B5E6: released by the expiry job, units still left → late-confirm', () => {
    expect(decideConfirm({ ...ok, latest: { status: 'released', releaseReason: 'expired', expiresAt: EARLIER } })).toBe('late-confirm');
  });

  it('B5E7: late, no unit left → late-free (released, late-confirm-free; the result is still delivered)', () => {
    expect(decideConfirm({ ...ok, remainingWithoutRow: 0, latest: { status: 'reserved', releaseReason: null, expiresAt: EARLIER } }))
      .toBe('late-free');
    expect(decideConfirm({ ...ok, remainingWithoutRow: 0, latest: { status: 'released', releaseReason: 'expired', expiresAt: EARLIER } }))
      .toBe('late-free');
  });

  it('B5E76: late while another row of the operation is reserved or confirmed → late-free', () => {
    expect(decideConfirm({ ...ok, otherActive: true, latest: { status: 'released', releaseReason: 'expired', expiresAt: EARLIER } }))
      .toBe('late-free');
  });

  it('B5E75: released by the caller (AI failed) → keep-released', () => {
    expect(decideConfirm({ ...ok, latest: { status: 'released', releaseReason: 'caller', expiresAt: LATER } })).toBe('keep-released');
  });

  it('released as late-confirm-free → keep-released (a second late confirm changes nothing)', () => {
    expect(decideConfirm({ ...ok, latest: { status: 'released', releaseReason: 'late-confirm-free', expiresAt: EARLIER } }))
      .toBe('keep-released');
  });

  it('B5E8: already confirmed → already-confirmed (no second unit)', () => {
    expect(decideConfirm({ ...ok, latest: { status: 'confirmed', releaseReason: null, expiresAt: EARLIER } })).toBe('already-confirmed');
  });

  it('no row → not-found', () => {
    expect(decideConfirm({ ...ok, latest: null })).toBe('not-found');
  });
});
