'use client';

import { LoaderCircle, SearchX, WifiOff } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from './Button';

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
      <Button onPress={onRetry}>{t('common.retry')}</Button>
    </div>
  );
}

/** Nothing here yet: what is missing, the next step, and its button (copy doc §3.1). */
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6">
      <h2 className="text-title font-bold text-ink">{title}</h2>
      {body && <p className="text-body text-muted">{body}</p>}
      {action}
    </div>
  );
}

/** A section failed to load; the rest of the page stays. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations('App.common');
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6">
      <p className="text-body text-ink">{message}</p>
      <Button variant="quiet" onPress={onRetry}>
        {t('retry')}
      </Button>
    </div>
  );
}

/** E17: a stale or wrong link (deleted deck, unknown word); `back` names where to go instead. */
export function NotFoundState({ title, back }: { title?: string; back?: { href: string; label: string } }) {
  const t = useTranslations('App.common');
  const locale = useLocale();
  const link = back ?? { href: `/${locale}/app`, label: t('home') };
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6">
      <SearchX aria-hidden className="size-8 text-muted" />
      <h1 className="text-title font-bold text-ink">{title ?? t('notFoundTitle')}</h1>
      <p className="text-body text-muted">{t('notFoundBody')}</p>
      <Link href={link.href} className="font-semibold text-primary underline underline-offset-2">
        {link.label}
      </Link>
    </div>
  );
}
