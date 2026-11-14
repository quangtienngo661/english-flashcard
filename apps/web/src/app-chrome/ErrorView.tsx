'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/ui/Button';

/** What a route's error.app.tsx shows (design §5.5): what happened and one way out. Only the middle of the page is replaced. */
export function ErrorView({ retry }: { retry: () => void }) {
  const t = useTranslations('App.common');
  return (
    <div role="alert" className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="font-wm-display text-wm-card-title text-wm-ink">{t('errorPageTitle')}</h1>
      <Button onPress={retry}>{t('retry')}</Button>
    </div>
  );
}
