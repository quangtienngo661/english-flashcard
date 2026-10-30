import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../../api/problem';
import { useErrorDetails } from '../../../api/use-error-message';
import { useApi } from '../../../auth/session-context';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { ListState } from '../../../ui/ListState';
import { UUID, aiKeys, getRun, listJudges, listRunItems, type JudgeCriterion, type JudgeVerdict, type LabelView } from '../ai-api';
import { useLabelMutation } from '../EvalRunJudge';
import { useRealLabelMutation } from '../real-questions/RealPassResults';
import { getRealPass, realKeys } from '../real-questions/real-questions-api';
import { firstOpen, labelTasks, outputCount, realLabelTasks, type LabelTask } from './label-queue';

const KEYS: Record<string, { verdict: JudgeVerdict; label: 'pass' | 'major' | 'minor' }> = {
  '1': { verdict: 'pass', label: 'pass' },
  '2': { verdict: 'fail_major', label: 'major' },
  '3': { verdict: 'fail_minor', label: 'minor' },
};
const linkClass =
  'inline-flex min-h-control w-fit items-center whitespace-nowrap rounded-control px-4 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-control-touch';

/** A value of an example as one readable line: text as it is, a list of texts joined, anything else as JSON. */
function show(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) return value.join(', ');
  return JSON.stringify(value);
}

function Fields({ title, fields }: { title: string; fields: Record<string, unknown> }) {
  const entries = Object.entries(fields).filter(([, value]) => value !== null);
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-1">
      <h3 className="text-ui font-semibold text-ink">{title}</h3>
      <dl className="flex min-w-0 flex-col gap-1 text-ui">
        {entries.map(([key, value]) => (
          <div key={key} className="flex min-w-0 gap-3">
            <dt className="w-36 shrink-0 text-muted wrap-anywhere">{key}</dt>
            <dd className="min-w-0 text-ink wrap-anywhere">{show(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * `/ai/judges/label?run=&judge=` or `?pass=` (admin only, nhóm B design §5.4, D16): the dev outputs of a run, or the real questions of a pass, one by one,
 * one criterion at a time, for the owner to label with keys 1 (đạt) / 2 (nặng) / 3 (nhẹ). The judge's own verdict is not shown, so it cannot anchor the
 * owner; held-out outputs are never in the list (the API sends only dev items). A label is shared by every judge revision.
 */
export function LabelQueuePage() {
  const [params] = useSearchParams();
  const passId = params.get('pass');
  return passId === null ? <RunLabelQueue /> : <RealLabelQueue passId={passId} />;
}

/** The queue of a run (`?run=&judge=`): the outputs of the dev examples, labelled as `eval_item`. */
function RunLabelQueue() {
  const t = useTranslations();
  const api = useApi();
  const [params] = useSearchParams();
  const runId = params.get('run') ?? '';
  const judgeId = params.get('judge') ?? '';
  const validRun = UUID.test(runId);
  const judges = useQuery({ queryKey: aiKeys.judges(), queryFn: () => listJudges(api), enabled: validRun && judgeId !== '' });
  const items = useQuery({ queryKey: aiKeys.runItems(runId), queryFn: () => listRunItems(api, runId), enabled: validRun && judgeId !== '' });
  // Only to link back to the run on the right operation: the screen works without it.
  const run = useQuery({ queryKey: aiKeys.run(runId), queryFn: () => getRun(api, runId), enabled: validRun && judgeId !== '' });
  const label = useLabelMutation(runId);

  if (!validRun || judgeId === '') return <Banner variant="info">{t('ai.judges.label.missing')}</Banner>;
  const failed = judges.isError && !judges.data ? judges : items.isError && !items.data ? items : null;
  if (failed) {
    if (failed.error instanceof ApiError && failed.error.problem.slug === 'forbidden') return <Banner variant="error">{t('errors.forbidden')}</Banner>;
    if (failed.error instanceof ApiError && failed.error.problem.status === 404) return <Banner variant="info">{t('ai.judges.label.missing')}</Banner>;
    return <ListState state="error" onRetry={() => void failed.refetch()} />;
  }
  if (!judges.data || !items.data) return <ListState state="loading" />;
  const judge = judges.data.items.find((candidate) => candidate.id === judgeId);
  if (!judge) return <Banner variant="info">{t('ai.judges.label.missing')}</Banner>;
  const operation = run.data?.operation ?? judge.operations[0] ?? 'generate_cloze';
  const subjects = new Map(items.data.items.map((item) => [item.item_id, { input: item.input, output: item.output }]));
  // Keyed by run and judge: another run is a new queue that opens at its own first open task.
  return (
    <Queue
      key={`${runId}|${judge.id}`}
      judgeName={judge.name}
      criteria={judge.latest.criteria}
      tasks={labelTasks(items.data.items, judge.latest.criteria)}
      labels={items.data.items.flatMap((item) => item.labels)}
      subjects={subjects}
      label={label}
      emptyText={t('ai.judges.label.empty')}
      back={{ to: `/ai/eval/runs/${runId}?op=${operation}`, text: t('ai.judges.label.backToRun') }}
    />
  );
}

/** The queue of a pass over real questions (`?pass=`): the questions as the judge saw them, labelled as `real_question` by the question's id. */
function RealLabelQueue({ passId }: { passId: string }) {
  const t = useTranslations();
  const api = useApi();
  const valid = UUID.test(passId);
  const query = useQuery({ queryKey: realKeys.pass(passId), queryFn: () => getRealPass(api, passId), enabled: valid });
  const label = useRealLabelMutation(passId);

  if (!valid) return <Banner variant="info">{t('ai.judges.label.missing')}</Banner>;
  if (query.isError && !query.data) {
    if (query.error instanceof ApiError && query.error.problem.slug === 'forbidden') return <Banner variant="error">{t('errors.forbidden')}</Banner>;
    if (query.error instanceof ApiError && query.error.problem.status === 404) return <Banner variant="info">{t('ai.judges.label.missing')}</Banner>;
    return <ListState state="error" onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return <ListState state="loading" />;
  const { pass, items } = query.data;
  const subjects = new Map(items.map((item) => [item.question_id, { input: item.input, output: item.output }]));
  const given = items.flatMap((item) => item.labels.map((one): LabelView => ({
    subject_kind: 'real_question', subject_id: item.question_id, criterion: one.criterion, verdict: one.verdict, labeled_by_user: null, labeled_at: null,
  })));
  return (
    <Queue
      key={pass.id}
      judgeName={pass.judge.name}
      criteria={pass.criteria}
      tasks={realLabelTasks(items, pass.criteria)}
      labels={given}
      subjects={subjects}
      label={label}
      emptyText={t('ai.judges.label.emptyPass')}
      back={{ to: `/ai/real-questions?pass=${pass.id}`, text: t('ai.judges.label.backToPass') }}
    />
  );
}

type QueueProps = {
  judgeName: string;
  criteria: JudgeCriterion[];
  tasks: LabelTask[];
  labels: LabelView[];
  /** What the owner reads about each task's subject: the snapshot of a run item or of a real question. */
  subjects: Map<string, { input: Record<string, unknown> | null; output: Record<string, unknown> | null }>;
  label: ReturnType<typeof useLabelMutation>;
  emptyText: string;
  back: { to: string; text: string };
};

function Queue({ judgeName, criteria, tasks, labels, subjects, label, emptyText, back }: QueueProps) {
  const t = useTranslations();
  const errorDetails = useErrorDetails();
  const [index, setIndex] = useState(() => firstOpen(tasks, labels));
  const task = tasks[index];
  const item = task ? subjects.get(task.subjectId) : undefined;
  const criterion = task ? criteria.find((candidate) => candidate.code === task.criterion) : undefined;
  const given = task ? labels.find((existing) => existing.subject_id === task.subjectId && existing.criterion === task.criterion && existing.verdict !== null) : undefined;
  const verdictName = (verdict: JudgeVerdict) => t(`ai.eval.detail.judge.verdicts.${verdict}`);

  function apply(verdict: JudgeVerdict) {
    if (!task || label.isPending) return;
    label.mutate({ subjectId: task.subjectId, criterion: task.criterion, verdict }, { onSuccess: () => setIndex((current) => Math.min(current + 1, tasks.length)) });
  }

  // Keys 1, 2, 3 label the task on screen, unless the person is typing somewhere or holds a modifier.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if ((event.target as Element | null)?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      const key = KEYS[event.key];
      if (!key) return;
      event.preventDefault();
      apply(key.verdict);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const heading = <h2 className="text-lg font-bold text-ink wrap-anywhere">{t('ai.judges.label.title', { judge: judgeName })}</h2>;
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {heading}
        <p className="text-ui text-muted">{emptyText}</p>
      </div>
    );
  }
  if (!task || !item || !criterion) {
    return (
      <div className="flex flex-col items-start gap-4">
        {heading}
        <p className="text-ui text-ink">{t('ai.judges.label.end', { total: outputCount(tasks) })}</p>
        <Link to={back.to} className={linkClass}>{back.text}</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {heading}
      <p className="text-ui text-muted">{t('ai.judges.label.hint')}</p>
      {label.isError && <Banner variant="error" code={errorDetails(label.error).code}>{errorDetails(label.error).message}</Banner>}
      <section className="flex min-w-0 flex-col gap-4 rounded-panel border-2 border-border p-4">
        <p aria-live="polite" className="text-ui font-semibold tabular-nums text-ink">{t('ai.judges.label.progress', { index: index + 1, total: tasks.length })}</p>
        {item.input && <Fields title={t('ai.judges.label.input')} fields={item.input} />}
        {item.output && <Fields title={t('ai.judges.label.output')} fields={item.output} />}
        <section aria-label={t('ai.judges.label.criterion')} className="flex min-w-0 flex-col gap-1">
          <code className="w-fit rounded-inner bg-canvas px-2 py-0.5 text-xs text-ink">{criterion.code}</code>
          <p className="text-ui text-ink wrap-anywhere">{criterion.question}</p>
        </section>
        {given?.verdict && <p className="text-ui font-medium text-ink">{t('ai.judges.label.labelled', { verdict: verdictName(given.verdict) })}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {(['1', '2', '3'] as const).map((key) => (
            <Button key={key} isDisabled={label.isPending} onPress={() => apply(KEYS[key]!.verdict)}>{t(`ai.judges.label.${KEYS[key]!.label}`)}</Button>
          ))}
          <Button variant="secondary" onPress={() => setIndex((current) => Math.min(current + 1, tasks.length))}>{t('ai.judges.label.skip')}</Button>
          <Button variant="secondary" isDisabled={index === 0} onPress={() => setIndex((current) => Math.max(current - 1, 0))}>{t('ai.judges.label.previous')}</Button>
        </div>
      </section>
    </div>
  );
}
