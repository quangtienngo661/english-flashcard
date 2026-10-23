'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app-ui/Button';
import type { PracticeSessionView } from '../practice-api';
import { KBD } from './QuestionCard';
import { useSummary } from './SessionSummary';

/** K/65: the words ran out before the question count; asked once (Bước 4 §7.2). */
export function RoundPrompt({ session, onContinue, busy }: { session: PracticeSessionView; onContinue: (go: boolean) => void; busy: boolean }) {
  const t = useTranslations('App.practice.session.round');
  const summary = useSummary(session.id);
  const left = Math.max(0, session.target_count - session.asked);
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-feature border-2 border-border-strong bg-surface p-5 shadow-ledge md:p-6">
        <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-on-accent">{t('chip', { round: session.round })}</span>
        <h1 className="text-h2 font-extrabold text-ink">{t('title', { words: session.words })}</h1>
        <p className="text-ui text-muted">{t('body', { target: session.target_count, words: session.words, left })}</p>
        {summary.data && (
          <p className="flex gap-2">
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-caption font-semibold text-ink">{t('correct', { count: summary.data.correct })}</span>
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-caption font-semibold text-ink">{t('wrong', { count: summary.data.wrong })}</span>
          </p>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="sticker" size="lg" className="justify-between" isPending={busy} onPress={() => onContinue(true)}>
          <span className="flex items-center gap-2">
            <RotateCcw aria-hidden className="size-4" />
            {t('go', { left })}
          </span>
          <kbd className={`${KBD} border-on-accent`}>Enter</kbd>
        </Button>
        <Button variant="quiet" size="lg" className="justify-between" isDisabled={busy} onPress={() => onContinue(false)}>
          {t('stop')}
          <kbd className={`${KBD} border-border-strong`}>Esc</kbd>
        </Button>
      </div>
      <p className="text-caption text-muted">{t('note')}</p>
    </div>
  );
}
