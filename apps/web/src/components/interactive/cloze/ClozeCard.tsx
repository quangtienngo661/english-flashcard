import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Chip } from '@/components/ui/Chip';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { cn } from '@/lib/cn';
import type { ClozeStatus } from './cloze-state';
import type { ClozeItem, ClozeLabels } from './ClozeCarousel';

type ClozeCardProps = {
  item: ClozeItem;
  header: string;
  labels: ClozeLabels;
  result: { status: ClozeStatus; picked?: string };
  done: boolean;
  ctaHref: string;
  onPick: (word: string) => void;
  onNext: () => void;
  onReplay: () => void;
};

const gapStyles = {
  unanswered: 'bg-marker text-ink',
  wrong: 'border-2 border-danger-strong bg-surface text-danger-strong',
  correct: 'border-2 border-success bg-success-soft text-success-strong',
} satisfies Record<ClozeStatus, string>;

export function ClozeCard({ item, header, labels, result, done, ctaHref, onPick, onNext, onReplay }: ClozeCardProps) {
  const { status, picked } = result;
  return (
    <div className="flex flex-col gap-4 rounded-feature border border-border bg-surface p-5 shadow-card md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-semibold text-muted">{header}</p>
        <Chip>{labels.sourceChip}</Chip>
      </div>

      {done ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-title font-extrabold text-ink md:text-title-lg">{labels.doneTitle}</p>
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
          <p lang="en" className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-subtitle font-semibold text-ink md:text-h3">
            <span>{item.before}</span>
            <span className={cn('inline-flex rounded-sm px-3 py-0.5', gapStyles[status])}>
              {status === 'unanswered' ? (
                <>
                  <span aria-hidden="true">_____</span>
                  <VisuallyHidden>…</VisuallyHidden>
                </>
              ) : status === 'wrong' ? (
                picked
              ) : (
                item.answer
              )}
            </span>
            <span>{item.after}</span>
          </p>

          {status === 'unanswered' ? <p className="text-small text-muted">{labels.instruction}</p> : null}

          <div className="flex flex-wrap gap-2.5" lang="en">
            {item.options.map((option) => {
              const isPicked = picked === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={isPicked}
                  disabled={status === 'correct'}
                  onClick={() => onPick(option)}
                  className={cn(
                    'min-h-11 rounded-full border bg-surface px-4.5 text-body font-medium text-ink transition-colors duration-fast enabled:hover:border-ink disabled:cursor-default',
                    isPicked && status === 'wrong' && 'border-2 border-danger-strong',
                    isPicked && status === 'correct' && 'border-2 border-success bg-success-soft',
                    !isPicked && 'border-border',
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {status !== 'unanswered' ? (
            <div className="flex flex-col gap-2 rounded-inner bg-bg p-4">
              <p className={cn('text-label font-bold', status === 'wrong' ? 'text-danger-strong' : 'text-success-strong')}>
                {status === 'wrong' ? labels.wrongTitle : labels.correctTitle}
              </p>
              {status === 'wrong' ? (
                <p className="text-label text-ink">{item.hint}</p>
              ) : (
                <>
                  <p className="text-label text-ink">{item.explanation}</p>
                  <p className="text-label font-medium text-muted">{item.translation}</p>
                </>
              )}
            </div>
          ) : null}

          {status === 'correct' ? (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={onNext}>
                {labels.nextSentence}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
