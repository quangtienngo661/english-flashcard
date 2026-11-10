'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

/** A placeholder block while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-wm-md bg-wm-line motion-safe:animate-pulse', className)} />;
}

/**
 * The whole-page skeleton of a hard load (design §5.5). `chrome` draws the top bar and, on phones, the tab bar; `bare` (sessions,
 * onboarding, auth) only the content. Announced as "Đang tải…".
 */
export function SkeletonPage({ shape }: { shape: 'chrome' | 'bare' }) {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="min-h-dvh bg-wm-bg">
      <span className="sr-only">{t('loading')}</span>
      {shape === 'chrome' && <Skeleton className="h-16 rounded-none md:h-18" />}
      <div className="mx-auto flex w-full max-w-320 flex-col gap-4 px-4 pt-6 md:px-8">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-36 w-full rounded-wm-xl" />
        <Skeleton className="h-36 w-full rounded-wm-xl" />
        <Skeleton className="h-36 w-full rounded-wm-xl" />
      </div>
      {shape === 'chrome' && <Skeleton className="fixed inset-x-0 bottom-0 h-16 rounded-none md:hidden" />}
    </div>
  );
}
