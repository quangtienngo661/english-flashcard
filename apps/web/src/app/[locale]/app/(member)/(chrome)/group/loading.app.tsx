'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/ui/Skeleton';

// Một nhóm while it loads on a soft navigation (design §5.5, Figma 84:3552): back link, the stack beside the group info, rows.
export default function Loading() {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="h-5 w-32" />
      <div className="flex flex-col items-center gap-5 md:flex-row md:gap-11">
        <Skeleton className="h-50 w-38 rounded-wm-card md:h-74 md:w-52" />
        <div className="flex w-full flex-1 flex-col gap-4">
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-11 w-72" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-11 w-80 rounded-wm-control" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-wm-row" />
      ))}
    </div>
  );
}
