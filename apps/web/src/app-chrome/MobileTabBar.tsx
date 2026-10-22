'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { currentTab, TABS } from './nav';

/** Phone tab bar (Figma `284:156`): below 768 px only, fixed to the bottom. */
export function MobileTabBar() {
  const t = useTranslations('App.chrome');
  const locale = useLocale();
  const active = currentTab(usePathname());

  return (
    <nav
      aria-label={t('mainNav')}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface pb-safe md:hidden"
    >
      {TABS.map(({ id, path, icon: Icon }) => {
        const isActive = id === active;
        return (
          <Link
            key={id}
            href={`/${locale}${path}`}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-col items-center gap-1 py-2 text-caption outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <span className={cn('flex h-8 w-14 items-center justify-center rounded-full', isActive && 'bg-accent text-on-accent')}>
              <Icon aria-hidden className="size-5" />
            </span>
            <span className={isActive ? 'font-semibold text-ink' : 'text-muted'}>{t(`tabs.${id}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
