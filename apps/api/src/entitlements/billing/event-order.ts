// Event order (design §9.2 "Thứ tự", R1): state events apply by occurred_at, additive ones always.

/** A state event older than the subscription's `last_event_at` is stale; an equal one applies in arrival order. */
export function orderDecision(kind: 'state' | 'additive', occurredAt: Date, lastEventAt: Date | null): 'apply' | 'stale' {
  if (kind === 'additive' || lastEventAt === null) return 'apply';
  return occurredAt.getTime() < lastEventAt.getTime() ? 'stale' : 'apply';
}

/** `last_event_at` only moves forward, so an older state event that arrives after an additive one is still stale (B5E43). */
export function nextLastEventAt(lastEventAt: Date | null, occurredAt: Date): Date {
  if (lastEventAt === null || occurredAt.getTime() > lastEventAt.getTime()) return occurredAt;
  return lastEventAt;
}
