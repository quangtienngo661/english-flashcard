'use client';

import { Plus, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { AvatarMenu } from './AvatarMenu';
import { Logo } from './Logo';
import { currentTab, TABS } from './nav';
import { PlanChip } from './PlanChip';

export type ChromeFeatures = { addWord: boolean };

/** K/10 tier 1 (Figma `254:333`): navy bar with the four tabs, Thêm từ, Gói học + plan, Cài đặt, avatar. From 768 px. */
export function TopBar({ features, onAddWord }: { features: ChromeFeatures; onAddWord?: () => void }) {
  const t = useTranslations('App.chrome');
  const locale = useLocale();
  const active = currentTab(usePathname());

  return (
    <div className="bg-navy text-on-navy">
      <div className="mx-auto flex h-16 max-w-360 items-center justify-between gap-6 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <Link href={`/${locale}/app`} className="shrink-0 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <Logo />
          </Link>
          <nav aria-label={t('mainNav')} className="flex items-center gap-1.5">
            {TABS.map(({ id, path, icon: Icon }) => {
              const isActive = id === active;
              return (
                <Link
                  key={id}
                  href={`/${locale}${path}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-control py-2.5 pl-3 pr-3.5 text-body outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    isActive ? 'bg-accent font-semibold text-on-accent' : 'font-medium text-on-navy hover:bg-navy-raised',
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {t(`tabs.${id}`)}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {features.addWord && (
            <button
              type="button"
              onClick={onAddWord}
              className="flex items-center gap-2.5 rounded-control bg-navy-raised px-2.5 py-2 text-body font-semibold text-on-navy outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span aria-hidden className="flex rounded-sm bg-accent p-0.5 text-on-accent">
                <Plus className="size-4" />
              </span>
              {t('addWord')}
              <kbd className="rounded-sm border border-on-navy-muted px-1.5 text-caption text-on-navy-muted">N</kbd>
            </button>
          )}
          <Link
            href={`/${locale}/app/plans`}
            className="flex items-center gap-2 rounded-control px-1 py-2 text-body font-medium text-on-navy outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('plans')}
            <PlanChip />
          </Link>
          <Link
            href={`/${locale}/app/settings`}
            aria-label={t('settings')}
            className="rounded-control p-2 text-on-navy outline-none hover:bg-navy-raised focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Sun aria-hidden className="size-5.5" />
          </Link>
          <AvatarMenu />
        </div>
      </div>
    </div>
  );
}
