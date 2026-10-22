'use client';

import { useLocale } from 'next-intl';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { safeNext } from '@/app-shell/locale-prefix';
import { hardReplace } from '@/app-shell/navigate';
import { useSession } from '@/app-shell/session/session-context';
import type { AppLocale } from '@/i18n/routing';

/**
 * Sign-in pages: a learner who is already signed in when the page opens goes on to `?next` (or Today) instead of seeing the
 * form. A sign-in or sign-up made on the page itself is left to the form, which knows where to go next (verify-email…).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useSession();
  const locale = useLocale() as AppLocale;
  // The first answer of the session start: only a page opened while signed in redirects.
  const firstStatus = useRef<string | null>(null);

  useEffect(() => {
    if (state.status === 'loading') return;
    firstStatus.current ??= state.status;
    if (state.status !== 'signed-in' || firstStatus.current !== 'signed-in') return;
    hardReplace(safeNext(new URLSearchParams(window.location.search).get('next'), locale));
  }, [state.status, locale]);

  return <AppShell variant="bare">{children}</AppShell>;
}
