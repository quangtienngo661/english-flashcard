'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { AppBackground } from '@/ui/AppBackground';
import { FloatingButtons } from './FloatingButtons';
import { MobileTabBar } from './MobileTabBar';
import { PhoneHeader } from './PhoneHeader';
import { TopBar } from './TopBar';

// The last row scrolls clear of the floating buttons: tab bar + 100 px on phones, 124 px on desktop (M6 Figma A §6). From 768 px a 112 px
// right lane keeps content off the calendar button (32 px from the edge + 62 px wide, QA4) until the page's own margin is wide enough:
// content ends (width − 1280) / 2 + 32 px from the edge, ≥ 102 px from 1420 px; 1440 px leaves room for a 17 px classic scrollbar.
// raw-ok: see the comment above
const MAIN = 'mx-auto w-full max-w-320 flex-1 px-4 pb-[calc(10.125rem+env(safe-area-inset-bottom))] pt-6 outline-none md:pb-31 md:pr-28 lg:pl-8 min-[90rem]:pr-8';

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
        className="sr-only z-50 rounded-wm-control bg-wm-accent px-4 py-2 font-wm-sans text-wm-button text-wm-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
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
