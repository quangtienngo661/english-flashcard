'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { turnstileSiteKey } from '@/app-shell/config';

// Cloudflare "Client-side rendering" page (read 04/11/2026): explicit rendering through this script.
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** What the widget hands over when the site key is blank (pnpm dev:app, tests): the API in `fake` mode accepts it, `real` refuses it (LA1E18). */
export const FAKE_TURNSTILE_TOKEN = 'fake-turnstile-token';

type TurnstileApi = {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};
const turnstileApi = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;

export type TurnstileHandle = { reset(): void };

/**
 * The bot check of a form (launch prep A, design 4.3). `onToken` gets the token, or `null` when there is none (not yet, expired,
 * failed): the form keeps its submit button off then. A token works once, so the form calls `reset()` after every response
 * unless it leaves the page. With no site key nothing loads and nothing shows: the fake token is handed over at once.
 */
export function TurnstileWidget({ onToken, ref }: { onToken: (token: string | null) => void; ref?: Ref<TurnstileHandle> }) {
  const t = useTranslations('App.errors');
  const siteKey = turnstileSiteKey();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const latest = useRef(onToken);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    latest.current = onToken;
  });

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        if (siteKey === '') {
          latest.current(FAKE_TURNSTILE_TOKEN);
          return;
        }
        latest.current(null);
        if (widgetId.current !== null) turnstileApi()?.reset(widgetId.current);
      },
    }),
    [siteKey],
  );

  useEffect(() => {
    if (siteKey === '') {
      latest.current(FAKE_TURNSTILE_TOKEN);
      return;
    }
    const render = () => {
      const api = turnstileApi();
      if (!api || !container.current || widgetId.current !== null) return;
      widgetId.current = api.render(container.current, {
        sitekey: siteKey,
        // The default, written down so nobody changes it by accident: an expired token is replaced without the form noticing.
        'refresh-expired': 'auto',
        callback: (token: string) => latest.current(token),
        'expired-callback': () => latest.current(null),
        'error-callback': () => latest.current(null),
        'timeout-callback': () => latest.current(null),
      });
    };
    const failed = (event: Event) => {
      // A script that did not load is removed so that the next form to open tries again.
      (event.target as HTMLScriptElement | null)?.remove();
      latest.current(null);
      setUnavailable(true);
    };
    let script: HTMLScriptElement | null = null;
    if (turnstileApi()) {
      render();
    } else {
      script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (!script) {
        script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', render);
      script.addEventListener('error', failed);
    }
    return () => {
      script?.removeEventListener('load', render);
      script?.removeEventListener('error', failed);
      if (widgetId.current !== null) {
        turnstileApi()?.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  if (siteKey === '') return null;
  return (
    <>
      <div ref={container} />
      {unavailable && (
        <p role="status" className="font-wm-sans text-wm-caption text-wm-muted">
          {t('captcha-unavailable')}
        </p>
      )}
    </>
  );
}
