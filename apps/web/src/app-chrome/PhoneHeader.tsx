'use client';

import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { AvatarMenu } from './AvatarMenu';
import { AppLogo } from '@/ui/Logo';

/** Figma "Thanh trên app/Mobile" (54:503), below 768 px: logo, a search button to Tra từ, the avatar. */
export function PhoneHeader() {
  const t = useTranslations('App.chrome');
  const locale = useLocale();
  return (
    <div className="flex h-14 items-center justify-between gap-3 border-b border-wm-line/80 bg-wm-surface/80 px-4 backdrop-blur-wm-glass backdrop-saturate-160 md:hidden">
      <Link href={`/${locale}/app`} className="rounded-wm-control outline-none focus-visible:outline-3 focus-visible:outline-wm-accent">
        <AppLogo />
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href={`/${locale}/app/lookup`}
          aria-label={t('search.placeholder')}
          className="flex size-11 items-center justify-center rounded-wm-pill bg-wm-bg text-wm-ink outline-none focus-visible:outline-3 focus-visible:outline-wm-accent"
        >
          <Search aria-hidden className="size-5" />
        </Link>
        <AvatarMenu />
      </div>
    </div>
  );
}
