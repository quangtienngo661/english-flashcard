import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'use-intl';
import { saveBlob } from '../../api/download';
import { useErrorMessage } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { useDateTime } from '../../i18n/use-date-time';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { PanelBody, PanelFooter, PanelHead } from '../../ui/DetailPanel';
import { ListState } from '../../ui/ListState';
import { Stat, StatTotal } from '../../ui/Stat';
import { downloadPublishReport, getPublishJob, type JobStatus, type PublishJobView } from '../content/content-api';
import { StatusBadge } from '../jobs/StatusBadge';
import { useNow } from '../jobs/useNow';
import { isTerminal, usePollingStatus, useQueuedTooLong } from '../jobs/usePollingStatus';
import { shortId } from './PublishJobsPage';

/**
 * Spec §6.3 "Publish job" detail, shown in the panel beside the jobs list (design §6.3, UB8): refreshes by itself until
 * the job ends; counters and `report.csv`. Rendered inside `DetailPanel`, so its polling stops on close.
 */
export function PublishJobPanel({ id }: { id: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const dateTime = useDateTime();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const query = usePollingStatus<PublishJobView>(['publish-job', id], () => getPublishJob(api, id));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const job = query.data;
  const now = useNow(1000, job?.status === 'queued');
  const tooLong = useQueuedTooLong(job?.status ?? 'running', job?.created_at ?? '', now);

  // UBE27: when the polling sees this job finish, refresh the list so the row's pill matches the panel.
  const seen = useRef<JobStatus | undefined>(undefined);
  useEffect(() => {
    const status = job?.status;
    if (seen.current && !isTerminal(seen.current) && isTerminal(status)) void queryClient.invalidateQueries({ queryKey: ['publish-jobs'] });
    seen.current = status;
  }, [job?.status, queryClient]);

  if (!job) {
    return (
      <>
        <PanelHead title={t('nav.publishJobs')} />
        <PanelBody>
          <ListState state={query.isPending ? 'loading' : 'error'} onRetry={() => void query.refetch()} />
        </PanelBody>
      </>
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
    <>
      <PanelHead
        title={t('publishJobs.jobTitle', { id: shortId(job.id) })}
        status={
          <div className="flex flex-col gap-1.5">
            <StatusBadge status={job.status} progress={job.status === 'running' ? { done: counters.processed ?? 0, total: job.snapshot_count } : undefined} />
            <p className="text-ui text-muted">{t('publishJobs.createdAt', { time: dateTime(job.created_at) })}</p>
          </div>
        }
      />
      <PanelBody>
        {error && <Banner variant="error">{error}</Banner>}
        {job.status === 'queued' && (
          <Banner variant="info">
            {t(tooLong ? 'publishJobs.queuedLong' : 'publishJobs.queued', { seconds: Math.max(0, Math.floor((now - Date.parse(job.created_at)) / 1000)) })}
          </Banner>
        )}
        {job.status === 'running' && (
          <Banner variant="info">{t('publishJobs.running', { done: format.number(counters.processed ?? 0), total: format.number(job.snapshot_count) })}</Banner>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          <Stat tone="primary" label={t('publishJobs.stats.published')} value={count(counters.published)} />
          <Stat tone="neutral" label={t('publishJobs.stats.already')} value={count(counters.already_published)} />
          <Stat tone="danger" label={t('publishJobs.stats.refused')} value={count(counters.refused)} />
        </div>
        <StatTotal label={t('publishJobs.stats.snapshot')} value={count(job.snapshot_count)} />

        {(counters.refused ?? 0) > 0 && <p className="text-ui text-ink">{t('publishJobs.refused', { count: format.number(counters.refused ?? 0) })}</p>}
      </PanelBody>
      <PanelFooter>
        <Button variant="secondary" isPending={downloading} onPress={() => void downloadReport()}>
          {t('publishJobs.report')}
        </Button>
      </PanelFooter>
    </>
  );
}
