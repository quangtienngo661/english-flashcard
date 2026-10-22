'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { safeNext } from '@/app-shell/locale-prefix';
import { useSession } from '@/app-shell/session/session-context';
import type { AppLocale } from '@/i18n/routing';

/** Sign-in pages: a learner who is already signed in goes on to `?next` (or Today) instead of seeing the form. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useSession();
  const router = useRouter();
  const locale = useLocale() as AppLocale;

  useEffect(() => {
    if (state.status !== 'signed-in') return;
    router.replace(safeNext(new URLSearchParams(window.location.search).get('next'), locale));
  }, [state.status, router, locale]);

  return <AppShell variant="bare">{children}</AppShell>;
}
