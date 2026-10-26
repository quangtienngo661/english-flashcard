'use client';

import { CircleCheck, CircleX } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/app-ui/Button';
import { SpeakWord } from '@/app-ui/SpeakButtons';
import { cn } from '@/lib/cn';
import { KBD } from './QuestionCard';
import type { AnswerResult } from './use-practice-session';

export function feedbackCase(result: AnswerResult): 1 | 2 | 3 | 4 | null {
  if (result.result === 'wrong') return result.highlight_needs_review ? 4 : null;
  if (result.show_known) return 1;
  return result.hint_level === 0 ? 2 : 3;
}

/**
 * Design đợt cải thiện A §6.3: (1) correct + show_known → Know; (2) correct without Know or hints → Next;
 * (3) correct with hints, without Know → Next; (4) wrong/skipped + highlight_needs_review → Still learning.
 * Enter follows the bold button. Wrong outside learning offers only Next.
 * D16 Bước 3: only buttons labelled Đã biết / Cần ôn lại change the schedule.
 */
export function AnswerFeedback({ result, onReview, onNext, busy }: {
  result: AnswerResult;
  onReview: (action: 'needs_review' | 'known') => void;
  onNext: () => void;
  busy: boolean;
}) {
  const t = useTranslations('App.practice.session');
  const locale = useLocale();
  const right = result.result === 'correct';
  const kind = feedbackCase(result);
  const Icon = right ? CircleCheck : CircleX;
  const noteKey = kind === 1 ? 'noteKnowEnter' : kind === 2 ? 'noteNotDue' : kind === 3 ? 'noteHint' : kind === 4 ? 'noteWrong' : null;
  return (
    <div className="flex flex-col gap-3">
      <div role="status" className={cn('flex gap-3 rounded-inner p-4', right ? 'bg-success-soft' : 'bg-danger-soft')}>
        <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', right ? 'text-success' : 'text-danger')} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className={cn('text-title font-bold', right ? 'text-success' : 'text-danger')}>{right ? t('right') : t('wrong')}</p>
          <div className="flex flex-wrap items-center gap-x-2">
            <p className="min-w-0 break-words text-ui font-semibold text-ink">{t('revealLine', { lemma: result.correct.lemma, meaning: result.meaning })}</p>
            <span className="flex gap-1">
              <SpeakWord text={result.correct.lemma} />
            </span>
          </div>
          {result.definition_en && result.definition_en !== result.meaning && <p className="break-words text-caption text-muted">{result.definition_en}</p>}
        </div>
      </div>
      {result.translation && locale === 'vi' && (
        // K/79a: the AI's translation of the sentence, for Vietnamese learners only (E41).
        <div className="flex flex-col gap-1 rounded-inner bg-surface p-4">
          <p className="flex items-center gap-2 text-caption font-semibold text-ink">
            {t('translation')}
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-primary">{t('translationAi')}</span>
          </p>
          <p className="break-words text-ui text-ink">{result.translation}</p>
        </div>
      )}
      <div className={cn('grid gap-3', kind !== null && 'sm:grid-cols-2')}>
        {kind !== null && (
          <Button
            variant={kind === 4 ? 'sticker' : 'quiet'}
            size="lg"
            className={cn('justify-between', kind === 4 && 'font-bold')}
            isDisabled={busy}
            onPress={() => onReview('needs_review')}
          >
            {t('stillLearning')}
            <kbd className={`${KBD} border-current`}>{kind === 4 ? 'Enter' : '1'}</kbd>
          </Button>
        )}
        {kind === 1 ? (
          <Button variant="sticker" size="lg" className="justify-between font-bold" isDisabled={busy} onPress={() => onReview('known')}>
            {t('know')}
            <kbd className={`${KBD} border-current`}>Enter</kbd>
          </Button>
        ) : (
          <Button variant={kind === 4 ? 'quiet' : 'sticker'} size="lg" className={cn('justify-between', kind !== 4 && 'font-bold')} isPending={busy} onPress={onNext}>
            {t('next')}
            {kind !== 4 && <kbd className={`${KBD} border-current`}>Enter</kbd>}
          </Button>
        )}
      </div>
      {noteKey && <p className="text-caption text-muted">{t(noteKey, { lemma: result.correct.lemma })}</p>}
    </div>
  );
}
