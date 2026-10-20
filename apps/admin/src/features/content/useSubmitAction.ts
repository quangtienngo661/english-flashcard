import { useEffect, useRef, useState } from 'react';
import { ApiError, NetworkError } from '../../api/problem';
import { useIdempotencyKey } from '../../api/idempotency';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useCountdown } from '../account/useCountdown';

const IN_PROGRESS_DEFAULT_WAIT_S = 2;

/**
 * One request per submission, with the retry rules of spec §6.3 for calls that need an `Idempotency-Key`:
 * - a second press while one is in flight does nothing (Review Focus 3);
 * - a network error keeps the same key and offers "Thử lại" (`canRetry`);
 * - 409 "still running" is sent again after `Retry-After` with the same key;
 * - 409 `idempotency-key-abandoned` renews the key, so the next press is a new submission;
 * - 429 locks the action for `Retry-After` seconds (`waitSeconds`).
 * `fingerprint` names the form's content: when it changes the key changes.
 */
export function useSubmitAction<T>(run: (key: string) => Promise<T>, fingerprint: string, onDone: (result: T) => void) {
  const errorDetails = useErrorDetails();
  const idempotency = useIdempotencyKey(fingerprint);
  const countdown = useCountdown();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef({ run, onDone, key: idempotency.key });
  latest.current = { run, onDone, key: idempotency.key };

  useEffect(() => () => clearTimeout(timer.current), []);

  async function submit(): Promise<void> {
    if (busy.current || countdown.remaining > 0) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setCanRetry(false);
    try {
      const { run: send, onDone: done, key } = latest.current;
      done(await send(key));
    } catch (e) {
      setError(errorDetails(e));
      if (e instanceof NetworkError) setCanRetry(true);
      else if (e instanceof ApiError) {
        if (e.problem.status === 429) countdown.start(e.retryAfterSeconds ?? 1);
        else if (e.problem.slug === 'idempotency-key-abandoned') idempotency.renew();
        else if (e.problem.status === 409 && e.problem.slug === '') {
          timer.current = setTimeout(() => void submit(), (e.retryAfterSeconds ?? IN_PROGRESS_DEFAULT_WAIT_S) * 1000);
        }
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return { submit, pending, error, canRetry, waitSeconds: countdown.remaining };
}
