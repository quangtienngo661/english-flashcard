'use client';

import { useTranslations } from 'next-intl';
import { Suspense, type ReactNode } from 'react';
import { DotGridBackground } from '@/ui/DotGridBackground';
import { MobileTabBar } from './MobileTabBar';
import { PhoneHeader } from './PhoneHeader';
import { SearchStrip } from './SearchStrip';
import { TopBar } from './TopBar';

/**
 * The frame of every page under a tab (design §5.4): skip link, a sticky glass header (TopBar from 768 px, PhoneHeader below), the
 * SearchStrip until M4, the content at 1160 px, the phone tab bar and the dot grid. No footer: the Figma app frames have none.
 * Needs AddWordProvider above it (the (chrome) layout).
 */
export function AppChrome({ children }: { children: ReactNode }) {
  const t = useTranslations('App.chrome');
  return (
    <div className="relative isolate flex min-h-dvh flex-col text-wm-ink">
      <DotGridBackground />
      <a
        href="#main"
        className="sr-only z-50 rounded-wm-md bg-wm-accent px-4 py-2 font-wm-sans text-wm-button text-wm-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('skipToContent')}
      </a>
      <header className="sticky top-0 z-40">
        <TopBar />
        <PhoneHeader />
        <Suspense>
          <SearchStrip />
        </Suspense>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-290 flex-1 flex-col px-4 pb-28 pt-6 outline-none md:pb-12 lg:px-8">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
