'use client';

import { ArrowRight, History, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';

/** A source's tag (Figma "Nguồn" rows): `--bg`, radius 6, 13 px; `fail` for the weak words. */
export const CHIP = 'inline-flex max-w-full items-center rounded-wm-sm bg-wm-bg px-2 py-0.5 font-wm-sans text-wm-label text-wm-ink';
export const CHIP_FAIL = 'inline-flex max-w-full items-center rounded-wm-sm bg-wm-fail-soft px-2 py-0.5 font-wm-sans text-wm-label text-wm-fail';

/** Owner 10/11/2026: each source has its own colour, so the four rows read apart at a glance. */
export type SourceTone = 'accent' | 'fail' | 'mark' | 'pass';
const TILE: Record<SourceTone, string> = {
  accent: 'bg-wm-accent-soft text-wm-accent',
  fail: 'bg-wm-fail-soft text-wm-fail',
  mark: 'bg-wm-mark/35 text-wm-mark-ink',
  pass: 'bg-wm-pass-soft text-wm-pass',
};
const START: Record<SourceTone, string> = {
  accent: 'text-wm-accent',
  fail: 'text-wm-fail',
  mark: 'text-wm-mark-ink',
  pass: 'text-wm-pass',
};

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
  /** Why the last start from this row failed (409 practice-no-words…). */
  error: string | null;
  /** K/55: no session left; the row says when they refill instead of offering a start. */
  reopensAt: string | null;
  /** The title links to the source's own page (Từ hay sai). */
  titleHref?: string;
};

/** One row of the "Luyện theo nguồn khác" card (Figma 99:3169; K/51, K/55 when no session is left). */
export function SourceCard({ name, icon: Icon, tone, body, chips, startLabel, onStart, busy, onCustomize, error, reopensAt, titleHref }: Props) {
  const t = useTranslations('App.practice.sources');
  const starts = !reopensAt && startLabel;
  return (
    <li aria-label={name} className="flex gap-4 border-t border-wm-line py-4 first:border-t-0 md:items-center md:gap-5">
      <span aria-hidden className={cn('flex size-11 shrink-0 items-center justify-center rounded-wm-lg', TILE[tone])}>
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="font-wm-display text-wm-word text-wm-ink">
            {titleHref ? (
              <Link href={titleHref} className="rounded-wm-sm outline-none hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent">
                {name}
              </Link>
            ) : (
              name
            )}
          </h3>
          <p className="font-wm-sans text-wm-small text-wm-muted">{body}</p>
          <div className="flex min-h-6 flex-wrap gap-1.5">{chips}</div>
          {error && (
            <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
              {error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
          {reopensAt && (
            <p className="flex items-center gap-2 font-wm-sans text-wm-small-strong text-wm-ink">
              <History aria-hidden className="size-4" />
              {t('reopens', { time: reopensAt })}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {starts && (
              <Button
                variant="secondary"
                className={cn('min-h-10 px-4', START[tone])}
                isDisabled={busy}
                onPress={onStart}
              >
                <span className="truncate">{startLabel}</span>
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            )}
            {/* Owner 10/11/2026: a boxed button with its word, so it is seen (was an icon next to the start, 27/10/2026). */}
            <Button variant="secondary" className="min-h-10 px-3.5" aria-label={t('customize', { name })} onPress={onCustomize}>
              <SlidersHorizontal aria-hidden className="size-4" />
              {t('customizeButton')}
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
