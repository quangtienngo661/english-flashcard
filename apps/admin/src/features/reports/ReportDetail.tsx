import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { userLabel } from '../../api/user-ref';
import { useSubmitAction } from '../content/useSubmitAction';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { useErrorMessage } from '../../api/use-error-message';
import { useDateTime } from '../../i18n/use-date-time';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { PanelBody, PanelFooter, PanelHead } from '../../ui/DetailPanel';
import { ListState } from '../../ui/ListState';
import { AddToExamplesDialog, useNotEligibleText } from '../ai/real-questions/AddToExamplesDialog';
import { getSourcePreview, realKeys, type SourceRef } from '../ai/real-questions/real-questions-api';
import { STATUS_TONE, useTypeLabel } from './ReportsPage';
import { getReport, reportWord, resolveReport, type Report, type ResolveStatus } from './reports-api';

const UUID = /^[0-9a-f]{8}[-][0-9a-f]{4}[-][0-9a-f]{4}[-][0-9a-f]{4}[-][0-9a-f]{12}$/i;
const reportKey = (id: string) => ['report', id] as const;

/** One `Idempotency-Key` per status the staff member may send; a lost answer is retried with the same key (spec §6.3). */
function useResolve(id: string, status: ResolveStatus) {
  const api = useApi();
  const queryClient: QueryClient = useQueryClient();
  return useSubmitAction(
    async (key) => {
      try {
        return await resolveReport(api, id, status, key);
      } catch (error) {
        // Someone else handled it first (B7E76): load the report again so the panel shows how.
        if (error instanceof ApiError && error.problem.slug === 'report-not-open') {
          void queryClient.invalidateQueries({ queryKey: reportKey(id) });
          void queryClient.invalidateQueries({ queryKey: ['reports'] });
        }
        throw error;
      }
    },
    `${id}:${status}`,
    (result) => {
      queryClient.setQueryData(reportKey(id), result);
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="wrap-anywhere text-ui text-ink">{children}</dd>
    </div>
  );
}

/** A hint as the learner saw it: a `{ text }` step, or the older `{ first_letter, length }`. */
function hintText(hint: unknown): string | null {
  if (typeof hint !== 'object' || hint === null) return null;
  const h = hint as { text?: unknown; first_letter?: unknown; length?: unknown };
  if (typeof h.text === 'string') return h.text;
  if (typeof h.first_letter === 'string') return `${h.first_letter}… (${String(h.length ?? '?')})`;
  return null;
}

/**
 * Which option the learner chose. A report holds the index (`learner.option_index`); one older than that field has only the
 * text, and two masked options read the same, so the choice is then unknown (design §6.8).
 */
function chosenOption(report: Report, options: string[]): { index: number | null; unclear: boolean } {
  const { learner } = report.question_snapshot;
  if (learner.option_index !== undefined) return { index: learner.option_index, unclear: false };
  if (learner.answer === null) return { index: null, unclear: false };
  const matches = options.flatMap((text, i) => (text === learner.answer ? [i] : []));
  return matches.length === 1 ? { index: matches[0]!, unclear: false } : { index: null, unclear: matches.length > 1 };
}

/** The report beside the list: the question as the learner met it, the AI details, and the way to resolve it (design §6.8). */
export function ReportDetail({ id, listSearch }: { id: string; listSearch: string }) {
  const t = useTranslations();
  const api = useApi();
  const dateTime = useDateTime();
  const typeLabel = useTypeLabel();
  const errorMessage = useErrorMessage();
  const notEligibleText = useNotEligibleText();
  // `settings.manage`: the AI calls page and the example-set preview both need it (`content.edit` is enough to read a report, an editor would get 403).
  const canManage = useCan('settings.manage');
  const query = useQuery({ queryKey: reportKey(id), queryFn: () => getReport(api, id), enabled: UUID.test(id) });
  // "Đưa vào bộ ví dụ" (nhóm B M4, B43): asked only by an admin, for a confirmed AI report; an editor never sends this request.
  const source: SourceRef = { report_id: id };
  const preview = useQuery({
    queryKey: realKeys.source(source),
    queryFn: () => getSourcePreview(api, source),
    enabled: canManage && query.data?.status === 'confirmed' && query.data.question_source === 'ai',
  });
  const [adding, setAdding] = useState(false);
  const noError = useResolve(id, 'no_error');
  const fixed = useResolve(id, 'fixed');
  const confirmed = useResolve(id, 'confirmed');

  const [lastPressed, setLastPressed] = useState<ResolveStatus | null>(null);
  const press = (status: ResolveStatus, action: ReturnType<typeof useResolve>) => {
    setLastPressed(status);
    void action.submit();
  };

  const report = query.data;
  if (!report) {
    // An id that is no UUID cannot exist (the API would answer 400): same as a 404.
    const missing = !UUID.test(id) || (query.error instanceof ApiError && query.error.problem.status === 404);
    return (
      <>
        <PanelHead title={t('reports.detail.titleUnknown')} />
        <PanelBody>
          {missing ? (
            <>
              <p className="text-ui text-ink">{t('reports.detail.notFound')}</p>
              <Link to={`/reports${listSearch}`} className="w-fit rounded-control text-ui text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">
                {t('reports.detail.backToList')}
              </Link>
            </>
          ) : (
            <ListState state={query.isPending ? 'loading' : 'error'} onRetry={() => void query.refetch()} />
          )}
        </PanelBody>
      </>
    );
  }

  const snapshot = report.question_snapshot;
  const { prompt, correct, learner } = snapshot;
  const word = reportWord(report);
  const options = prompt.options ?? [];
  const chosen = chosenOption(report, options);
  const hints = (['level1', 'level2', 'level3'] as const).flatMap((level) => hintText(snapshot.hints_shown[level]) ?? []);
  const correctText =
    correct.option_index !== undefined ? options[correct.option_index]
    : correct.is_true !== undefined ? t(correct.is_true ? 'reports.detail.true' : 'reports.detail.false')
    : correct.main ?? correct.lemma;
  const isAi = report.question_source === 'ai';
  const isOpen = report.status === 'open';
  // The same condition the API uses to give the unit back (`reports.service.ts`, `refunds.ts`).
  const refundLine = isOpen && isAi && report.ai_charged && report.ai_operation_id !== null && report.refundable;
  const actions = [noError, fixed, confirmed];
  const busy = actions.some((a) => a.pending || a.waitSeconds > 0);
  // Only the button pressed last has a say: an older failure of another button must not outlive a later success.
  const failed = lastPressed === 'no_error' ? noError : lastPressed === 'fixed' ? fixed : lastPressed === 'confirmed' ? confirmed : undefined;

  const who = [report.resolved_by_user ? userLabel(report.resolved_by_user, t) : null, report.resolved_by_role].filter(Boolean).join(' · ');
  const callId = report.call_operation_id;

  return (
    <>
      <PanelHead
        title={t('reports.detail.title', { word })}
        status={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[report.status]}>{t(`reports.statuses.${report.status}`)}</Badge>
            <span className="text-ui text-muted">
              {typeLabel(snapshot.type)} · {t(`reports.sources.${report.question_source}`)} · {dateTime(report.created_at)}
            </span>
          </div>
        }
      />
      <PanelBody>
        {failed?.error && (
          <Banner
            variant="error"
            code={failed.error.code}
            action={failed.canRetry ? <Button variant="secondary" onPress={() => void failed.submit()}>{t('common.retry')}</Button> : undefined}
          >
            {failed.error.message}
          </Banner>
        )}

        <section className="flex flex-col gap-3">
          <h3 className="text-ui font-bold text-ink">{t('reports.detail.question')}</h3>
          <dl className="flex flex-col gap-3">
            {prompt.lemma && <Row label={t('reports.cols.word')}>{prompt.lemma}</Row>}
            {prompt.meaning && <Row label={t('reports.detail.meaning')}>{prompt.meaning}</Row>}
            {prompt.sentence && <Row label={t('reports.detail.sentence')}>{prompt.sentence}</Row>}
            {options.length > 0 && (
              <Row label={t('reports.detail.options')}>
                <ol className="flex flex-col gap-1.5">
                  {options.map((text, i) => (
                    <li key={i} data-testid={`option-${i}`} className="flex flex-wrap items-center gap-2">
                      <span>{text}</span>
                      {correct.option_index === i && <Badge tone="success">{t('reports.detail.correctMark')}</Badge>}
                      {chosen.index === i && <Badge tone="danger">{t('reports.detail.learnerPicked')}</Badge>}
                    </li>
                  ))}
                </ol>
                {chosen.unclear && (
                  <p className="mt-2 flex flex-wrap gap-1.5 text-muted">
                    <span>{t('reports.detail.learnerPicked')}:</span>
                    <span>{t('reports.detail.unclearOption')}</span>
                  </p>
                )}
              </Row>
            )}
            {correctText !== undefined && <Row label={t('reports.detail.correctAnswer')}>{correctText}</Row>}
            <Row label={t('reports.detail.learnerAnswer')}>
              {learner.answer ?? <span className="text-muted">{t('reports.detail.noAnswer')}</span>}
              {learner.answers_tried.length > 1 && (
                <span className="block text-xs text-muted">{t('reports.detail.triedAnswers')}: {learner.answers_tried.join(' · ')}</span>
              )}
            </Row>
            <Row label={t('reports.detail.hints')}>
              {hints.length > 0 ? (
                <ul className="flex flex-col gap-1">{hints.map((h, i) => <li key={i}>{h}</li>)}</ul>
              ) : (
                <span className="text-muted">{t('reports.detail.noHints')}</span>
              )}
            </Row>
          </dl>
        </section>

        <section className="flex flex-col gap-3">
          <dl className="flex flex-col gap-3">
            <Row label={t('reports.detail.reason')}>{report.reason_label}</Row>
            <Row label={t('reports.detail.note')}>{report.note ?? <span className="text-muted">{t('reports.detail.noNote')}</span>}</Row>
          </dl>
        </section>

        {isAi && (
          <section className="flex flex-col gap-3">
            <h3 className="text-ui font-bold text-ink">{t('reports.detail.ai')}</h3>
            <dl className="flex flex-col gap-3">
              <Row label={t('reports.detail.operationId')}>{report.ai_operation_id ?? '—'}</Row>
              <Row label={t('reports.detail.callId')}>
                {callId ?? '—'}
                {callId && canManage && (
                  <Link
                    to={`/ai/calls?operation_id=${encodeURIComponent(callId)}`}
                    className="ml-3 rounded-control text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t('reports.detail.openCall')}
                  </Link>
                )}
              </Row>
              <Row label={t('reports.detail.model')}>{report.model ?? '—'}</Row>
              <Row label={t('reports.detail.promptRevision')}>{report.prompt_revision ?? '—'}</Row>
            </dl>
          </section>
        )}

        {!isOpen && (
          <section className="flex flex-col gap-2">
            <h3 className="text-ui font-bold text-ink">{t('reports.detail.resolved')}</h3>
            <p className="text-ui text-ink">
              {t('reports.detail.resolvedLine', {
                status: t(`reports.statuses.${report.status}`),
                who: who || '—',
                time: report.resolved_at ? dateTime(report.resolved_at) : '—',
              })}
            </p>
            {report.status === 'confirmed' && (
              <p className="text-ui text-ink">
                {report.refunded === true ? t('reports.detail.refunded') : report.refunded === null ? t('reports.detail.refundPending') : t('reports.detail.notRefunded')}
              </p>
            )}
            {preview.data && (
              <div>
                <Button variant="secondary" onPress={() => setAdding(true)}>{t('ai.real.add.button')}</Button>
              </div>
            )}
            {preview.isError && (
              <p className="text-ui text-muted">{notEligibleText(preview.error instanceof ApiError ? preview.error.problem : null) ?? errorMessage(preview.error)}</p>
            )}
            {report.status === 'fixed' && (
              <p className="flex flex-col gap-1 text-ui text-ink">
                <span>{t('reports.detail.fixHint')}</span>
                <Link
                  to={`/senses?q=${encodeURIComponent(word)}`}
                  className="w-fit rounded-control text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {t('reports.detail.fixLink', { word })}
                </Link>
              </p>
            )}
          </section>
        )}
      </PanelBody>
      {adding && preview.data && <AddToExamplesDialog source={source} preview={preview.data} onClose={() => setAdding(false)} />}
      {isOpen && (
        <PanelFooter>
          <div className="flex w-full flex-col gap-3">
            {refundLine && <p className="text-ui text-muted">{t('reports.actions.refundLine')}</p>}
            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" isPending={noError.pending} isDisabled={busy && !noError.pending} onPress={() => press('no_error', noError)}>
                {t('reports.actions.noError')}
              </Button>
              {isAi ? (
                <Button isPending={confirmed.pending} isDisabled={busy && !confirmed.pending} onPress={() => press('confirmed', confirmed)}>
                  {t('reports.actions.confirmed')}
                </Button>
              ) : (
                <Button isPending={fixed.pending} isDisabled={busy && !fixed.pending} onPress={() => press('fixed', fixed)}>
                  {t('reports.actions.fixed')}
                </Button>
              )}
            </div>
          </div>
        </PanelFooter>
      )}
    </>
  );
}
