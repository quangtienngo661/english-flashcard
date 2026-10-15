import type { ReactNode } from 'react';

type Tone = 'primary' | 'neutral' | 'success' | 'danger';

const TONE: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary border-transparent',
  neutral: 'bg-canvas text-ink border-border',
  success: 'bg-success-soft text-ink border-transparent',
  danger: 'bg-surface text-danger border-danger',
};

/** A small pill: a role, or later a batch/job status. */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex w-fit items-center rounded-control border px-2 py-0.5 text-xs ${TONE[tone]}`}>{children}</span>;
}
