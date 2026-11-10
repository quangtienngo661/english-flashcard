'use client';

import { Check, CircleCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/ui/Button';
import { SpeakWord } from '@/app-ui/SpeakButtons';
import type { AnswerResult } from './use-practice-session';

const BLANK = '___';

/**
 * The card of an alternative answer (session synonyms design §3.2): the learner typed another word of her session that the sentence
 * declared. Two rows, the word typed and the word asked, each with its own buttons; they review that word only and the card stays.
 * No result shortcut works here (the key handler in PracticeSession returns first), so no button shows a key.
 */
export function AlternativeFeedback({ result, sentence, onReviewWord, onNext, busy }: {
  result: AnswerResult;
  /** The question's sentence with its blank; the asked word is put back in it. */
  sentence: string;
  onReviewWord: (senseId: string, action: 'needs_review' | 'known') => void;
  onNext: () => void;
  busy: boolean;
}) {
  const t = useTranslations('App.practice.session');
  const locale = useLocale();
  const rows = result.alternative?.rows ?? [];
  const at = sentence.indexOf(BLANK);
  const [before, after] = at < 0 ? [sentence, ''] : [sentence.slice(0, at), sentence.slice(at + BLANK.length)];
  return (
    <div className="flex flex-col gap-3">
      <div data-feedback className="flex gap-3 rounded-wm-lg bg-wm-accent-soft p-4 motion-safe:animate-feedback-in">
        <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-wm-accent" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-wm-display text-wm-word text-wm-accent">{t('alternativeLabel')}</p>
          <p className="break-words text-pretty text-wm-small text-wm-ink">
            {before}
            <strong className="font-extrabold">{result.correct.text}</strong>
            {after}
          </p>
          <div className="flex flex-wrap items-center gap-x-2">
            <p className="min-w-0 break-words text-wm-small-strong text-wm-ink">{t('revealLine', { lemma: result.correct.lemma, meaning: result.meaning })}</p>
            <span className="flex gap-1">
              <SpeakWord text={result.correct.lemma} />
            </span>
          </div>
          {result.definition_en && result.definition_en !== result.meaning && <p className="break-words text-wm-caption text-wm-muted">{result.definition_en}</p>}
        </div>
      </div>
      {result.translation && locale === 'vi' && (
        <div className="flex flex-col gap-1 rounded-wm-lg bg-wm-surface p-4">
          <p className="flex items-center gap-2 text-wm-label text-wm-ink">
            {t('translation')}
            <span className="rounded-full bg-wm-accent-soft px-2 py-0.5 text-wm-label text-wm-accent">{t('translationAi')}</span>
          </p>
          <p className="break-words text-wm-small text-wm-ink">{result.translation}</p>
        </div>
      )}
      {/* Same flat surface as the translation above: no border, so the card reads as one piece (UI polish, 07/11/2026). */}
      <ul className="flex flex-col divide-y divide-wm-line rounded-wm-lg bg-wm-surface px-4">
        {rows.map((row) => (
          <li key={row.sense_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-wm-label text-wm-muted">{row.role === 'typed' ? t('alternativeTyped') : t('alternativeAsked')}</p>
              <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="break-words font-wm-display text-wm-word text-wm-ink">{row.lemma}</span>
                <span className="break-words text-wm-caption text-wm-muted">{row.meaning}</span>
              </p>
            </div>
            {row.action === null ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="secondary" aria-label={t('reviewWord', { lemma: row.lemma })} isDisabled={busy} onPress={() => onReviewWord(row.sense_id, 'needs_review')}>
                  {t('stillLearning')}
                </Button>
                {row.show_known && (
                  <Button variant="secondary" aria-label={t('knowWord', { lemma: row.lemma })} isDisabled={busy} onPress={() => onReviewWord(row.sense_id, 'known')}>
                    {t('know')}
                  </Button>
                )}
              </div>
            ) : (
              <p className="flex shrink-0 items-center gap-1 text-wm-label text-wm-ink">
                <Check aria-hidden className="size-4 text-wm-pass" />
                {row.action === 'known' ? t('know') : t('summary.added')}
              </p>
            )}
          </li>
        ))}
      </ul>
      <Button variant="primary" size="lg" isPending={busy} onPress={onNext}>
        {t('next')}
      </Button>
    </div>
  );
}
