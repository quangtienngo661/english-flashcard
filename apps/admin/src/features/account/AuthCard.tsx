import type { ReactNode } from 'react';
import { useTranslations } from 'use-intl';

/** Logo above a centred card (Figma `account/*`): the card is `min(100% - 2rem, 25rem)` wide. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const t = useTranslations();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg px-page-pad-min py-10 shell:px-page-pad-max">
      <div className="flex items-center gap-2">
        <span aria-hidden className="flex size-8 items-center justify-center rounded-control bg-primary text-ui font-semibold text-on-primary">
          W
        </span>
        <span translate="no" className="text-xl font-semibold text-ink">
          {t('shell.brand')}
        </span>
      </div>
      <section className="flex w-full max-w-auth-card-max flex-col gap-4 rounded-panel bg-surface p-7 shadow-card">
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="break-words text-ui text-muted">{subtitle}</p>}
        {children}
      </section>
    </main>
  );
}
