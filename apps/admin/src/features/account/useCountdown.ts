import { useCallback, useEffect, useState } from 'react';

/** Whole seconds left to wait (429 `Retry-After`); 0 means free. */
export function useCountdown(): { remaining: number; start: (seconds: number) => void } {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);
  const start = useCallback((seconds: number) => setRemaining(Math.max(1, Math.ceil(seconds))), []);
  return { remaining, start };
}
