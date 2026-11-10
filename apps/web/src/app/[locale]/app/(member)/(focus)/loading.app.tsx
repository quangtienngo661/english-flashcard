'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/ui/Skeleton';

// A session (practice, Học, Ôn) while it loads on a soft navigation (design §5.5): the session bar and the question card.
export default function Loading() {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="mx-auto flex w-full max-w-190 flex-col gap-5 px-4 pt-4 md:px-0 md:pt-10">
      <span className="sr-only">{t('loading')}</span>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-wm-md md:size-9" />
        <Skeleton className="h-1.5 flex-1" />
      </div>
      <Skeleton className="h-72 w-full rounded-wm-xl" />
    </div>
  );
}
