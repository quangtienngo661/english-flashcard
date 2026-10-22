'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { FullScreenSpinner, OfflineScreen } from '@/app-ui/States';
import type { AppLocale } from '@/i18n/routing';
import { createApiClient } from './api/client';
import { prefixFix } from './locale-prefix';
import { useSession } from './session/session-context';
import type { SessionState } from './session/session-store';
import { deviceTimezone, timezoneToSync } from './timezone-sync';

// Pages a learner opens before choosing a language (the sign-up flow: verify the email, then pick the language).
const NO_LANGUAGE_PAGES = /\/app\/(welcome|verify-email)$/;

const here = () => `${window.location.pathname}${window.location.search}`;

/**
 * The gate of every signed-in page (design §4.2, E1, E5, E9–E11): wait for the session, send a signed-out visitor to sign in
 * and back, put the profile's language in the path, store the device zone once, then show the page.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { state, store } = useSession();
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const zoneSynced = useRef(false);
  // Only computed once the session has an answer, which never happens during prerender (state is `loading` there).
  const target = state.status === 'loading' || state.status === 'unavailable' ? null : redirectFor(state, locale);

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  // E11: once per app start; a failure is ignored and the next start tries again.
  useEffect(() => {
    if (state.status !== 'signed-in' || !store || zoneSynced.current) return;
    zoneSynced.current = true;
    const timezone = timezoneToSync(deviceTimezone(), state.me.timezone);
    if (!timezone) return;
    createApiClient({ send: store.send })
      .patch('/v1/me', { timezone })
      .then(() => store.recheck())
      .catch(() => {});
  }, [state, store]);

  if (state.status === 'unavailable') return <OfflineScreen onRetry={() => void store?.bootstrap()} />;
  if (state.status !== 'signed-in' || target) return <FullScreenSpinner />;
  return <>{children}</>;
}

function redirectFor(state: Exclude<SessionState, { status: 'loading' | 'unavailable' }>, locale: AppLocale): string | null {
  if (state.status === 'signed-out') return `/${locale}/app/login?next=${encodeURIComponent(here())}`;
  if (state.status === 'change-password') return `/${locale}/app/forgot-password?reason=change-password`;
  const fixed = prefixFix(here(), state.me.native_language);
  if (fixed) return fixed;
  if (state.me.native_language === null && !NO_LANGUAGE_PAGES.test(window.location.pathname)) {
    return `/${locale}/app/welcome?next=${encodeURIComponent(here())}`;
  }
  return null;
}
