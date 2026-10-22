'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, NetworkError } from './api/problem';

const IN_PROGRESS_RETRY_S = 2;
/** How many times a press waits out 409 "in progress" before it gives up (the key stays, so the next press is the same write). */
const IN_PROGRESS_WAITS = 3;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One write per press (Review Focus 1, E12–E14). Presses while busy are ignored. The Idempotency-Key lives until the press
 * succeeds or fails for good: a retry after a NetworkError reuses it; 409 "in progress" waits `Retry-After` and sends the
 * same key again; 409 `idempotency-key-abandoned` sends once more with a new key.
 */
export function useSubmitOnce<T>(fn: (key: string) => Promise<T>): { submit(): Promise<T | undefined>; busy: boolean } {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const keyRef = useRef<string | null>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const submit = useCallback(async (): Promise<T | undefined> => {
    if (busyRef.current) return undefined;
    busyRef.current = true;
    setBusy(true);
    let key = (keyRef.current ??= crypto.randomUUID());
    let renewed = false;
    let waits = 0;
    try {
      for (;;) {
        try {
          const result = await fnRef.current(key);
          keyRef.current = null;
          return result;
        } catch (error) {
          const inProgress = error instanceof ApiError && error.problem.status === 409 && error.problem.slug === '';
          if (inProgress && waits < IN_PROGRESS_WAITS) {
            waits += 1;
            await sleep((error.retryAfterSeconds ?? IN_PROGRESS_RETRY_S) * 1000);
            continue;
          }
          if (error instanceof ApiError && error.problem.slug === 'idempotency-key-abandoned' && !renewed) {
            renewed = true;
            key = keyRef.current = crypto.randomUUID();
            continue;
          }
          // Keep the key while the first request may still land (no answer, or still in progress); otherwise the next press is new.
          if (!(error instanceof NetworkError) && !inProgress) keyRef.current = null;
          throw error;
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  return { submit, busy };
}
