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
  if (variant === 'bare') return <AuthFrame>{children}</AuthFrame>;

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

/**
 * K/01–K/06: navy story panel on the left from 1024 px, the form card on a faint pattern of study objects on the right
 * (copy doc §15, point 1; 12% opacity). Phones show the logo and the card.
 */
function AuthFrame({ children }: { children: ReactNode }) {
  const t = useTranslations('App.auth');
  const locale = useLocale();
  return (
    <div className="flex min-h-dvh">
      <aside className="relative hidden w-2/5 shrink-0 flex-col justify-between overflow-hidden bg-navy p-12 text-on-navy lg:flex">
        <Link href={`/${locale}`} className="w-fit rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Logo />
        </Link>
        <div className="flex max-w-lg flex-col gap-4">
          <p className="text-h2 font-bold">{t('heroTitle')}</p>
          <p className="text-body text-on-navy-muted">{t('heroBody')}</p>
        </div>
        <div aria-hidden className="relative h-56">
          <div className="absolute bottom-6 left-0 flex h-36 w-52 -rotate-3 flex-col items-center justify-center rounded-card bg-surface text-ink shadow-ledge-card">
            <span className="text-h3 font-bold">deploy</span>
            <span className="text-caption text-muted">verb</span>
          </div>
          <div className="absolute bottom-16 left-48 flex h-36 w-52 rotate-6 flex-col items-center justify-center rounded-card bg-accent text-on-accent shadow-ledge-accent">
            <span className="text-h3 font-bold">went</span>
            <span className="text-caption">quá khứ của go</span>
          </div>
        </div>
      </aside>
      <main id="main" className="relative flex flex-1 flex-col items-center overflow-hidden bg-canvas px-4 py-8 md:justify-center">
        <StudyPattern />
        <Link href={`/${locale}`} className="relative mb-6 self-start rounded-control outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden">
          <Logo tone="surface" />
        </Link>
        <div className="relative w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

/** "(mờ) Nền họa tiết học từ (web)": decoration only, never read aloud, hidden on phones. */
function StudyPattern() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden select-none text-ink opacity-12 md:block">
      <span className="absolute left-1/12 top-1/8 rounded-full border-2 border-current px-3 py-1 text-caption font-semibold">✓ Đã biết</span>
      <span className="absolute left-2/5 top-1/8 bg-accent px-1 text-title font-bold">remember</span>
      <span className="absolute right-1/16 top-1/12 flex h-24 w-40 rotate-6 items-center justify-center rounded-card border-2 border-current text-title font-bold">cache</span>
      <span className="absolute right-1/10 top-2/5 text-title font-bold tracking-widest">— — — —</span>
      <span className="absolute bottom-1/5 left-1/12 flex h-24 w-40 -rotate-3 items-center justify-center rounded-card border-2 border-current text-title font-bold">went</span>
      <span className="absolute bottom-1/12 left-2/5 text-title font-bold">leave · left · left</span>
      <span className="absolute bottom-1/8 right-1/8 text-display font-bold">?</span>
    </div>
  );
}
