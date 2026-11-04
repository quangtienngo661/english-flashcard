import type { Refusal } from '../refusal.js';
import { nextAiDayStart } from '../rules/cycle.js';

// The ledger's decisions (design §7.1, §7.3, R7). Pure: the service reads the rows under its locks and writes the outcome.

export type LiveRow = { status: 'reserved' | 'confirmed'; expiresAt: Date | null };
export type LatestRow = { status: 'reserved' | 'confirmed' | 'released'; releaseReason: string | null; expiresAt: Date | null };

const OFF: Refusal = { reason: 'ai-unavailable', retry_after_seconds: null };

const unexpired = (expiresAt: Date | null, now: Date) => expiresAt !== null && expiresAt > now;

/**
 * Step one of a reservation, under the pool lock only: the live row of the operation, the switch (and a cap of 0, which
 * refuses like the switch, B5E65), the limit, what is left. `check-cap` sends the service to the global lock.
 * `freeCap` is `free_ai_daily_cap` for a Free account and left out (or `null`) for any other plan: 0 refuses like the switch (LA3E20),
 * a positive one is counted by the service under the global lock (design 6.4).
 */
export function decideReserve(input: {
  existing: LiveRow | null; now: Date; aiEnabled: boolean; limit: number; used: number; cycleEnd: Date | null; cap: number | null;
  freeCap?: number | null;
}):
  | { action: 'return-existing'; state: 'reserved' | 'confirmed' }
  | { action: 'release-expired-then-continue' }
  | { action: 'refuse'; refusal: Refusal }
  | { action: 'check-cap' } {
  const { existing, now } = input;
  if (existing?.status === 'confirmed') return { action: 'return-existing', state: 'confirmed' };
  if (existing?.status === 'reserved') {
    return unexpired(existing.expiresAt, now)
      ? { action: 'return-existing', state: 'reserved' }
      : { action: 'release-expired-then-continue' };
  }
  if (!input.aiEnabled || input.cap === 0 || input.freeCap === 0) return { action: 'refuse', refusal: OFF };
  if (input.limit === 0) return { action: 'refuse', refusal: { reason: 'plan-required' } };
  if (input.used >= input.limit) {
    return { action: 'refuse', refusal: { reason: 'quota-exhausted', resets_at: input.cycleEnd?.toISOString() ?? null } };
  }
  return { action: 'check-cap' };
}

/** Step two, under the global `entitlements.ai_daily` lock: the system-wide cap of the Vietnam day (`null` = no cap, Q10). */
export function decideCap(input: { capUsed: number; cap: number | null; now: Date }):
  | { action: 'refuse'; refusal: Refusal }
  | { action: 'insert' } {
  if (input.cap === null || input.capUsed < input.cap) return { action: 'insert' };
  const seconds = Math.ceil((nextAiDayStart(input.now).getTime() - input.now.getTime()) / 1000);
  return { action: 'refuse', refusal: { reason: 'ai-unavailable', retry_after_seconds: seconds } };
}

/** What `confirm` does with the newest `use` row of the operation (the R7 table, row by row). */
export function decideConfirm(input: {
  latest: LatestRow | null; now: Date; remainingWithoutRow: number; otherActive: boolean;
}): 'confirm' | 'late-confirm' | 'late-free' | 'keep-released' | 'already-confirmed' | 'not-found' {
  const { latest, now } = input;
  if (!latest) return 'not-found';
  if (latest.status === 'confirmed') return 'already-confirmed';
  if (latest.status === 'reserved' && unexpired(latest.expiresAt, now)) return 'confirm';
  if (latest.status === 'reserved' || latest.releaseReason === 'expired') {
    return input.remainingWithoutRow > 0 && !input.otherActive ? 'late-confirm' : 'late-free';
  }
  return 'keep-released';
}
