'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { safeNext } from '@/app-shell/locale-prefix';
import { hardReplace } from '@/app-shell/navigate';
import { useSession } from '@/app-shell/session/session-context';
import type { AppLocale } from '@/i18n/routing';

/** Password pages a signed-in learner may open: a Google-only account sets its first password through them (B8-2). */
const OPEN_WHEN_SIGNED_IN = /\/app\/(forgot|reset)-password\/?$/;

/**
 * Sign-in pages: a learner who is already signed in when the page opens goes on to `?next` (or Today) instead of seeing the
 * form. A sign-in or sign-up made on the page itself is left to the form, which knows where to go next (verify-email…).
 * The forgot and reset password pages are the exception: they serve a learner who is signed in too.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useSession();
  const pathname = usePathname();
  const locale = useLocale() as AppLocale;
  // The first answer of the session start: only a page opened while signed in redirects.
  const firstStatus = useRef<string | null>(null);

  useEffect(() => {
    if (state.status === 'loading') return;
    firstStatus.current ??= state.status;
    if (state.status !== 'signed-in' || firstStatus.current !== 'signed-in') return;
    if (OPEN_WHEN_SIGNED_IN.test(pathname)) return;
    hardReplace(safeNext(new URLSearchParams(window.location.search).get('next'), locale));
  }, [state.status, locale, pathname]);

  return <AppShell variant="bare">{children}</AppShell>;
}
