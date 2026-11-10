'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from './Button';

// The new look of app-ui/States (giao diện mới M4): same props, wm tokens. A section that is empty or failed; the rest of the page stays.

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-wm-xl bg-wm-surface p-6 shadow-wm-card">
      <h2 className="break-words font-wm-display text-wm-card-title text-wm-ink">{title}</h2>
      {body && <p className="font-wm-sans text-wm-base text-wm-muted">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations('App.common');
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-wm-xl bg-wm-surface p-6 shadow-wm-card">
      <p className="font-wm-sans text-wm-base text-wm-ink">{message}</p>
      <Button variant="secondary" onPress={onRetry}>
        {t('retry')}
      </Button>
    </div>
  );
}
