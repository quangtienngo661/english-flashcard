import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useFormatter, useTranslations } from 'use-intl';
import { saveBlob } from '../../api/download';
import { useErrorMessage } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { useDateTime } from '../../i18n/use-date-time';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { PanelBody, PanelFooter, PanelHead } from '../../ui/DetailPanel';
import { ListState } from '../../ui/ListState';
import { Stat, StatTotal } from '../../ui/Stat';
import { createPublishJob, downloadRejected, getUpload, type BatchView, type JobStatus, type RevertReport } from '../content/content-api';
import { useSubmitAction } from '../content/useSubmitAction';
import { StatusBadge } from '../jobs/StatusBadge';
import { useNow } from '../jobs/useNow';
import { isTerminal, usePollingStatus, useQueuedTooLong } from '../jobs/usePollingStatus';
import { RevertDialog } from './RevertDialog';

/**
 * Spec §6.3 "Chi tiết lô", shown in the panel beside the uploads list (design §6.3, UB8): status refreshes by itself;
 * counters, warnings, rejected.csv, publish and revert. Rendered inside `DetailPanel`, so its polling stops on close.
 */
export function BatchPanel({ id }: { id: string }) {
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

  // UBE27: when the polling sees this batch finish, refresh the list so the row's pill matches the panel.
  const seen = useRef<JobStatus | undefined>(undefined);
  useEffect(() => {
    const status = batch?.status;
    if (seen.current && !isTerminal(seen.current) && isTerminal(status)) void queryClient.invalidateQueries({ queryKey: ['uploads'] });
    seen.current = status;
  }, [batch?.status, queryClient]);

  if (!batch) {
    return (
      <>
        <PanelHead title={t('nav.uploads')} />
        <PanelBody>
          <ListState state={query.isPending ? 'loading' : 'error'} onRetry={() => void query.refetch()} />
        </PanelBody>
      </>
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
  const canPublishNow = canPublish && finishedAndLive;

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
    <>
      <PanelHead
        title={batch.file_name}
        status={
          <div className="flex flex-col gap-1.5">
            <StatusBadge status={shownStatus} progress={batch.status === 'running' ? { done: counters.processed ?? 0, total: batch.row_count } : undefined} />
            <p className="text-ui text-muted">{subtitle}</p>
          </div>
        }
      />
      <PanelBody>
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

        <div className="grid grid-cols-2 gap-2.5">
          <Stat tone="primary" label={t('batch.stats.created')} value={count(counters.created)} />
          <Stat tone="accent" label={t('batch.stats.updated')} value={count(counters.updated)} />
          <Stat tone="neutral" label={t('batch.stats.unchanged')} value={count(counters.unchanged)} />
          <Stat tone="danger" label={t('batch.stats.rejected')} value={count(counters.rejected)} />
        </div>
        <StatTotal label={t('batch.stats.total')} value={live && batch.row_count === 0 ? '—' : count(batch.row_count)} />

        {rejected > 0 && <p className="text-ui text-ink">{t('batch.rejectedSummary', { count: format.number(rejected) })}</p>}

        {batch.warnings.length > 0 && (
          <section className="flex flex-col gap-1.5 rounded-panel border-2 border-border p-4">
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
      </PanelBody>

      {(canPublishNow || rejected > 0 || canRevertNow) && (
        <PanelFooter>
          {canPublishNow && (
            <Button isPending={publish.pending} isDisabled={publish.waitSeconds > 0} onPress={() => void publish.submit()}>
              {publish.waitSeconds > 0 ? t('batch.wait', { seconds: publish.waitSeconds }) : t('batch.publish')}
            </Button>
          )}
          {rejected > 0 && (
            <Button variant="secondary" isPending={downloading} onPress={() => void downloadRejectedCsv()}>
              {t('batch.rejected')}
            </Button>
          )}
          {canRevertNow && (
            <Button variant="danger" onPress={() => setRevertOpen(true)}>
              {t('batch.revert')}
            </Button>
          )}
        </PanelFooter>
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
    </>
  );
}
