import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';

type Props = {
  word: string;
  /** `review`: a word sent back to review (Cần ôn lại); `normal` otherwise (Đã biết, lists). */
  tone?: 'normal' | 'review';
  /** The word's group: a square of its colour in front. */
  groupId?: string;
  className?: string;
};

/** Figma "Chip từ" (96:322), Thường / Cần ôn: a word in a pile or a list. */
export function WordChip({ word, tone = 'normal', groupId, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-wm-key border px-2 py-0.5 font-wm-sans text-wm-label',
        tone === 'review' ? 'border-wm-fail/30 bg-wm-fail-soft text-wm-fail' : 'border-wm-line bg-wm-surface text-wm-ink',
        className,
      )}
    >
      {groupId && <span aria-hidden className={cn('size-2 shrink-0 rounded-wm-key', groupTone(groupId, 1).bg)} />}
      <span className="truncate">{word}</span>
    </span>
  );
}
