import type { ReactNode } from 'react';

type Tone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger';

const TONE: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary',
  neutral: 'bg-neutral-soft text-muted',
  success: 'bg-success-soft text-success',
  warning: 'bg-accent-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

/** A small round pill (direction B "sticker"): a role, or a batch/job status. */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[tone]}`}>{children}</span>;
}
