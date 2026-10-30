import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../../api/problem';
import { useErrorDetails, useErrorMessage } from '../../../api/use-error-message';
import { userLabel } from '../../../api/user-ref';
import { useApi } from '../../../auth/session-context';
import { Badge } from '../../../ui/Badge';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { DataList, type Column } from '../../../ui/DataList';
import { PanelBody, PanelHead } from '../../../ui/DetailPanel';
import { ListState } from '../../../ui/ListState';
import { Select } from '../../../ui/Select';
import { POLL_INTERVAL_MS } from '../../jobs/usePollingStatus';
import { UUID, aiKeys, putLabel, type JudgePassStatus, type JudgeVerdict } from '../ai-api';
import { usePassErrorText } from '../EvalRunJudge';
import { exampleSummary } from '../prompt-form';
import { useAiFormat } from '../useAiFormat';
import { AddToExamplesDialog, useNotEligibleText } from './AddToExamplesDialog';
import {
  getRealPass, getSourcePreview, isRealPassActive, passOperation, realKeys, type ConfigPair, type RealPass, type RealPassItem, type RealSkipped,
} from './real-questions-api';

const NONE = '__none';
const VERDICTS: JudgeVerdict[] = ['pass', 'fail_major', 'fail_minor'];
export const PASS_TONE: Record<JudgePassStatus, 'neutral' | 'primary' | 'success' | 'danger'> = { queued: 'neutral', running: 'primary', finished: 'success', failed: 'danger' };
const codeBlock = 'block whitespace-pre-wrap wrap-anywhere rounded-inner bg-canvas p-2 font-mono text-xs text-ink';

/** The pair a pass was filtered by, from its `filters` (read by key; anything of another shape counts as "no filter"). */
export function passConfig(pass: Pick<RealPass, 'filters'>): ConfigPair | null {
  const config = pass.filters.config;
  if (typeof config !== 'object' || config === null) return null;
  const { number, model } = config as Record<string, unknown>;
  return typeof number === 'number' && typeof model === 'string' ? { number, model } : null;
}

function passSkipped(pass: Pick<RealPass, 'filters'>): RealSkipped {
  const skipped = (typeof pass.filters.skipped === 'object' && pass.filters.skipped !== null ? pass.filters.skipped : {}) as Record<string, unknown>;
  const count = (key: string) => (typeof skipped[key] === 'number' ? skipped[key] : 0);
  return { private_word: count('private_word'), no_content: count('no_content'), already_judged: count('already_judged') };
}

/**
 * Puts or takes back (`verdict: null`) the owner's label on one criterion of one real question, and patches the cached pass from the answer so whatever
 * shows the label shows it at once. Every judge revision's agreement is measured against the labels, so those are read again.
 */
export function useRealLabelMutation(passId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  type Data = Awaited<ReturnType<typeof getRealPass>>;
  return useMutation({
    mutationFn: (v: { questionId: string; criterion: string; verdict: JudgeVerdict | null }) =>
      putLabel(api, { subject_kind: 'real_question', subject_id: v.questionId, criterion: v.criterion, verdict: v.verdict }),
    onSuccess: (saved) => {
      queryClient.setQueryData<Data>(
        realKeys.pass(passId),
        (old) => old && {
          ...old,
          items: old.items.map((item) => (item.question_id !== saved.subject_id
            ? item
            : {
              ...item,
              labels: [...item.labels.filter((existing) => existing.criterion !== saved.criterion), ...(saved.verdict === null ? [] : [{ criterion: saved.criterion, verdict: saved.verdict }])],
            })),
        },
      );
      void queryClient.invalidateQueries({ queryKey: aiKeys.anyJudgeAgreement() });
    },
  });
}

/**
 * One pass over real questions beside the list (nhóm B design §7.1 "Kết quả"): its judge, filters and cost, and each question as the judge saw it with its
 * verdict, its reason, the owner's label and, for a failed one, [Đưa vào bộ ví dụ]. A pass still queued or running is read again every 2 s. A question that
 * was deleted since is listed from the snapshot (no date, no add button).
 */
export function RealPassResults({ id }: { id: string }) {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const errorDetails = useErrorDetails();
  const errorMessage = useErrorMessage();
  const errorText = usePassErrorText();
  const notEligibleText = useNotEligibleText();
  const validId = UUID.test(id);
  const query = useQuery({
    queryKey: realKeys.pass(id),
    queryFn: () => getRealPass(api, id),
    enabled: validId,
    refetchInterval: (q) => (q.state.data && isRealPassActive(q.state.data.pass) ? POLL_INTERVAL_MS : false),
  });
  const label = useRealLabelMutation(id);
  // The question whose [Đưa vào bộ ví dụ] was pressed: its preview is read fresh each time (`gcTime: 0`), then the dialog opens.
  const [asked, setAsked] = useState<string | null>(null);
  const preview = useQuery({
    queryKey: asked === null ? [...realKeys.all, 'source', 'none'] : realKeys.source({ question_id: asked }),
    queryFn: () => getSourcePreview(api, { question_id: asked! }),
    enabled: asked !== null,
    gcTime: 0,
  });

  const data = query.data;
  if (!data) {
    const missing = !validId || (query.error instanceof ApiError && query.error.problem.status === 404);
    return (
      <>
        <PanelHead title={t('ai.real.results.titleUnknown')} />
        <PanelBody>
          {missing ? <p className="text-ui text-ink">{t('ai.real.results.notFound')}</p> : <ListState state={query.isPending ? 'loading' : 'error'} onRetry={() => void query.refetch()} />}
        </PanelBody>
      </>
    );
  }

  const { pass, items } = data;
  const none = t('ai.real.results.none');
  const operation = passOperation(pass);
  const config = passConfig(pass);
  const skipped = passSkipped(pass);
  const pairText = (number: number | null, model: string | null) => (number === null ? (model ?? none) : t('ai.real.results.pair', { number, model: model ?? none }));
  const verdictName = (verdict: JudgeVerdict | null) => t(`ai.eval.detail.judge.verdicts.${verdict ?? 'unjudged'}`);
  const choices = [{ id: NONE, label: t('ai.eval.detail.judge.labelNone') }, ...VERDICTS.map((verdict) => ({ id: verdict, label: verdictName(verdict) }))];
  const sameProvider = pass.judge_model?.provider === 'anthropic' && items.some((item) => item.provider === 'anthropic');
  const filterLine = [config ? t('ai.real.results.pair', { number: config.number, model: config.model }) : t('ai.real.results.allPairs'), pass.filters.test_accounts_only === true ? t('ai.real.results.testOnly') : null]
    .filter((part) => part !== null).join(' · ');
  const previewProblem = preview.error instanceof ApiError ? preview.error.problem : null;

  let notice: { variant: 'info' | 'error'; text: string } | null = null;
  if (pass.status === 'queued') notice = { variant: 'info', text: t('ai.real.results.queued') };
  else if (pass.status === 'running') notice = { variant: 'info', text: t('ai.real.results.running', { judged: pass.judged, total: pass.total }) };
  else if (pass.status === 'failed') notice = { variant: 'error', text: pass.error ? errorText(pass.error) : t('ai.real.results.failedNoReason') };

  const rows: Array<[string, string]> = [
    [t('ai.real.results.judge'), pass.judge_model ? t('ai.real.results.judgeLine', { name: pass.judge.name, revision: pass.revision, model: pass.judge_model.model_id }) : t('ai.real.results.judgeNoModel', { name: pass.judge.name, revision: pass.revision })],
    [t('ai.real.results.operation'), operation ? t(`ai.operations.names.${operation}`) : none],
    [t('ai.real.results.filters'), filterLine],
    [t('ai.real.results.startedBy'), userLabel(pass.started_by_user, t)],
    [t('ai.real.results.cost'), pass.cost_usd === null ? none : `${format.price(pass.cost_usd)} USD`],
  ];

  const columns: Column<RealPassItem>[] = [
    {
      key: 'question', header: t('ai.real.results.cols.question'), className: 'wrap-anywhere',
      cell: (item) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-semibold">{exampleSummary(item.input)}</span>
          <code className={codeBlock}>{JSON.stringify(item.output)}</code>
          <span className="text-xs text-muted">{item.created_at === null ? t('ai.real.results.deleted') : format.dateTime(item.created_at)}</span>
        </span>
      ),
    },
    {
      key: 'pair', header: t('ai.real.results.cols.pair'), className: 'wrap-anywhere', card: 'field',
      cell: (item) => (item.config_number === null && item.model === null ? none : pairText(item.config_number, item.model)),
    },
    {
      key: 'score', header: t('ai.real.results.cols.score'), className: 'wrap-anywhere', card: 'field',
      cell: (item) => {
        const lines = pass.criteria.flatMap((criterion) => item.scores.filter((score) => score.criterion === criterion.code));
        if (lines.length === 0) return t('ai.real.results.pending');
        return (
          <span className="flex min-w-0 flex-col gap-1">
            {lines.map((score) => (
              <span key={score.criterion} className={score.verdict === 'pass' ? 'text-ink' : 'font-semibold text-danger'}>
                {t('ai.eval.detail.judge.score', { criterion: score.criterion, verdict: verdictName(score.verdict) })}
              </span>
            ))}
          </span>
        );
      },
    },
    {
      key: 'reason', header: t('ai.real.results.cols.reason'), className: 'wrap-anywhere', card: 'field',
      cell: (item) => {
        const reasons = item.scores.flatMap((score) => score.reason ?? score.problem ?? []);
        return reasons.length === 0 ? none : <span className="flex min-w-0 flex-col gap-1 text-xs text-muted">{reasons.map((reason, index) => <span key={index}>{reason}</span>)}</span>;
      },
    },
    {
      key: 'label', header: t('ai.real.results.cols.label'), className: 'min-w-40', card: 'field',
      cell: (item) => (
        <span className="flex min-w-0 flex-col gap-1">
          {pass.criteria.map((criterion) => (
            <Select
              key={criterion.code}
              hideLabel
              label={t('ai.eval.detail.judge.labelFor', { example: exampleSummary(item.input), criterion: criterion.code })}
              items={choices}
              value={item.labels.find((existing) => existing.criterion === criterion.code)?.verdict ?? NONE}
              onChange={(value) => label.mutate({ questionId: item.question_id, criterion: criterion.code, verdict: value === NONE ? null : (value as JudgeVerdict) })}
              isDisabled={label.isPending}
            />
          ))}
        </span>
      ),
    },
    {
      key: 'actions', header: t('ai.real.results.cols.actions'), card: 'action',
      cell: (item) => (item.can_add_to_examples ? (
        <Button
          variant="secondary"
          aria-label={t('ai.real.add.buttonFor', { question: exampleSummary(item.input) })}
          isPending={asked === item.question_id && preview.isFetching}
          onPress={() => (asked === item.question_id ? void preview.refetch() : setAsked(item.question_id))}
        >
          {t('ai.real.add.button')}
        </Button>
      ) : null),
    },
  ];

  return (
    <>
      <PanelHead
        title={t('ai.real.results.title', { time: format.dateTime(pass.created_at) })}
        status={<Badge tone={PASS_TONE[pass.status]}>{t(`ai.eval.detail.judge.statuses.${pass.status}`)}</Badge>}
      />
      <PanelBody>
        {notice && <Banner variant={notice.variant}>{notice.text}</Banner>}
        <dl className="flex min-w-0 flex-col gap-2 text-ui">
          {rows.map(([name, value]) => (
            <div key={name} className="flex min-w-0 gap-4">
              <dt className="w-32 shrink-0 text-muted">{name}</dt>
              <dd className="min-w-0 tabular-nums text-ink wrap-anywhere">{value}</dd>
            </div>
          ))}
        </dl>
        {skipped.private_word + skipped.no_content + skipped.already_judged > 0 && (
          <ul className="flex flex-col gap-0.5 text-ui text-muted">
            {skipped.private_word > 0 && <li>{t('ai.real.estimate.skippedPrivate', { count: skipped.private_word })}</li>}
            {skipped.no_content > 0 && <li>{t('ai.real.estimate.skippedNoContent', { count: skipped.no_content })}</li>}
            {skipped.already_judged > 0 && <li>{t('ai.real.estimate.skippedJudged', { count: skipped.already_judged })}</li>}
          </ul>
        )}
        <section aria-labelledby="real-pass-results" className="flex min-w-0 flex-col gap-2">
          <h3 id="real-pass-results" className="text-ui font-semibold text-ink">{t('ai.real.results.section')}</h3>
          {sameProvider && <p className="text-ui text-muted">{t('ai.eval.detail.judge.sameProvider')}</p>}
          {label.isError && <Banner variant="error" code={errorDetails(label.error).code}>{errorDetails(label.error).message}</Banner>}
          {asked !== null && preview.isError && <Banner variant="error">{notEligibleText(previewProblem) ?? errorMessage(preview.error)}</Banner>}
          <DataList rows={items} rowKey={(item) => item.question_id} columns={columns} state="ready" emptyText={t('ai.real.results.empty')} />
        </section>
      </PanelBody>
      {asked !== null && preview.data && <AddToExamplesDialog source={{ question_id: asked }} preview={preview.data} onClose={() => setAsked(null)} />}
    </>
  );
}
