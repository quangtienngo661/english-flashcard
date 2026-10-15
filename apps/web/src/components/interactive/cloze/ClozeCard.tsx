import type { Ref } from 'react';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { cn } from '@/lib/cn';
import type { ClozeResult } from './cloze-state';
import type { ClozeItem, ClozeLabels } from './ClozePractice';

type ClozeCardProps = {
  item: ClozeItem;
  header: string;
  labels: ClozeLabels;
  result: ClozeResult;
  done: boolean;
  /** The right sticker has reached the gap (always true at once with reduced motion). */
  landed: boolean;
  progress: boolean[];
  ctaHref: string;
  slotRef: Ref<HTMLSpanElement>;
  nextRef: Ref<HTMLButtonElement>;
  onPick: (word: string, sticker: HTMLElement) => void;
  onNext: () => void;
  onReplay: () => void;
};

// Presentation only; state and motion live in ClozePractice. Stickers use aria-disabled, never disabled,
// so a wrong pick keeps keyboard focus (UBE15); border-transparent shows up in forced-colors mode (RF5).
export function ClozeCard({ item, header, labels, result, done, landed, progress, ctaHref, slotRef, nextRef, onPick, onNext, onReplay }: ClozeCardProps) {
  const correct = result.status === 'correct';
  const filled = correct && landed;

  return (
    <div
      data-testid="cloze-card"
      className="flex flex-col gap-4 rounded-feature bg-surface p-5 text-ink shadow-ledge-card md:tilt-card md:p-7 motion-safe:animate-card-in"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption font-semibold text-muted">
          {labels.sourceChip}
          <VisuallyHidden>{header}</VisuallyHidden>
        </p>
        <span aria-hidden="true" className="flex gap-1.5">
          {progress.map((isDone, i) => (
            <span key={i} className={cn('h-1.5 w-7 rounded-full transition-colors duration-base', isDone ? 'bg-success' : 'bg-primary-soft')} />
          ))}
        </span>
      </div>

      {done ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-title font-extrabold md:text-title-lg">{labels.doneTitle}</p>
          <p className="text-body text-muted">{labels.doneBody}</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={ctaHref}>{labels.doneCta}</ButtonLink>
            <Button variant="secondary" onClick={onReplay}>
              {labels.replay}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p lang="en" className="text-subtitle font-semibold md:text-h3">
            {item.before}{' '}
            <span
              ref={slotRef}
              data-testid="cloze-gap"
              className={cn(
                'inline-block min-w-16 border-b-4 px-1 text-center',
                filled ? 'border-success text-success motion-safe:animate-pop' : 'border-primary text-primary',
              )}
            >
              {filled ? (
                item.answer
              ) : (
                <>
                  <span aria-hidden="true">?</span>
                  <VisuallyHidden>…</VisuallyHidden>
                </>
              )}
            </span>{' '}
            {item.after}
          </p>

          {result.status === 'unanswered' ? <p className="text-small text-muted">{labels.instruction}</p> : null}

          <div className="flex flex-wrap gap-2.5" lang="en">
            {item.options.map((option) => {
              const tried = result.tried.includes(option);
              const locked = tried || correct;
              return (
                <button
                  key={option}
                  type="button"
                  aria-disabled={locked || undefined}
                  onClick={(e) => onPick(option, e.currentTarget)}
                  className={cn(
                    'min-h-11 rounded-control border-2 border-transparent px-4.5 text-body font-semibold text-ink transition duration-fast ease-standard',
                    tried ? 'bg-wrong-chip shadow-ledge-wrong motion-safe:animate-wiggle' : 'bg-accent shadow-ledge-accent',
                    correct && option !== item.answer && 'opacity-35',
                    // The chosen sticker becomes the flying copy; the original hides (and leaves the tab order).
                    correct && option === item.answer && 'invisible',
                    locked ? 'cursor-default' : 'hover:-translate-y-0.5',
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {result.status !== 'unanswered' ? (
            <div className="flex flex-col gap-2 rounded-inner bg-canvas p-4">
              <p className={cn('text-label font-bold', correct ? 'text-success' : 'text-danger')}>
                {correct ? labels.correctTitle : labels.wrongTitle}
              </p>
              {correct ? (
                <>
                  <p className="text-label">{item.explanation}</p>
                  <p className="text-label font-medium text-muted">{item.translation}</p>
                </>
              ) : (
                <p className="text-label">{item.hint}</p>
              )}
            </div>
          ) : null}

          {correct ? (
            <div className="flex justify-end">
              <Button ref={nextRef} variant="ink" onClick={onNext}>
                {labels.nextSentence}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
