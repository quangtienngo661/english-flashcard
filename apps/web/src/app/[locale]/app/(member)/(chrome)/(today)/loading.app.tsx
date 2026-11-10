'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/ui/Skeleton';

// Hôm nay while it loads on a soft navigation (design §5.5, Figma 117:4425): title, the "Ôn tiếp" block, the last practice, the
// row of deck cards; the side column from 1280 px.
export default function Loading() {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="flex flex-col gap-5">
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-11 w-48" />
      <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <Skeleton className="h-64 w-full rounded-wm-2xl" />
          <Skeleton className="h-32 w-full rounded-wm-xl" />
          <div className="flex gap-5 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 w-44 shrink-0 rounded-wm-xl" />
            ))}
          </div>
        </div>
        <div className="flex w-full flex-col gap-4 xl:w-90 xl:shrink-0">
          <Skeleton className="h-52 w-full rounded-wm-xl" />
          <Skeleton className="h-28 w-full rounded-wm-xl" />
        </div>
      </div>
    </div>
  );
}
