'use client';

import { History, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/app-ui/Button';
import { cn } from '@/lib/cn';

export type SourceTone = 'primary' | 'danger' | 'accent' | 'success';

const TONE: Record<SourceTone, string> = {
  primary: 'bg-primary-soft',
  danger: 'bg-danger-soft',
  accent: 'bg-accent-soft',
  success: 'bg-success-soft',
};

export const CHIP = 'inline-flex max-w-full items-center rounded-full border border-border-strong bg-surface px-2.5 py-0.5 text-caption font-semibold text-ink';

type Props = {
  name: string;
  icon: LucideIcon;
  tone: SourceTone;
  body: string;
  /** Words or decks of the source (K/51 chips), or the line saying it is empty. */
  chips: ReactNode;
  /** The start button's text; null when the source is empty. */
  startLabel: string | null;
  onStart: () => void;
  busy: boolean;
  onCustomize: () => void;
  /** Why the last start from this card failed (409 practice-no-words…). */
  error: string | null;
  /** K/55: no session left; the card says when they refill instead of offering a start. */
  reopensAt: string | null;
  /** The title links to the source's own page (Từ hay sai). */
  titleHref?: string;
};

/** One of the four "Luyện theo nguồn khác" cards of K/51 (K/55 when no session is left). */
export function SourceCard({ name, icon: Icon, tone, body, chips, startLabel, onStart, busy, onCustomize, error, reopensAt, titleHref }: Props) {
  const t = useTranslations('App.practice.sources');
  return (
    <li aria-label={name} className={cn('flex min-w-0 flex-col gap-3 rounded-card p-4 shadow-ledge-soft', TONE[tone])}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-title font-semibold text-ink">
          <Icon aria-hidden className="size-5 shrink-0" />
          {titleHref ? (
            <Link href={titleHref} className="truncate rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">
              {name}
            </Link>
          ) : (
            <span className="truncate">{name}</span>
          )}
        </h3>
        <button
          type="button"
          aria-label={t('customize', { name })}
          onClick={onCustomize}
          className="shrink-0 rounded-sm p-1 text-ink outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary"
        >
          <SlidersHorizontal aria-hidden className="size-4" />
        </button>
      </div>
      <p className="text-caption text-muted">{body}</p>
      <div className="flex min-h-7 flex-wrap gap-1.5">{chips}</div>
      <div className="mt-auto flex flex-col gap-2 pt-2">
        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
        {reopensAt ? (
          <p className="flex items-center gap-2 text-ui font-semibold text-ink">
            <History aria-hidden className="size-4" />
            {t('reopens', { time: reopensAt })}
          </p>
        ) : (
          startLabel && (
            <Button variant="quiet" className="w-full" isPending={busy} onPress={onStart}>
              <span className="truncate">{startLabel}</span>
            </Button>
          )
        )}
      </div>
    </li>
  );
}
