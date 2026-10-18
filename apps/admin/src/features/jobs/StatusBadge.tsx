import { useTranslations } from 'use-intl';
import { Badge } from '../../ui/Badge';
import type { JobStatus } from '../content/content-api';

const TONE = { queued: 'neutral', running: 'primary', succeeded: 'success', partial: 'warning', failed: 'danger', reverted: 'neutral' } as const;

type Props = {
  status: JobStatus | 'reverted';
  /** Rows done so far; drawn as a thin bar under a running status only. */
  progress?: { done: number; total: number };
};

/** Batch and publish-job status as a pill; `reverted` is a batch-only extra shown instead of its job status. */
export function StatusBadge({ status, progress }: Props) {
  const t = useTranslations();
  const badge = <Badge tone={TONE[status]}>{t(`status.${status}`)}</Badge>;
  if (status !== 'running' || !progress || progress.total <= 0) return badge;
  const percent = Math.min(100, (progress.done / progress.total) * 100);
  return (
    <span className="inline-flex flex-col gap-1.5">
      {badge}
      {/* The numbers are already in the panel's sentence; the bar only repeats them for the eye. */}
      <span aria-hidden="true" className="block h-1.5 w-30 overflow-hidden rounded-full bg-primary-soft">
        <span
          className="block h-full rounded-full bg-primary"
          // raw-ok: the bar's width is the batch's progress, a data value
          style={{ width: `${percent}%` }}
        />
      </span>
    </span>
  );
}
