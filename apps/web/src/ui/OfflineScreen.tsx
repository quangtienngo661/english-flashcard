'use client';

import { WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from './Button';

/** E5: the API cannot be reached; the session is kept and the learner tries again. */
export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('App');
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff aria-hidden className="size-10 text-wm-muted" />
      <h1 className="font-wm-display text-wm-card-title text-wm-ink">{t('session.offlineTitle')}</h1>
      <p className="font-wm-sans text-wm-base text-wm-muted">{t('session.offlineBody')}</p>
      <Button onPress={onRetry}>{t('common.retry')}</Button>
    </div>
  );
}
