'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/ui/Skeleton';

// Nhóm while it loads on a soft navigation (design §5.5, Figma 82:3213): title, the picker button, the centre stack, the actions.
export default function Loading() {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="flex flex-col gap-5">
      <span className="sr-only">{t('loading')}</span>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-12 w-44 rounded-wm-control" />
      </div>
      <Skeleton className="mx-auto mt-6 h-67 w-52 rounded-wm-dialog md:h-92 md:w-72" />
      <Skeleton className="mx-auto h-11 w-80 rounded-wm-control" />
    </div>
  );
}
