'use client';

import { ArrowRight, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { SpeakWord } from '@/ui/SpeakButton';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';
import { TextButton } from '@/ui/TextButton';
import { LEVEL_FILL, toLevel, useLevelName, type Level } from '@/ui/levels';
import type { AnswerResult } from './use-practice-session';

export function feedbackCase(result: AnswerResult): 1 | 2 | 3 | 4 | null {
  if (result.result === 'wrong') return result.highlight_needs_review ? 4 : null;
  if (result.show_known) return 1;
  return result.hint_level === 0 ? 2 : 3;
}

/**
 * F.14 (drawing panelC; owner D2, D3): the result ticket. It tucks 22 px under the question card, or under the open hint box (both are
 * `relative z-10`), 18 px in from their sides, with no top border, and slides down from under them (420 ms ease-out, motion-safe only).
 * The stub holds the 24 px badge, the title and the note that applies to the case (on phones it wraps under the title); a dashed
 * perforation with two notches follows; then the body, and the actions at the right: the secondary one as a muted text button, then the
 * primary one. Wrong in fail tones, right in pass tones. Also the shell of the try-again panel (`TryAgainPanel`).
 */
export function ResultTicket({ right, note, children, actions }: { right: boolean; note?: ReactNode; children?: ReactNode; actions: ReactNode }) {
  const t = useTranslations('App.practice.session');
  const panel = useRef<HTMLDivElement>(null);
  const perf = useRef<HTMLDivElement>(null);
  // The notches are cut out of the panel with a mask at the perforation's height, so the real page shows through them in both themes
  // (owner 13/11/2026: discs filled with the page colour showed as dark dots over the dark page's glow). The stub wraps on phones, so
  // the height is measured, and again when the panel resizes.
  useLayoutEffect(() => {
    const box = panel.current;
    const line = perf.current;
    if (!box || !line) return;
    const place = () => box.style.setProperty('--ticket-perf-y', `${line.offsetTop + 0.75}px`);
    place();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(place);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return (
    // Announced through the session's live region (audit 26/10/2026 #8), so this panel is not a second status.
    <div
      ref={panel}
      data-feedback
      className={cn(
        'ticket-cut relative mx-4.5 -mt-5.5 flex flex-col gap-4 rounded-b-wm-card border-2 border-t-0 px-6 pb-4 pt-9.5 motion-safe:animate-wm-panel-drop',
        right ? 'border-wm-pass bg-wm-pass-soft' : 'border-wm-wrong-line bg-wm-wrong-soft',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <p className={cn('flex items-center gap-2.5 font-wm-display text-wm-ticket-title', right ? 'text-wm-pass' : 'text-wm-wrong-ink')}>
          <span aria-hidden className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-wm-on-accent', right ? 'bg-wm-pass' : 'bg-wm-wrong-ink')}>
            {right ? <Check className="size-4" /> : <X className="size-4" />}
          </span>
          {right ? t('right') : t('wrong')}
        </p>
        {note && <div className="min-w-0 basis-full break-words font-wm-sans text-wm-meta font-semibold text-wm-muted md:flex-1 md:text-right">{note}</div>}
      </div>
      <div ref={perf} aria-hidden className={cn('ticket-perf', right ? 'text-wm-pass' : 'text-wm-fail')} />
      {children}
      {/* Below 640 px the actions stack, full width (owner 13/11/2026: three buttons wrapped to the right at 320-390 px). */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">{actions}</div>
    </div>
  );
}

/**
 * The result under the question card (F.14 ticket, above). Body: the meaning as the lead line, with the English definition beside it in
 * muted text when it differs, then the answer word with its speaker. The answer also fills the sentence in the card (P.13).
 * Design đợt cải thiện A §6.3: (1) correct + show_known → Know; (2) correct without Know or hints → Next;
 * (3) correct with hints, without Know → Next; (4) wrong/skipped + highlight_needs_review → Still learning.
 * Enter follows the bold button. Wrong outside learning offers only Next. The stub's note is the case note; on a right answer with a
 * level move ("Bậc 1 → Bậc 2") the move takes the stub and the case note follows the answer word.
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

  // F.14: the secondary action is a muted text button; the primary one keeps its button and takes the focus.
  const review = kind !== null && (kind === 4 ? (
    <Button key="review" variant="primary" autoFocus={focusPrimary} isDisabled={busy} onPress={() => onReview('needs_review')}>
      {t('stillLearning')}
    </Button>
  ) : (
    <TextButton key="review" tone="muted" className="px-3" isDisabled={busy} onPress={() => onReview('needs_review')}>
      {t('stillLearning')}
    </TextButton>
  ));
  const forward = kind === 1 ? (
    <Button key="know" variant="pass" autoFocus={focusPrimary} isDisabled={busy} onPress={() => onReview('known')}>
      <Check aria-hidden className="size-4.5" />
      {t('know')}
    </Button>
  ) : kind === 4 ? (
    <TextButton key="next" tone="muted" className="px-3" isDisabled={busy} onPress={onNext}>
      {t('next')}
    </TextButton>
  ) : (
    <Button key="next" variant="primary" autoFocus={focusPrimary} isPending={busy} onPress={onNext}>
      {t('next')}
    </Button>
  );
  const buttons: ReactNode[] = kind === 4 ? [forward, review] : [review, forward];

  const definition = result.definition_en && result.definition_en !== result.meaning ? result.definition_en : null;
  const caseNote = schedule ? (
    <p>{tRecall(schedule.outcome === 'leveled_up' ? 'noteLeveled' : 'noteKept', { lemma, level: levelName(toLevel(schedule.level)) })}</p>
  ) : note && (
    <>
      <p className={cn(note[1] && 'hidden md:block')}>{t(note[0], { lemma })}</p>
      {note[1] && <p className="md:hidden">{t(note[1], { lemma })}</p>}
    </>
  );
  const moveNote = move && (
    <div role="group" aria-label={t('levelMove', { from: levelName(move.from), to: levelName(move.to) })} className="flex flex-wrap items-center gap-2 md:justify-end">
      <LevelName level={move.from}>{levelName(move.from)}</LevelName>
      <ArrowRight aria-hidden className="size-3.5" />
      <LevelName level={move.to}>{levelName(move.to)}</LevelName>
    </div>
  );

  return (
    <ResultTicket right={right} note={moveNote || caseNote} actions={buttons}>
      <p className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <span className="min-w-0 break-words font-wm-display text-wm-ticket-lead text-wm-ink">{result.meaning}</span>
        {definition && <span className="min-w-0 break-words font-wm-sans text-wm-base text-wm-muted">{definition}</span>}
      </p>
      <div className="flex items-center gap-2">
        <span className="min-w-0 break-words font-wm-sans text-wm-word text-wm-pass">{lemma}</span>
        <SpeakWord text={lemma} />
      </div>
      {moveNote && caseNote && <div className="font-wm-sans text-wm-small text-wm-muted">{caseNote}</div>}
    </ResultTicket>
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
