'use client';

import { ArrowRight, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SpeakWord } from '@/ui/SpeakButton';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';
import { LEVEL_FILL, toLevel, useLevelName, type Level } from '@/ui/levels';
import type { AnswerResult } from './use-practice-session';

export function feedbackCase(result: AnswerResult): 1 | 2 | 3 | 4 | null {
  if (result.result === 'wrong') return result.highlight_needs_review ? 4 : null;
  if (result.show_known) return 1;
  return result.hint_level === 0 ? 2 : 3;
}

/**
 * The result panel under the question card (Figma 100:3164 "Đúng rồi", 178:5546 / 178:5755 "Chưa đúng"; P.13, mockup L332-349,
 * L1213-1225: its own block 16 px under the card, 16 px between its parts, actions at the right). "Not quite" shows the answer as a big
 * line in a pass-tinted block with its meaning, speaker and definition. The sentence translation sits in the question card (P.13).
 * Design đợt cải thiện A §6.3: (1) correct + show_known → Know; (2) correct without Know or hints → Next;
 * (3) correct with hints, without Know → Next; (4) wrong/skipped + highlight_needs_review → Still learning.
 * Enter follows the bold button. Wrong outside learning offers only Next.
 * D16 Bước 3: only buttons labelled Đã biết / Cần ôn lại change the schedule.
 */
export function AnswerFeedback({ result, onReview, onNext, busy, focusPrimary = false }: {
  result: AnswerResult;
  onReview: (action: 'needs_review' | 'known') => void;
  onNext: () => void;
  busy: boolean;
  /** A chosen answer disables the option that held focus; the primary action takes it (audit 26/10/2026 #8). A typed answer keeps its field focused. */
  focusPrimary?: boolean;
}) {
  const t = useTranslations('App.practice.session');
  const tRecall = useTranslations('App.recall');
  const levelName = useLevelName();
  const right = result.result === 'correct';
  const kind = feedbackCase(result);
  const lemma = result.correct.lemma;
  // Đợt C: in an Ôn session a right answer has already moved the word (or kept it); say which, with the level it is at now.
  const schedule = right ? result.schedule ?? null : null;
  // M5.1: Đã biết moves the word one level up; shown only when it can (Figma 100:3164).
  const level = kind === 1 && !schedule ? result.level ?? null : null;
  const move = level !== null && level >= 0 && level < 5 ? { from: toLevel(level), to: toLevel(level + 1) } : null;
  const note = kind === 1 ? ['noteKnowEnter', 'noteKnowTap'] as const
    : kind === 2 ? ['noteNotDue', null] as const
      : kind === 3 ? ['noteHint', null] as const
        : kind === 4 ? ['noteWrong', 'noteWrongTap'] as const : null;

  const review = kind !== null && (
    <Button
      key="review"
      variant={kind === 4 ? 'primary' : 'secondary'}
      autoFocus={focusPrimary && kind === 4}
      isDisabled={busy}
      onPress={() => onReview('needs_review')}
    >
      {t('stillLearning')}
    </Button>
  );
  const forward = kind === 1 ? (
    <Button key="know" variant="pass" autoFocus={focusPrimary} isDisabled={busy} onPress={() => onReview('known')}>
      <Check aria-hidden className="size-4.5" />
      {t('know')}
    </Button>
  ) : (
    <Button key="next" variant={kind === 4 ? 'secondary' : 'primary'} autoFocus={focusPrimary && kind !== 4} isPending={busy} onPress={onNext}>
      {t('next')}
    </Button>
  );
  const buttons: ReactNode[] = kind === 4 ? [forward, review] : [review, forward];

  const definition = result.definition_en && result.definition_en !== result.meaning ? result.definition_en : null;

  return (
    // Announced through the session's live region (audit 26/10/2026 #8), so this panel is not a second status.
    // 3C (owner 27/10/2026): the result rises in.
    <div
      data-feedback
      className={cn(
        'mt-4 flex flex-col gap-4 rounded-wm-card border-2 p-5 shadow-wm-card motion-safe:animate-wm-panel-drop md:p-6',
        right ? 'border-wm-pass bg-wm-pass-soft' : 'border-wm-wrong-line bg-wm-wrong-soft',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={cn('flex size-7.5 shrink-0 items-center justify-center rounded-full text-wm-on-accent', right ? 'bg-wm-pass' : 'bg-wm-wrong-ink')}>
          {right ? <Check aria-hidden className="size-4.5" /> : <X aria-hidden className="size-4.5" />}
        </span>
        <p className={cn('font-wm-display text-wm-card-title', right ? 'text-wm-pass' : 'text-wm-wrong-ink')}>{right ? t('right') : t('wrong')}</p>
        {right && (
          <>
            <span className="hidden flex-1 md:block" />
            <span className="flex min-w-0 basis-full items-center gap-1 md:basis-auto">
              <span className="min-w-0 break-words font-wm-sans text-wm-base-strong text-wm-ink">{t('revealLine', { lemma, meaning: result.meaning })}</span>
              <SpeakWord text={lemma} />
            </span>
          </>
        )}
      </div>
      {right ? (
        definition && <p className="break-words font-wm-sans text-wm-small text-wm-muted">{definition}</p>
      ) : (
        <div
          role="group"
          aria-label={tRecall('compare.answer')}
          className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 rounded-wm-row border border-wm-answer-line bg-wm-pass-soft px-4 py-3.5"
        >
          <span className="w-full font-wm-sans text-wm-meta text-wm-pass">{tRecall('compare.answer')}</span>
          <span className="min-w-0 break-words font-wm-display text-wm-card-heading font-extrabold text-wm-pass">{lemma}</span>
          <span className="min-w-0 break-words font-wm-sans text-wm-word text-wm-ink">{result.meaning}</span>
          <span className="ml-auto self-center">
            <SpeakWord text={lemma} />
          </span>
          {definition && <span className="w-full break-words font-wm-sans text-wm-small text-wm-muted">{definition}</span>}
        </div>
      )}
      {move && (
        <div role="group" aria-label={t('levelMove', { from: levelName(move.from), to: levelName(move.to) })} className="flex flex-wrap items-center gap-2 font-wm-sans text-wm-small-strong text-wm-ink">
          <LevelName level={move.from}>{levelName(move.from)}</LevelName>
          <ArrowRight aria-hidden className="size-4 text-wm-muted" />
          <LevelName level={move.to}>{levelName(move.to)}</LevelName>
        </div>
      )}
      {schedule ? (
        <p className="font-wm-sans text-wm-small text-wm-muted">
          {tRecall(schedule.outcome === 'leveled_up' ? 'noteLeveled' : 'noteKept', { lemma, level: levelName(toLevel(schedule.level)) })}
        </p>
      ) : note && (
        <>
          <p className={cn('font-wm-sans text-wm-small text-wm-muted', note[1] && 'hidden md:block')}>{t(note[0], { lemma })}</p>
          {note[1] && <p className="font-wm-sans text-wm-small text-wm-muted md:hidden">{t(note[1], { lemma })}</p>}
        </>
      )}
      <div className={cn('grid gap-3 md:flex md:justify-end', buttons.filter(Boolean).length === 2 && 'grid-cols-2')}>{buttons}</div>
    </div>
  );
}

function LevelName({ level, children }: { level: Level; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn('size-2.5 rounded-wm-key', LEVEL_FILL[level])} />
      {children}
    </span>
  );
}
