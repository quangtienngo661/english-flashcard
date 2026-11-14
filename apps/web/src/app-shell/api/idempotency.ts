// Copied from apps/admin/src/api/idempotency.ts.
import { useCallback, useState } from 'react';

type Slot = { fingerprint: string; key: string };

/** One UUID per form submission: kept across retries, replaced when the form's content changes or on `renew()`. */
export function useIdempotencyKey(fingerprint: string): { key: string; renew(): void } {
  const [slot, setSlot] = useState<Slot>(() => ({ fingerprint, key: crypto.randomUUID() }));
  let current = slot;
  if (slot.fingerprint !== fingerprint) {
    current = { fingerprint, key: crypto.randomUUID() };
    setSlot(current);
  }
  const renew = useCallback(() => setSlot((s) => ({ fingerprint: s.fingerprint, key: crypto.randomUUID() })), []);
  return { key: current.key, renew };
}
