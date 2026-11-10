'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/ui/Skeleton';

// Tra từ while it loads on a soft navigation (design §5.5, Figma 85:3218): the search box, the filter sentence, the page and the card.
export default function Loading() {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="h-11 w-full rounded-wm-lg md:h-12" />
      <Skeleton className="h-7 w-80 max-w-full" />
      <div
        // raw-ok: the same two columns as the page
        className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_23.75rem]"
      >
        <Skeleton className="h-150 rounded-wm-md" />
        <Skeleton className="order-first h-80 rounded-wm-xl lg:order-none" />
      </div>
    </div>
  );
}
