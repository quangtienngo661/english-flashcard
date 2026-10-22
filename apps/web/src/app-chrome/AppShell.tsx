'use client';

import { ChevronLeft, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { AppFooter } from './AppFooter';
import { AvatarMenu } from './AvatarMenu';
import { Logo } from './Logo';
import { MobileTabBar } from './MobileTabBar';
import { PlanChip } from './PlanChip';
import { TopBar, type ChromeFeatures } from './TopBar';

export type BackLink = { href: string; label: string };

type Props = {
  /** main: tab pages; sub: a page under a tab (phone shows a back link); full: sessions and Plans; bare: sign-in pages. */
  variant: 'main' | 'sub' | 'full' | 'bare';
  children: ReactNode;
  /** Side column from 1280 px (design §4.7); below that it follows the main content. */
  aside?: ReactNode;
  back?: BackLink;
  /** Thêm từ, the + button and the lookup strip arrive in M3. */
  features?: ChromeFeatures;
  /** Phone + button on Today, Decks and Look up (M3). */
  fab?: boolean;
};

const NO_FEATURES: ChromeFeatures = { addWord: false };

export function AppShell({ variant, children, aside, back, features = NO_FEATURES, fab = false }: Props) {
  const t = useTranslations('App.chrome');
  if (variant === 'full') return <>{children}</>;
  if (variant === 'bare') {
    return (
      <main id="main" className="flex min-h-dvh items-start justify-center px-4 py-10 md:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60 focus:rounded-control focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent">
        {t('skipToContent')}
      </a>
      <header>
        <div className="hidden md:block">
          <TopBar features={features} />
        </div>
        <PhoneHeader back={variant === 'sub' ? back : undefined} />
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-360 flex-1 px-4 pb-24 pt-5 outline-none md:pb-10 lg:px-8">
        {aside ? (
          <div className="flex flex-col gap-6 xl:flex-row">
            <div className="min-w-0 flex-1">{children}</div>
            <aside className="flex w-full flex-col gap-4 xl:w-90 xl:shrink-0">{aside}</aside>
          </div>
        ) : (
          children
        )}
      </main>
      <div className="hidden md:block">
        <AppFooter />
      </div>
      {fab && features.addWord && <Fab />}
      <MobileTabBar />
    </div>
  );
}

/** Phone top bar (Figma `284:9`; sub-page `332:2670`): logo or a back link, the plan chip and the avatar. */
function PhoneHeader({ back }: { back?: BackLink }) {
  const locale = useLocale();
  return (
    <div className="flex h-14 items-center justify-between gap-3 bg-navy px-4 text-on-navy md:hidden">
      {back ? <SubpageBack back={back} /> : (
        <Link href={`/${locale}/app`} className="rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Logo />
        </Link>
      )}
      <div className="flex items-center gap-3">
        <PlanChip />
        <AvatarMenu />
      </div>
    </div>
  );
}

/** "‹ Nhóm", "‹ Cài đặt"… (copy doc §12, point 5). */
export function SubpageBack({ back, tone = 'navy' }: { back: BackLink; tone?: 'navy' | 'surface' }) {
  return (
    <Link
      href={back.href}
      className={cn(
        'flex min-w-0 items-center gap-1 rounded-control py-1 pr-2 text-body font-semibold outline-none focus-visible:ring-2',
        tone === 'navy' ? 'text-on-navy focus-visible:ring-accent' : 'text-primary focus-visible:ring-primary',
      )}
    >
      <ChevronLeft aria-hidden className="size-5 shrink-0" />
      <span className="truncate">{back.label}</span>
    </Link>
  );
}

/** Phone + button (M/10): opens Thêm từ (M3). */
function Fab() {
  const t = useTranslations('App.chrome');
  return (
    <button
      type="button"
      aria-label={t('addWord')}
      className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-inner bg-navy text-on-accent shadow-ledge md:hidden"
    >
      <span className="flex rounded-sm bg-accent p-1">
        <Plus aria-hidden className="size-5" />
      </span>
    </button>
  );
}
