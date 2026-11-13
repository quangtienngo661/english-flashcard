'use client';

import { ToggleButton } from 'react-aria-components';
import { cn } from '@/lib/cn';
import { COUNT_BOX_REST } from './count-box';
import type { Level } from './levels';

export type LevelChipTone = Level | 'all' | 'priority' | 'due';

// Tint 18 % at rest, 40 % and a 1 px inset ring of the tone when chosen; border 45 % (mockup L161-173). Tokens in packages/design-tokens.
const TONE: Record<LevelChipTone, { rest: string; on: string; count: string }> = {
  0: { rest: 'bg-wm-level-0-tint border-wm-level-0-line', on: 'data-selected:bg-wm-level-0-tint-strong data-selected:border-wm-level-0 data-selected:ring-wm-level-0', count: 'ring-wm-level-0-line' },
  1: { rest: 'bg-wm-level-1-tint border-wm-level-1-line', on: 'data-selected:bg-wm-level-1-tint-strong data-selected:border-wm-level-1 data-selected:ring-wm-level-1', count: 'ring-wm-level-1-line' },
  2: { rest: 'bg-wm-level-2-tint border-wm-level-2-line', on: 'data-selected:bg-wm-level-2-tint-strong data-selected:border-wm-level-2 data-selected:ring-wm-level-2', count: 'ring-wm-level-2-line' },
  3: { rest: 'bg-wm-level-3-tint border-wm-level-3-line', on: 'data-selected:bg-wm-level-3-tint-strong data-selected:border-wm-level-3 data-selected:ring-wm-level-3', count: 'ring-wm-level-3-line' },
  4: { rest: 'bg-wm-level-4-tint border-wm-level-4-line', on: 'data-selected:bg-wm-level-4-tint-strong data-selected:border-wm-level-4 data-selected:ring-wm-level-4', count: 'ring-wm-level-4-line' },
  5: { rest: 'bg-wm-level-5-tint border-wm-level-5-line', on: 'data-selected:bg-wm-level-5-tint-strong data-selected:border-wm-level-5 data-selected:ring-wm-level-5', count: 'ring-wm-level-5-line' },
  priority: {
    rest: 'bg-wm-level-priority-tint border-wm-level-priority-line',
    on: 'data-selected:bg-wm-level-priority-tint-strong data-selected:border-wm-level-priority data-selected:ring-wm-level-priority',
    count: 'ring-wm-level-priority-line',
  },
  due: { rest: 'bg-wm-level-due-tint border-wm-level-due-line', on: 'data-selected:bg-wm-level-due-tint-strong data-selected:border-wm-level-due data-selected:ring-wm-level-due', count: 'ring-wm-level-due-line' },
  // Owner 13/11/2026: the neutral chips (Tất cả, Học, Ôn …) stay light: accent-soft at rest, the surface with an accent ring when chosen.
  all: { rest: 'bg-wm-accent-soft border-wm-level-all-line', on: 'data-selected:bg-wm-surface data-selected:border-wm-accent data-selected:ring-wm-accent', count: 'ring-wm-level-all-line' },
};

/**
 * A level filter chip (mockup L161-173): the whole chip carries the tone, the name beside it (colour is never the only signal), the count
 * in its own box on the surface. Ink text on every tint reaches 4.5:1 (web-tokens.test.ts). A toggle: `aria-pressed`.
 */
export function LevelChip({ tone, label, count, pressed, onPress, isDisabled }: {
  tone: LevelChipTone;
  label: string;
  count: number;
  pressed: boolean;
  onPress: () => void;
  isDisabled?: boolean;
}) {
  const t = TONE[tone];
  return (
    <ToggleButton
      isSelected={pressed}
      isDisabled={isDisabled}
      onChange={() => onPress()}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-wm-control border pl-3 pr-1.5 font-wm-sans text-wm-ink outline-none data-selected:ring-1 data-selected:ring-inset',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent',
        'motion-safe:transition motion-safe:duration-200 motion-safe:data-pressed:scale-97 data-disabled:cursor-not-allowed data-disabled:opacity-40',
        t.rest,
        t.on,
      )}
    >
      <span className="whitespace-nowrap text-wm-label">{label}</span>{' '}
      <span className={cn(COUNT_BOX_REST, t.count)}>
        {count}
      </span>
    </ToggleButton>
  );
}
