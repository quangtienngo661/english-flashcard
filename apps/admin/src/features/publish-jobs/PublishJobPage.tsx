import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useFormatter, useTranslations } from 'use-intl';
import { saveBlob } from '../../api/download';
import { useErrorMessage } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { useDateTime } from '../../i18n/use-date-time';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ListState } from '../../ui/ListState';
import { Stat } from '../../ui/Stat';
import { downloadPublishReport, getPublishJob, type PublishJobView } from '../content/content-api';
import { StatusBadge } from '../jobs/StatusBadge';
import { useNow } from '../jobs/useNow';
import { usePollingStatus, useQueuedTooLong } from '../jobs/usePollingStatus';
import { shortId } from './PublishJobsPage';

/** Spec §6.3 "Publish job" detail: refreshes by itself until the job ends; counters and `report.csv`. */
export function PublishJobPage() {
  const { id = '' } = useParams();
  const t = useTranslations();
  const format = useFormatter();
  const dateTime = useDateTime();
  const api = useApi();
  const errorMessage = useErrorMessage();
  const query = usePollingStatus<PublishJobView>(['publish-job', id], () => getPublishJob(api, id));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const job = query.data;
  const now = useNow(1000, job?.status === 'queued');
  const tooLong = useQueuedTooLong(job?.status ?? 'running', job?.created_at ?? '', now);
  if (!job) {
    return (
      <div className="overflow-hidden rounded-panel bg-surface shadow-card">
        <ListState state={query.isPending ? 'loading' : 'error'} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  const { counters } = job;
  const count = (n: number | undefined) => (n === undefined ? '—' : format.number(n));

  async function downloadReport() {
    setDownloading(true);
    setError(null);
    try {
      saveBlob(await downloadPublishReport(api, id), `publish-${id}.csv`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/publish-jobs" className="inline-flex w-fit items-center gap-1.5 rounded-control text-ui text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <ArrowLeft aria-hidden className="size-4" />
        {t('publishJobs.back')}
      </Link>

      <div className="flex flex-col gap-3 shell:flex-row shell:items-start shell:justify-between">
        <div className="min-w-0">
          <h2 className="break-all text-xl font-semibold text-ink">{t('publishJobs.jobTitle', { id: shortId(job.id) })}</h2>
          <p className="text-ui text-muted">{t('publishJobs.createdAt', { time: dateTime(job.created_at) })}</p>
        </div>
        <Button variant="secondary" isPending={downloading} onPress={() => void downloadReport()}>
          {t('publishJobs.report')}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-ui">
        <span className="text-muted">{t('batch.statusLabel')}</span>
        <StatusBadge status={job.status} />
      </div>

      {error && <Banner variant="error">{error}</Banner>}
      {job.status === 'queued' && (
        <Banner variant="info">
          {t(tooLong ? 'publishJobs.queuedLong' : 'publishJobs.queued', { seconds: Math.max(0, Math.floor((now - Date.parse(job.created_at)) / 1000)) })}
        </Banner>
      )}
      {job.status === 'running' && (
        <Banner variant="info">
          {t('publishJobs.running', { done: format.number(counters.processed ?? 0), total: format.number(job.snapshot_count) })}
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-3 shell:grid-cols-4">
        <Stat label={t('publishJobs.stats.snapshot')} value={count(job.snapshot_count)} />
        <Stat label={t('publishJobs.stats.published')} value={count(counters.published)} />
        <Stat label={t('publishJobs.stats.already')} value={count(counters.already_published)} />
        <Stat label={t('publishJobs.stats.refused')} value={count(counters.refused)} />
      </div>

      {(counters.refused ?? 0) > 0 && <p className="text-ui text-ink">{t('publishJobs.refused', { count: format.number(counters.refused ?? 0) })}</p>}
    </div>
  );
}
