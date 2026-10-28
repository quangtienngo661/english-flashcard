import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'use-intl';
import { saveBlob } from '../../api/download';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { useDateTime } from '../../i18n/use-date-time';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { PanelBody, PanelFooter, PanelHead } from '../../ui/DetailPanel';
import { ListState } from '../../ui/ListState';
import { Stat, StatTotal } from '../../ui/Stat';
import { showToast } from '../../ui/Toast';
import { cancelPublishJob, downloadPublishReport, getPublishJob, type JobStatus, type PublishJobView } from '../content/content-api';
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
  const errorDetails = useErrorDetails();
  const query = usePollingStatus<PublishJobView>(['publish-job', id], () => getPublishJob(api, id));
  const [downloading, setDownloading] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);

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
  const live = job.status === 'queued' || job.status === 'running';

  async function stop() {
    setStopping(true);
    setError(null);
    try {
      // The answer is the job as GET shows it now; the effect above refreshes the list when it sees the status end.
      queryClient.setQueryData(['publish-job', id], await cancelPublishJob(api, id));
      showToast(t('publishJobs.stopped', { id: shortId(id) }));
    } catch (e) {
      setError(errorDetails(e));
      // job-not-active: it ended while the dialog was open, so read how it ended now instead of at the next poll.
      if (e instanceof ApiError && e.problem.slug === 'job-not-active') void queryClient.invalidateQueries({ queryKey: ['publish-job', id] });
    } finally {
      setStopping(false);
      setStopOpen(false);
    }
  }

  async function downloadReport() {
    setDownloading(true);
    setError(null);
    try {
      saveBlob(await downloadPublishReport(api, id), `publish-${id}.csv`);
    } catch (e) {
      setError(errorDetails(e));
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
            <StatusBadge status={job.cancelled ? 'cancelled' : job.status} progress={job.status === 'running' ? { done: counters.processed ?? 0, total: job.snapshot_count } : undefined} />
            <p className="text-ui text-muted">{t('publishJobs.createdAt', { time: dateTime(job.created_at) })}</p>
          </div>
        }
      />
      <PanelBody>
        {error && <Banner variant="error" code={error.code}>{error.message}</Banner>}
        {job.status === 'queued' && (
          <Banner variant="info">
            {t(tooLong ? 'publishJobs.queuedLong' : 'publishJobs.queued', { seconds: Math.max(0, Math.floor((now - Date.parse(job.created_at)) / 1000)) })}
          </Banner>
        )}
        {job.status === 'running' && (
          <Banner variant="info">{t('publishJobs.running', { done: format.number(counters.processed ?? 0), total: format.number(job.snapshot_count) })}</Banner>
        )}
        {job.cancelled && (
          <Banner variant="info">{t('publishJobs.stoppedNotice', { done: format.number(counters.processed ?? 0), total: format.number(job.snapshot_count) })}</Banner>
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
        {live && (
          <Button variant="danger" onPress={() => setStopOpen(true)}>
            {t('publishJobs.stop')}
          </Button>
        )}
      </PanelFooter>
      <ConfirmDialog
        isOpen={stopOpen}
        title={t('publishJobs.stopTitle', { id: shortId(job.id) })}
        confirmLabel={t('publishJobs.stop')}
        cancelLabel={t('publishJobs.stopKeep')}
        tone="danger"
        isPending={stopping}
        onConfirm={() => void stop()}
        onCancel={() => setStopOpen(false)}
      >
        {t('publishJobs.stopBody')}
      </ConfirmDialog>
    </>
  );
}
