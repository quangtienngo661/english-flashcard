'use client';

import { useRef, useState } from 'react';
import { TurnstileWidget, type TurnstileHandle } from './TurnstileWidget';

/**
 * Everything a form with a bot check needs (design 4.3): `token` (`null` until the widget has one, and again after it expires),
 * `pending` (no token yet and the check has not failed), `widget` (the element to render inside the form), and `reset()` to ask
 * for a new token. A token works once, so a form calls `reset()` after every response that keeps it on the page. The widget's
 * ref stays in here: the React lint rule rejects a form that reads a ref-holding object while rendering.
 */
export function useTurnstile() {
  const handle = useRef<TurnstileHandle>(null);
  const [token, setToken] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  return {
    token,
    /** Waiting for a token while the check works; false once it failed to load (the widget says so itself). */
    pending: token === null && !unavailable,
    widget: <TurnstileWidget ref={handle} onToken={setToken} onUnavailable={setUnavailable} />,
    reset: () => handle.current?.reset(),
  };
}
