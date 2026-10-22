'use client';

import { LoaderCircle, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Whole-screen wait while the session starts (RequireSession). */
export function FullScreenSpinner() {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted">
      <LoaderCircle aria-hidden className="size-8 motion-safe:animate-spin" />
      <span className="text-ui">{t('loading')}</span>
    </div>
  );
}

/** E5: the API cannot be reached; the session is kept and the learner tries again. */
export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('App');
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff aria-hidden className="size-10 text-muted" />
      <h1 className="text-title font-bold text-ink">{t('session.offlineTitle')}</h1>
      <p className="text-body text-muted">{t('session.offlineBody')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-control rounded-control bg-primary px-5 font-semibold text-on-primary shadow-button"
      >
        {t('common.retry')}
      </button>
    </div>
  );
}
