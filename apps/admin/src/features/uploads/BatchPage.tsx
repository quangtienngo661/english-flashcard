import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useFormatter, useTranslations } from 'use-intl';
import { saveBlob } from '../../api/download';
import { useErrorMessage } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { useDateTime } from '../../i18n/use-date-time';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Stat } from '../../ui/Stat';
import { ListState } from '../../ui/ListState';
import { createPublishJob, downloadRejected, getUpload, type BatchView, type RevertReport } from '../content/content-api';
import { useSubmitAction } from '../content/useSubmitAction';
import { StatusBadge } from '../jobs/StatusBadge';
import { useNow } from '../jobs/useNow';
import { usePollingStatus, useQueuedTooLong } from '../jobs/usePollingStatus';
import { RevertDialog } from './RevertDialog';

/** Spec §6.3 "Chi tiết lô": status refreshes by itself; counters, warnings, rejected.csv, publish and revert. */
export function BatchPage() {
  const { id = '' } = useParams();
  const t = useTranslations();
  const format = useFormatter();
  const dateTime = useDateTime();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const canPublish = useCan('content.publish');
  const canRevert = useCan('content.edit');

  const query = usePollingStatus<BatchView>(['batch', id], () => getUpload(api, id));
  const batch = query.data;
  const now = useNow(1000, batch?.status === 'queued');
  const tooLong = useQueuedTooLong(batch?.status ?? 'running', batch?.created_at ?? '', now);

  const [revertOpen, setRevertOpen] = useState(false);
  const [report, setReport] = useState<RevertReport | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const publish = useSubmitAction((key) => createPublishJob(api, { batch_id: id }, key), `publish:${id}`, (job) => void navigate(`/publish-jobs/${job.job_id}`));

  if (query.isPending) {
    return (
      <div className="overflow-hidden rounded-panel bg-surface shadow-sheet">
        <ListState state="loading" />
      </div>
    );
  }
  if (!batch) {
    return (
      <div className="overflow-hidden rounded-panel bg-surface shadow-sheet">
        <ListState state="error" onRetry={() => void query.refetch()} />
      </div>
    );
  }

  const count = (n: number | undefined) => (n === undefined ? '—' : format.number(n));
  const { counters } = batch;
  const rejected = counters.rejected ?? 0;
  const live = batch.status === 'queued' || batch.status === 'running';
  const shownStatus = batch.reverted ? 'reverted' : batch.status;
  const finished = batch.finished_at ? dateTime(batch.finished_at) : null;
  const subtitle =
    batch.status === 'succeeded' && finished
      ? t('batch.doneAt', { time: finished })
      : (batch.status === 'partial' || batch.status === 'failed') && finished
        ? t('batch.endedAt', { time: finished })
        : t('batch.createdAt', { time: dateTime(batch.created_at) });
  // Only a finished, not reverted batch is published or reverted: the publish API snapshots whatever the batch holds right now (B25E28).
  const finishedAndLive = !batch.reverted && (batch.status === 'succeeded' || batch.status === 'partial');
  const canRevertNow = canRevert && finishedAndLive;

  async function downloadRejectedCsv() {
    setDownloading(true);
    setDownloadError(null);
    try {
      saveBlob(await downloadRejected(api, id), `rejected-${id}.csv`);
    } catch (e) {
      setDownloadError(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  let notice: { variant: 'info' | 'error'; text: string } | null = null;
  if (batch.reverted) notice = { variant: 'info', text: t('batch.revertedNotice') };
  else if (batch.status === 'queued') {
    const seconds = Math.max(0, Math.floor((now - Date.parse(batch.created_at)) / 1000));
    notice = { variant: 'info', text: t(tooLong ? 'batch.queuedLong' : 'batch.queued', { seconds }) };
  } else if (batch.status === 'running') {
    notice = { variant: 'info', text: t('batch.running', { done: format.number(counters.processed ?? 0), total: format.number(batch.row_count) }) };
  } else if (batch.status === 'partial') notice = { variant: 'info', text: t('batch.partial') };
  else if (batch.status === 'failed') notice = { variant: 'error', text: t('batch.failed') };

  return (
    <div className="flex flex-col gap-4">
      <Link to="/uploads" className="inline-flex w-fit items-center gap-1.5 rounded-control text-ui text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <ArrowLeft aria-hidden className="size-4" />
        {t('batch.back')}
      </Link>

      <div className="flex flex-col gap-3 shell:flex-row shell:items-start shell:justify-between">
        <div className="min-w-0">
          <h2 className="wrap-anywhere text-xl font-semibold text-ink">{batch.file_name}</h2>
          <p className="text-ui text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {rejected > 0 && (
            <Button variant="secondary" isPending={downloading} onPress={() => void downloadRejectedCsv()}>
              {t('batch.rejected')}
            </Button>
          )}
          {canPublish && finishedAndLive && (
            <Button isPending={publish.pending} isDisabled={publish.waitSeconds > 0} onPress={() => void publish.submit()}>
              {publish.waitSeconds > 0 ? t('batch.wait', { seconds: publish.waitSeconds }) : t('batch.publish')}
            </Button>
          )}
          {canRevertNow && (
            <Button variant="danger" onPress={() => setRevertOpen(true)}>
              {t('batch.revert')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-ui">
        <span className="text-muted">{t('batch.statusLabel')}</span>
        <StatusBadge status={shownStatus} />
      </div>

      {(publish.error || downloadError) && (
        <Banner
          variant="error"
          action={
            publish.canRetry ? (
              <Button variant="secondary" onPress={() => void publish.submit()}>
                {t('common.retry')}
              </Button>
            ) : undefined
          }
        >
          {publish.error ?? downloadError}
        </Banner>
      )}
      {report && (
        <Banner variant="info">
          {t('batch.revertDone', { removed: format.number(Object.values(report.removed).reduce((a, b) => a + b, 0)) })}
          {report.skipped.length > 0 ? ` ${t('batch.revertSkipped', { skipped: format.number(report.skipped.length) })}` : ''}
        </Banner>
      )}
      {notice && <Banner variant={notice.variant}>{notice.text}</Banner>}

      <div className="grid grid-cols-2 gap-3 shell:grid-cols-5">
        <Stat label={t('batch.stats.total')} value={live && batch.row_count === 0 ? '—' : count(batch.row_count)} />
        <Stat label={t('batch.stats.created')} value={count(counters.created)} />
        <Stat label={t('batch.stats.updated')} value={count(counters.updated)} />
        <Stat label={t('batch.stats.unchanged')} value={count(counters.unchanged)} />
        <Stat label={t('batch.stats.rejected')} value={count(counters.rejected)} />
      </div>

      {rejected > 0 && <p className="text-ui text-ink">{t('batch.rejectedSummary', { count: format.number(rejected) })}</p>}

      {batch.warnings.length > 0 && (
        <section className="flex flex-col gap-1.5 rounded-panel bg-surface p-4 shadow-sheet">
          <h3 className="text-ui font-semibold text-ink">{t('batch.warnings', { count: batch.warnings.length })}</h3>
          <ul className="flex flex-col gap-1 text-xs text-muted">
            {batch.warnings.map((warning, i) => (
              <li key={i} className="break-words">
                • {warning}
              </li>
            ))}
          </ul>
        </section>
      )}

      {revertOpen && (
        <RevertDialog
          batchId={id}
          fileName={batch.file_name}
          onClose={() => setRevertOpen(false)}
          onReverted={(result) => {
            setRevertOpen(false);
            setReport(result);
            void queryClient.invalidateQueries({ queryKey: ['batch', id] });
            void queryClient.invalidateQueries({ queryKey: ['uploads'] });
          }}
        />
      )}
    </div>
  );
}
