import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../../api/problem';
import { userLabel } from '../../../api/user-ref';
import { useApi } from '../../../auth/session-context';
import { Badge } from '../../../ui/Badge';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { Checkbox } from '../../../ui/Checkbox';
import { DataList, type Column } from '../../../ui/DataList';
import { DetailPanel } from '../../../ui/DetailPanel';
import { focusRowLink } from '../../../ui/focus-row-link';
import { ListState } from '../../../ui/ListState';
import { Select } from '../../../ui/Select';
import { useRetained } from '../../../ui/use-retained';
import { useSubmitAction } from '../../content/useSubmitAction';
import { POLL_INTERVAL_MS } from '../../jobs/usePollingStatus';
import { AI_OPERATION_ORDER, aiKeys, listJudges } from '../ai-api';
import { useJudgeChoice, usePassErrorText } from '../EvalRunJudge';
import { useAiFormat } from '../useAiFormat';
import { PASS_TONE, RealPassResults } from './RealPassResults';
import {
  getEstimate, isRealOperation, isRealPassActive, listRealPasses, passOperation, realKeys, startRealJudge, type ConfigPair, type RealJudgeFilters, type RealOperation, type RealPass,
} from './real-questions-api';

const ALL = '__all';
const pairId = (pair: ConfigPair) => JSON.stringify([pair.number, pair.model]);
const sameOrder = (a: RealOperation, b: RealOperation) => AI_OPERATION_ORDER.indexOf(a) - AI_OPERATION_ORDER.indexOf(b);
const linkClass = 'rounded-control text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary';

/**
 * `/ai/real-questions` (admin only, nhóm B design §7.1, D26, D35): choose a judge, an operation, optionally one (config, model) pair and "only test
 * accounts", see how many real AI questions that takes and what it would cost, then start a pass. The passes are listed below; `?pass=<id>` opens one
 * beside the list.
 */
export function RealQuestionsPage() {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const format = useAiFormat();
  const errorText = usePassErrorText();
  const [params, setParams] = useSearchParams();
  const passId = params.get('pass') ?? undefined;
  const shownPassId = useRetained(passId);

  const judges = useQuery({ queryKey: aiKeys.judges(), queryFn: () => listJudges(api) });
  const candidates = (judges.data?.items ?? []).filter((judge) => judge.active && judge.operations.some(isRealOperation));
  const choice = useJudgeChoice(candidates);
  const judge = choice.judge;
  const operations = (judge?.operations.filter(isRealOperation) ?? []).sort(sameOrder);
  const [operationPick, setOperationPick] = useState<RealOperation | null>(null);
  const operation = operationPick !== null && operations.includes(operationPick) ? operationPick : (operations[0] ?? null);
  const [pair, setPair] = useState<ConfigPair | null>(null);
  const [testOnly, setTestOnly] = useState(false);
  const filters: RealJudgeFilters | null = judge && operation ? { judge_id: judge.id, operation, config: pair, test_accounts_only: testOnly } : null;

  // The previous answer stays on screen while the next one is read, but cannot start a pass: it is not the selection the controls show.
  const estimate = useQuery({
    queryKey: filters ? realKeys.estimate(filters) : [...realKeys.all, 'estimate', 'none'],
    queryFn: () => getEstimate(api, filters!),
    enabled: filters !== null,
    placeholderData: keepPreviousData,
  });
  const reading = estimate.isPlaceholderData || estimate.isPending;
  const answer = estimate.data;

  const [started, setStarted] = useState(0);
  const start = useSubmitAction(
    (key) => startRealJudge(api, filters!, key),
    `real-judge:${filters?.judge_id ?? ''}:${filters?.operation ?? ''}:${pair ? pairId(pair) : ''}:${testOnly}:${started}`,
    (result) => {
      setStarted((n) => n + 1);
      // The pass is queued: the estimate (what is left to judge) and the passes are read again, and the new pass opens beside the list.
      void queryClient.invalidateQueries({ queryKey: realKeys.all });
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('pass', result.pass_id);
        return next;
      });
    },
  );

  const passes = useInfiniteQuery({
    queryKey: realKeys.passes(),
    queryFn: ({ pageParam }) => listRealPasses(api, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
    refetchInterval: (query) => (query.state.data?.pages.some((page) => page.items.some(isRealPassActive)) ? POLL_INTERVAL_MS : false),
  });
  const passRows = passes.data?.pages.flatMap((page) => page.items) ?? [];
  const passHref = (id: string) => `/ai/real-questions?pass=${id}`;
  const back = () => setParams((previous) => {
    const next = new URLSearchParams(previous);
    next.delete('pass');
    return next;
  });

  if (judges.isError && !judges.data) {
    return judges.error instanceof ApiError && judges.error.problem.slug === 'forbidden'
      ? <Banner variant="error">{t('errors.forbidden')}</Banner>
      : <ListState state="error" onRetry={() => void judges.refetch()} />;
  }
  if (!judges.data) return <ListState state="loading" />;

  const selected = answer?.selected ?? 0;
  const pairOptions = [
    { id: ALL, label: t('ai.real.pairAll') },
    ...(answer?.pairs ?? []).map((candidate) => (
      candidate.config_number === null
        ? { id: `none|${candidate.model}`, label: t('ai.real.pairOptionNoConfig', { model: candidate.model, count: candidate.questions }) }
        : { id: pairId({ number: candidate.config_number, model: candidate.model }), label: t('ai.real.pairOption', { number: candidate.config_number, model: candidate.model, count: candidate.questions }) }
    )),
  ];
  // A pair picked earlier that this window no longer has stays in the list (0 questions), so the select never says "Tất cả" while the filter is not.
  if (pair && !pairOptions.some((option) => option.id === pairId(pair))) {
    pairOptions.push({ id: pairId(pair), label: t('ai.real.pairOption', { number: pair.number, model: pair.model, count: 0 }) });
  }
  const pairValue = pair ? pairId(pair) : ALL;
  const onlyNoConfig = (answer?.pairs ?? []).filter((candidate) => candidate.config_number === null).map((candidate) => `none|${candidate.model}`);

  function pickPair(id: string) {
    if (id === ALL) setPair(null);
    else {
      const [number, model] = JSON.parse(id) as [number, string];
      setPair({ number, model });
    }
  }

  const passLine = (pass: RealPass) => {
    const operationName = passOperation(pass);
    const vars = {
      time: format.dateTime(pass.created_at), judge: pass.judge.name, revision: pass.revision, operation: operationName ? t(`ai.operations.names.${operationName}`) : '—',
      judged: format.number(pass.judged), total: format.number(pass.total),
    };
    return pass.cost_usd === null ? t('ai.real.passes.passNoCost', vars) : t('ai.real.passes.pass', { ...vars, cost: format.price(pass.cost_usd) });
  };
  const columns: Column<RealPass>[] = [
    {
      key: 'pass', header: t('ai.real.passes.cols.pass'), className: 'wrap-anywhere',
      cell: (pass) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <Link to={passHref(pass.id)} className={linkClass}>{passLine(pass)}</Link>
          {pass.error && <span className="text-xs text-danger">{errorText(pass.error)}</span>}
          <span className="text-xs text-muted">{userLabel(pass.started_by_user, t)}</span>
        </span>
      ),
    },
    {
      key: 'status', header: t('ai.real.passes.cols.status'), card: 'field',
      cell: (pass) => <Badge tone={PASS_TONE[pass.status]}>{t(`ai.eval.detail.judge.statuses.${pass.status}`)}</Badge>,
    },
  ];

  let estimateBody: ReactNode;
  if (candidates.length === 0) {
    estimateBody = (
      <div className="flex flex-col items-start gap-2">
        <p className="text-ui text-ink">{t('ai.real.noJudge')}</p>
        <Link to="/ai/judges" className={linkClass}>{t('ai.real.noJudgeLink')}</Link>
      </div>
    );
  } else if (estimate.isError && !answer) {
    estimateBody = <ListState state="error" onRetry={() => void estimate.refetch()} />;
  } else if (answer) {
    estimateBody = (
      <div aria-live="polite" className="flex flex-col gap-1 text-ui text-ink">
        {answer.reason === 'retention-off' && <p>{t('ai.real.estimate.retentionOff')}</p>}
        {answer.reason === 'no-staff' && <p>{t('ai.real.estimate.noStaff')}</p>}
        {answer.reason === null && answer.selected === 0 && <p>{t('ai.real.estimate.empty')}</p>}
        {answer.reason === null && answer.selected > 0 && <p className="font-semibold">{t('ai.real.estimate.selected', { selected: format.number(answer.selected), limit: format.number(answer.limit) })}</p>}
        {answer.remaining > 0 && <p>{t('ai.real.estimate.remaining', { remaining: format.number(answer.remaining) })}</p>}
        {answer.skipped.private_word > 0 && <p className="text-muted">{t('ai.real.estimate.skippedPrivate', { count: answer.skipped.private_word })}</p>}
        {answer.skipped.no_content > 0 && <p className="text-muted">{t('ai.real.estimate.skippedNoContent', { count: answer.skipped.no_content })}</p>}
        {answer.skipped.already_judged > 0 && <p className="text-muted">{t('ai.real.estimate.skippedJudged', { count: answer.skipped.already_judged })}</p>}
        {answer.selected > 0 && (answer.estimate_usd === null
          ? <p className="text-muted">{t('ai.real.estimate.costUnknown')}</p>
          : <p>{t('ai.real.estimate.cost', { usd: format.price(String(answer.estimate_usd)) })}</p>)}
        {answer.admin_usd_cap !== null && <p className="text-muted">{t('ai.real.estimate.cap', { cap: format.price(String(answer.admin_usd_cap)) })}</p>}
      </div>
    );
  } else {
    estimateBody = <ListState state="loading" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-ui text-muted">{t('ai.real.note')}</p>
      <section aria-labelledby="real-pick" className="flex flex-col gap-3 rounded-panel border-2 border-border p-4">
        <h2 id="real-pick" className="text-lg font-bold text-ink">{t('ai.real.pick')}</h2>
        {candidates.length > 0 && (
          <div className="grid w-full max-w-3xl grid-cols-1 gap-4 shell:grid-cols-2">
            <Select
              label={t('ai.real.fields.judge')}
              items={choice.items}
              disabledIds={choice.disabledIds}
              value={choice.value}
              onChange={(id) => {
                choice.choose(id);
                setPair(null);
              }}
            />
            <Select
              label={t('ai.real.fields.operation')}
              items={operations.map((candidate) => ({ id: candidate, label: t(`ai.operations.names.${candidate}`) }))}
              value={operation ?? ''}
              onChange={(id) => {
                setOperationPick(id as RealOperation);
                setPair(null);
              }}
            />
            <Select label={t('ai.real.fields.pair')} items={pairOptions} disabledIds={onlyNoConfig} value={pairValue} onChange={pickPair} />
          </div>
        )}
        {candidates.length > 0 && (
          <Checkbox
            isSelected={testOnly}
            onChange={(on) => {
              setTestOnly(on);
              setPair(null);
            }}
          >
            {t('ai.real.fields.testOnly')}
          </Checkbox>
        )}
        {estimateBody}
        {candidates.length > 0 && (
          <div>
            <Button
              isPending={start.pending}
              isDisabled={selected === 0 || answer?.reason !== null || reading || filters === null || start.waitSeconds > 0}
              onPress={() => void start.submit()}
            >
              {t('ai.real.start', { count: selected })}
            </Button>
          </div>
        )}
        {start.error && (
          <Banner
            variant={start.canRetry ? 'offline' : 'error'}
            code={start.error.code}
            action={start.canRetry ? <Button variant="secondary" onPress={() => void start.submit()}>{t('common.retry')}</Button> : undefined}
          >
            {start.error.message}
          </Banner>
        )}
      </section>

      <section aria-labelledby="real-passes" className="flex flex-col gap-3">
        <h2 id="real-passes" className="text-lg font-bold text-ink">{t('ai.real.passes.title')}</h2>
        <DataList
          rows={passRows}
          rowKey={(pass) => pass.id}
          columns={columns}
          rowHref={(pass) => passHref(pass.id)}
          selectedKey={passId}
          state={passes.isPending ? 'loading' : passes.isError && passRows.length === 0 ? 'error' : 'ready'}
          emptyText={t('ai.real.passes.empty')}
          emptyHint={t('ai.real.passes.emptyHint')}
          onRetry={() => void passes.refetch()}
        />
        {passes.hasNextPage && (
          <Button variant="secondary" className="self-center" isPending={passes.isFetchingNextPage} onPress={() => void passes.fetchNextPage()}>
            {t('common.loadMore')}
          </Button>
        )}
      </section>

      {shownPassId && (
        <DetailPanel isOpen={passId !== undefined} onClose={back} onExited={() => focusRowLink(passHref(shownPassId))} focusKey={shownPassId}>
          <RealPassResults key={shownPassId} id={shownPassId} />
        </DetailPanel>
      )}
    </div>
  );
}
