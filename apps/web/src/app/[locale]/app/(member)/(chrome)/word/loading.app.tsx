'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/ui/Skeleton';

// Trang một từ while it loads on a soft navigation (design §5.5, Figma 118:4413): the back link, the title, the readings, the tabs,
// the meanings card and, from 1024 px, the right column.
export default function Loading() {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="flex flex-col gap-5">
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="h-5 w-20" />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-7">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Skeleton className="h-14 w-56 max-w-full md:h-20 md:w-80" />
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-72 rounded-wm-xl" />
        </div>
        <Skeleton className="h-64 rounded-wm-xl lg:w-80 lg:shrink-0" />
      </div>
    </div>
  );
}
