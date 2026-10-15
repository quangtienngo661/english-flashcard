import { useTranslations } from 'use-intl';
import { Badge } from '../../ui/Badge';
import type { JobStatus } from '../content/content-api';

const TONE = { queued: 'neutral', running: 'primary', succeeded: 'success', partial: 'neutral', failed: 'danger', reverted: 'neutral' } as const;

/** Batch and publish-job status as a pill; `reverted` is a batch-only extra shown instead of its job status. */
export function StatusBadge({ status }: { status: JobStatus | 'reverted' }) {
  const t = useTranslations();
  return <Badge tone={TONE[status]}>{t(`status.${status}`)}</Badge>;
}
