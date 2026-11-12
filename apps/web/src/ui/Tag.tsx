import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const TONE = {
  neutral: 'bg-wm-bg text-wm-muted',
  accent: 'bg-wm-accent-soft text-wm-accent',
  pass: 'bg-wm-pass-soft text-wm-pass',
  fail: 'bg-wm-fail-soft text-wm-fail',
} as const;

type Props = { tone?: keyof typeof TONE; children: ReactNode };

/** A small label or count chip (design §3.3: radius 6). */
export function Tag({ tone = 'neutral', children }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-wm-sm px-2 py-0.5',
        'font-wm-sans text-wm-label',
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}
