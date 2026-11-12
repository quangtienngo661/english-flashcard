'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { AppBackground } from './AppBackground';

/** A placeholder block while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-wm-row bg-wm-line motion-safe:animate-pulse', className)} />;
}

/** A soft navigation inside the chrome (design §5.5): a title block and three card blocks, announced as "Đang tải…". */
export function SkeletonBlocks() {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-36 w-full rounded-wm-card" />
      <Skeleton className="h-36 w-full rounded-wm-card" />
      <Skeleton className="h-36 w-full rounded-wm-card" />
    </div>
  );
}

export type SkeletonShape = 'chrome' | 'columns' | 'carousel' | 'bare';

/** The glass of the real bars (TopBar, PhoneHeader): white 80%, a hairline below. */
const GLASS = 'border-wm-line/80 bg-wm-surface/80 backdrop-blur-wm-glass backdrop-saturate-160';

/** Slots where the logo, tabs, search box, Thêm từ and avatar of the 64 px desktop bar (TopBar) sit. */
function DesktopBar() {
  return (
    <div className={`hidden h-16 items-center gap-3 border-b px-4 md:flex lg:gap-5 lg:px-8 ${GLASS}`}>
      <Skeleton className="h-6 w-28 shrink-0" />
      <div className="hidden items-center gap-1 lg:flex">
        {[0, 1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-9 w-24 rounded-wm-control" />
        ))}
      </div>
      <div className="flex-1" />
      <Skeleton className="h-9.5 w-65 min-w-32 shrink rounded-wm-control" />
      <Skeleton className="h-10 w-28 shrink-0 rounded-wm-control" />
      <Skeleton className="size-9 shrink-0 rounded-wm-pill" />
    </div>
  );
}

/** The 56 px phone bar (PhoneHeader): logo, search button, avatar. */
function PhoneBar() {
  return (
    <div className={`flex h-14 items-center justify-between gap-3 border-b px-4 md:hidden ${GLASS}`}>
      <Skeleton className="h-6 w-28" />
      <div className="flex items-center gap-2">
        <Skeleton className="size-11 rounded-wm-pill" />
        <Skeleton className="size-9 rounded-wm-pill" />
      </div>
    </div>
  );
}

/** The phone tab bar (MobileTabBar): four slots of the same height on the same surface. */
function PhoneTabBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-wm-line/80 bg-wm-surface/90 px-2 pb-safe pt-1.5 backdrop-blur-wm-glass md:hidden">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="flex min-h-14 flex-col items-center justify-center gap-1">
          <Skeleton className="h-7 w-12 rounded-wm-pill" />
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

function Content({ shape }: { shape: SkeletonShape }) {
  if (shape === 'columns') {
    // Hôm nay and Luyện tập (PageColumns): two columns from 1280 px, one below.
    return (
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-72 w-full rounded-wm-card" />
          <Skeleton className="h-36 w-full rounded-wm-card" />
        </div>
        <div className="flex w-full flex-col gap-4 xl:w-90 xl:shrink-0">
          <Skeleton className="h-44 w-full rounded-wm-card" />
          <Skeleton className="h-36 w-full rounded-wm-card" />
        </div>
      </div>
    );
  }
  if (shape === 'carousel') {
    // Nhóm: one carousel, a centred card over a track, then the info row.
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-56" />
        <div className="relative flex h-96 items-center justify-center">
          <Skeleton className="absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 rounded-wm-card opacity-60" />
          <Skeleton className="relative h-80 w-72 rounded-wm-card" />
        </div>
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-36 w-full rounded-wm-card" />
      <Skeleton className="h-36 w-full rounded-wm-card" />
      <Skeleton className="h-36 w-full rounded-wm-card" />
    </div>
  );
}

/**
 * The whole-page skeleton of a hard load (design §5.5), drawn as the page it stands for: the mesh background, the glass bars where
 * the real ones sit, content from the same y and, for Hôm nay, Luyện tập and Nhóm, the page's own columns. `bare` (sessions,
 * onboarding, auth) has no bars. Announced as "Đang tải…".
 */
export function SkeletonPage({ shape }: { shape: SkeletonShape }) {
  const t = useTranslations('App.common');
  const chrome = shape !== 'bare';
  return (
    <div role="status" aria-label={t('loading')} className="relative isolate flex min-h-dvh flex-col">
      <AppBackground />
      {chrome && (
        <div className="sticky top-0 z-40">
          <DesktopBar />
          <PhoneBar />
        </div>
      )}
      <div className="mx-auto w-full max-w-320 flex-1 px-4 pt-6 lg:px-8">
        <Content shape={shape} />
      </div>
      {chrome && <PhoneTabBar />}
    </div>
  );
}
