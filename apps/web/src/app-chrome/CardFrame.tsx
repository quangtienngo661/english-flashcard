'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { DotGridBackground } from '@/ui/DotGridBackground';
import { AppLogo } from './Logo';

/** Classes of the Figma centred card (36:385 and the other card pages): 480 px, padding 24 / 40, radius 28, line border, lift shadow. */
export const AUTH_CARD =
  'flex w-full max-w-120 flex-col gap-4.5 rounded-wm-2xl border border-wm-line bg-wm-surface p-6 shadow-wm-lift md:gap-5 md:p-10';

export function HomeLogoLink({ className }: { className?: string }) {
  const locale = useLocale();
  return (
    <Link href={`/${locale}`} className={`w-fit rounded-wm-sm outline-none focus-visible:outline-3 focus-visible:outline-wm-accent ${className ?? ''}`}>
      <AppLogo />
    </Link>
  );
}

/** The centred card on the dot grid with two glows behind it: the (card) sign-in pages and onboarding (design §5.4). */
export function CardFrame({ children }: { children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="relative isolate flex min-h-dvh flex-col items-center overflow-x-clip px-4 pb-8 pt-5 outline-none md:justify-center md:py-20">
      <DotGridBackground />
      <HomeLogoLink className="mb-6 self-start md:absolute md:left-16 md:top-9 md:mb-0" />
      <div className="relative w-full max-w-120">
        <div aria-hidden className="auth-card-glow absolute -inset-x-24 -inset-y-20 -z-10" />
        <section className={AUTH_CARD}>{children}</section>
      </div>
    </main>
  );
}
