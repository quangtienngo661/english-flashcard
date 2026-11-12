'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { AppBackground } from '@/ui/AppBackground';
import { FloatingButtons } from './FloatingButtons';
import { MobileTabBar } from './MobileTabBar';
import { PhoneHeader } from './PhoneHeader';
import { TopBar } from './TopBar';

// raw-ok: the last row scrolls clear of the floating buttons: tab bar + 100 px on phones, 124 px on desktop (M6 Figma A §6)
const MAIN = 'mx-auto w-full max-w-320 flex-1 px-4 pb-[calc(10.125rem+env(safe-area-inset-bottom))] pt-6 outline-none md:pb-31 lg:px-8';

/**
 * The frame of every page under a tab (design §5.4): skip link, a sticky glass header (TopBar with the search box from 768 px,
 * PhoneHeader below), the content at 1160 px, the phone tab bar and the mesh background. No footer: the Figma app frames have none.
 * Needs AddWordProvider above it (the (chrome) layout).
 */
export function AppChrome({ children }: { children: ReactNode }) {
  const t = useTranslations('App.chrome');
  return (
    <div className="relative isolate flex min-h-dvh flex-col text-wm-ink">
      <AppBackground />
      <a
        href="#main"
        className="sr-only z-50 rounded-wm-md bg-wm-accent px-4 py-2 font-wm-sans text-wm-button text-wm-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('skipToContent')}
      </a>
      <header className="sticky top-0 z-40">
        <TopBar />
        <PhoneHeader />
      </header>
      <main id="main" tabIndex={-1} className={MAIN}>
        {children}
      </main>
      <MobileTabBar />
      <FloatingButtons />
    </div>
  );
}
