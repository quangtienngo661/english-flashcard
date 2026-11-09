'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { DotGridBackground } from '@/ui/DotGridBackground';
import { AppLogo } from './Logo';

/** The centred card on the dot grid, for sign-in pages and onboarding (replaces AppShell's AuthFrame). */
export function CardFrame({ children }: { children: ReactNode }) {
  const locale = useLocale();
  return (
    <main id="main" tabIndex={-1} className="relative isolate flex min-h-dvh flex-col items-center px-4 py-8 outline-none md:justify-center">
      <DotGridBackground />
      <Link
        href={`/${locale}`}
        className="mb-6 self-start rounded-wm-sm outline-none focus-visible:outline-3 focus-visible:outline-wm-accent md:absolute md:left-8 md:top-8 md:mb-0"
      >
        <AppLogo />
      </Link>
      <div className="w-full max-w-md rounded-wm-2xl bg-wm-surface p-6 shadow-wm-card md:p-8">{children}</div>
    </main>
  );
}
