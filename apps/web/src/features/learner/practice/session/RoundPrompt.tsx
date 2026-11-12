'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/ui/Button';
import type { PracticeSessionView } from '../practice-api';
import { useSummary } from './SessionSummary';

/** K/65: the words ran out before the question count; asked once (Bước 4 §7.2). */
export function RoundPrompt({ session, onContinue, busy }: { session: PracticeSessionView; onContinue: (go: boolean) => void; busy: boolean }) {
  const t = useTranslations('App.practice.session.round');
  const summary = useSummary(session.id);
  const left = Math.max(0, session.target_count - session.asked);
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-wm-card border border-wm-line bg-wm-surface p-5 shadow-wm-card md:p-6">
        <span className="w-fit rounded-full bg-wm-accent px-2.5 py-0.5 text-wm-label text-wm-on-accent">{t('chip', { round: session.round })}</span>
        <h1 className="font-wm-display text-wm-card-title text-wm-ink">{t('title', { words: session.words })}</h1>
        <p className="text-wm-small text-wm-muted">{t('body', { target: session.target_count, words: session.words, left })}</p>
        {summary.data && (
          <p className="flex gap-2">
            <span className="rounded-full bg-wm-pass-soft px-2 py-0.5 text-wm-label text-wm-ink">{t('correct', { count: summary.data.correct })}</span>
            <span className="rounded-full bg-wm-fail-soft px-2 py-0.5 text-wm-label text-wm-ink">{t('wrong', { count: summary.data.wrong })}</span>
          </p>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="primary" size="lg" className="justify-between" isPending={busy} onPress={() => onContinue(true)}>
          <span className="flex items-center gap-2">
            <RotateCcw aria-hidden className="size-4" />
            {t('go', { left })}
          </span>
        </Button>
        <Button variant="secondary" size="lg" className="justify-between" isDisabled={busy} onPress={() => onContinue(false)}>
          {t('stop')}
        </Button>
      </div>
      <p className="text-wm-caption text-wm-muted">{t('note')}</p>
    </div>
  );
}
