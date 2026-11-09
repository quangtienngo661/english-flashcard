'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/ui/Skeleton';

// A soft navigation inside the chrome (design §5.5): a neutral skeleton, a title and three blocks. Routes with their own layout
// get their own loading file with their milestone (M3–M5).
export default function Loading() {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-36 w-full rounded-wm-xl" />
      <Skeleton className="h-36 w-full rounded-wm-xl" />
      <Skeleton className="h-36 w-full rounded-wm-xl" />
    </div>
  );
}
