'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { currentTab, TABS } from './nav';

/** Figma "Thanh tab dưới" (54:637): below 768 px, fixed to the bottom; on a page under no tab nothing is lit (Tab=Không, 149:4381). */
export function MobileTabBar() {
  const t = useTranslations('App.chrome');
  const locale = useLocale();
  const active = currentTab(usePathname());
  return (
    <nav
      aria-label={t('mainNav')}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-wm-line/80 bg-wm-surface/90 px-2 pb-safe pt-1.5 backdrop-blur-wm-glass md:hidden"
    >
      {TABS.map(({ id, path, icon: Icon }) => {
        const isActive = id === active;
        return (
          <Link
            key={id}
            href={`/${locale}${path}`}
            aria-current={isActive ? 'page' : undefined}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-wm-control outline-none focus-visible:outline-3 focus-visible:outline-wm-accent"
          >
            <span className={cn('flex h-7 w-12 items-center justify-center rounded-wm-pill', isActive && 'bg-wm-accent-soft text-wm-accent')}>
              <Icon aria-hidden className={cn('size-5', !isActive && 'text-wm-muted')} />
            </span>
            <span className={cn('font-wm-sans text-wm-caption', isActive ? 'font-semibold text-wm-accent' : 'text-wm-muted')}>
              {t(`tabs.${id}`)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
