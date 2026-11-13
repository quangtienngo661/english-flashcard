'use client';

import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useAddWord } from '@/features/learner/add-word/add-word-context';
import { cn } from '@/lib/cn';
import { AvatarMenu } from './AvatarMenu';
import { AppLogo } from '@/ui/Logo';
import { currentTab, TABS } from './nav';
import { PlanChipLink } from './PlanChip';
import { TopSearch } from './TopSearch';

/**
 * Figma "Thanh trên app/Desktop" (54:502), from 768 px: logo, the four tabs (the open one on accent-soft), Thêm từ with the N key,
 * the search box with "/", the quiet plan chip, the avatar. Glass: white 80% with a 24px blur, a line below, no shadow (design §3.1).
 * On Tra từ the search box is left out: the page's own big box takes "/" (giao diện mới M4.3).
 */
export function TopBar() {
  const t = useTranslations('App.chrome');
  const locale = useLocale();
  const pathname = usePathname();
  const active = currentTab(pathname);
  const onLookup = /\/app\/lookup$/.test(pathname);
  const addWord = useAddWord();
  return (
    <div className="hidden h-16 items-center gap-2 border-b lg:gap-5 border-wm-line/80 bg-wm-surface/80 px-4 backdrop-blur-wm-glass backdrop-saturate-160 md:flex lg:px-8">
      <Link href={`/${locale}/app`} className="shrink-0 rounded-wm-control outline-none focus-visible:outline-3 focus-visible:outline-wm-accent">
        <AppLogo />
      </Link>
      <nav aria-label={t('mainNav')} className="flex shrink-0 items-center gap-0.5 lg:gap-1">
        {TABS.map(({ id, path, icon: Icon }) => {
          const isActive = id === active;
          return (
            <Link
              key={id}
              href={`/${locale}${path}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-wm-control px-2 py-2 lg:px-3 font-wm-sans text-wm-button outline-none focus-visible:outline-3 focus-visible:outline-wm-accent',
                isActive ? 'bg-wm-accent-soft text-wm-accent' : 'text-wm-muted hover:text-wm-ink',
              )}
            >
              {/* 768–1023 px: no icons and smaller gaps, so the Vietnamese tab names stay on one line next to Thêm từ. */}
              <Icon aria-hidden className="hidden size-4 lg:block" />
              {t(`tabs.${id}`)}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      {!onLookup && (
        // useSearchParams needs its own boundary, so the rest of the bar never waits for it.
        <Suspense>
          <TopSearch />
        </Suspense>
      )}
      <button
        type="button"
        onClick={() => addWord.open()}
        className="flex min-h-10 shrink-0 items-center gap-2 rounded-wm-control bg-wm-accent py-2 pl-4 pr-3 font-wm-sans text-wm-button text-wm-on-accent shadow-wm-btn outline-none transition duration-200 ease-wm-out-strong hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent motion-safe:active:scale-97"
      >
        <Plus aria-hidden className="size-4" />
        {t('addWord')}
        <kbd className="hidden rounded-wm-key border border-wm-on-accent/45 bg-wm-on-accent/18 px-1.5 font-wm-sans text-wm-meta text-wm-on-accent lg:block">N</kbd>
      </button>
      <PlanChipLink />
      <AvatarMenu />
    </div>
  );
}
