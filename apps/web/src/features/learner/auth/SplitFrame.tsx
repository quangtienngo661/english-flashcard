'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AUTH_CARD, HomeLogoLink } from '@/app-chrome/CardFrame';
import { cn } from '@/lib/cn';
import { AppBackground } from '@/ui/AppBackground';
import { AuthShowcase } from './AuthShowcase';

/**
 * Sign-in and sign-up (Figma 35:308, 35:405; design §5.4). From 1280 px: the form column (logo, a 400 px form, the footer) beside the
 * 640 px brand panel. Narrower: the same centred card as the other sign-in pages, with no panel and no footer (Figma 37:485, 37:533).
 */
export function SplitFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <main id="main" tabIndex={-1} className="relative isolate flex min-h-dvh overflow-x-clip outline-none xl:gap-0 xl:p-4">
      <AppBackground />
      <div className="flex min-w-0 flex-1 flex-col items-center px-4 pb-8 pt-5 md:justify-center md:py-20 xl:justify-start xl:px-12 xl:pb-6 xl:pt-5">
        <HomeLogoLink className="mb-6 self-start md:absolute md:left-16 md:top-9 md:mb-0 xl:static xl:mb-0" />
        <div className="relative w-full max-w-120 xl:my-auto xl:max-w-100 xl:py-10">
          <div aria-hidden className="auth-card-glow absolute -inset-x-24 -inset-y-20 -z-10 xl:hidden" />
          <section className={cn(AUTH_CARD, 'xl:max-w-none xl:gap-4 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none')}>{children}</section>
        </div>
        <AuthFooter />
      </div>
      <div className="hidden w-160 shrink-0 xl:block">
        <AuthShowcase variant={/\/register\/?$/.test(pathname) ? 'de12' : 'ngan'} />
      </div>
    </main>
  );
}

function AuthFooter() {
  const t = useTranslations('App.auth.footer');
  const locale = useLocale();
  const link = 'rounded-wm-sm outline-none hover:text-wm-ink focus-visible:outline-3 focus-visible:outline-wm-accent';
  return (
    <footer className="hidden w-full gap-5 font-wm-sans text-wm-caption text-wm-muted xl:flex">
      <span>{t('copyright', { year: new Date().getFullYear() })}</span>
      <Link href={`/${locale}/privacy`} className={link}>
        {t('privacy')}
      </Link>
      <Link href={`/${locale}/terms`} className={link}>
        {t('terms')}
      </Link>
    </footer>
  );
}
