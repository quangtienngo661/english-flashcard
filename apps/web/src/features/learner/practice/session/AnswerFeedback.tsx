'use client';

import { CircleCheck, CircleX } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/app-ui/Button';
import { cn } from '@/lib/cn';
import { KBD } from './QuestionCard';
import type { AnswerResult } from './use-practice-session';

/** K/61, K/62: right or not, the word and its meaning; then Cần ôn lại (1), Đã biết (2) when allowed, Câu tiếp (Enter). */
export function AnswerFeedback({ result, onReview, onNext, busy }: {
  result: AnswerResult;
  onReview: (action: 'needs_review' | 'known') => void;
  onNext: () => void;
  busy: boolean;
}) {
  const t = useTranslations('App.practice.session');
  const locale = useLocale();
  const right = result.result === 'correct';
  const Icon = right ? CircleCheck : CircleX;
  const note = !right ? t('noteWrong', { lemma: result.correct.lemma }) : result.show_known ? t('noteRight') : result.hint_level > 0 ? t('noteHint') : t('noteRightNoKnow');
  return (
    <div className="flex flex-col gap-3">
      <div role="status" className={cn('flex gap-3 rounded-inner p-4', right ? 'bg-success-soft' : 'bg-danger-soft')}>
        <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', right ? 'text-success' : 'text-danger')} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className={cn('text-title font-bold', right ? 'text-success' : 'text-danger')}>{right ? t('right') : t('wrong')}</p>
          <p className="break-words text-ui font-semibold text-ink">{t('revealLine', { lemma: result.correct.lemma, meaning: result.meaning })}</p>
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
      <div className={cn('grid gap-3', result.show_known ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        <Button
          variant={result.highlight_needs_review || !result.show_known ? 'sticker' : 'quiet'}
          size="lg"
          className="justify-between"
          isDisabled={busy}
          onPress={() => onReview('needs_review')}
        >
          {t('stillLearning')}
          <kbd className={`${KBD} border-current`}>1</kbd>
        </Button>
        {result.show_known && (
          <Button variant={result.highlight_needs_review ? 'quiet' : 'sticker'} size="lg" className="justify-between" isDisabled={busy} onPress={() => onReview('known')}>
            {t('know')}
            <kbd className={`${KBD} border-current`}>2</kbd>
          </Button>
        )}
        <Button variant="quiet" size="lg" className="justify-between" isPending={busy} onPress={onNext}>
          {t('next')}
          <kbd className={`${KBD} border-current`}>Enter</kbd>
        </Button>
      </div>
      <p className="text-caption text-muted">{note}</p>
    </div>
  );
}
