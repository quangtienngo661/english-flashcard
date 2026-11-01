import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslations } from 'use-intl';
import { useApi } from '../../../auth/session-context';
import { ApiError } from '../../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../../api/use-error-message';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { Checkbox } from '../../../ui/Checkbox';
import { Dialog } from '../../../ui/Dialog';
import { ListState } from '../../../ui/ListState';
import { Select } from '../../../ui/Select';
import { TextField } from '../../../ui/TextField';
import { aiKeys, getRun, getTestQuota, isDevExample, listExamples, type AiModel, type AiOperation, type ConfigContent, type ConfigView, type EvalSet, type TestResult } from '../ai-api';
import { StartRunFailure, useStartRun } from '../EvalRunPanel';
import { useAiFormat } from '../useAiFormat';
import { RevisionContent } from '../PromptHistory';
import { toDraftBody, type ConfigForm } from './config-form';
import { testDraftById } from './workspace-api';

type Props = { models: AiModel[]; op: AiOperation; draft: ConfigView; form: ConfigForm; newestSet: EvalSet | null; isDisabled?: boolean };
const retryAt = (seconds: number) => new Date(Date.now() + seconds * 1000);

type QuickRun = { result: TestResult; content: ConfigContent; model: string };
function snapshot(form: ConfigForm, version: number): ConfigContent | null {
  const built = toDraftBody(form, version);
  if (!built.ok) return null;
  const { instructions, examples, model_ref, effort, thinking, max_output_tokens } = built.body;
  return { instructions, examples, model_ref, effort, thinking, max_output_tokens };
}
/** Display ledger decimals without rounding through floating point or treating unknown prices as zero. */
export function quickRunCost(result: TestResult): string | null {
  if (result.items.some(item => item.cost_usd === null)) return null;
  const total = result.items.reduce((sum, item) => {
    const [whole, decimals = ''] = item.cost_usd!.split('.');
    return sum + BigInt(whole) * 100_000_000n + BigInt(decimals.padEnd(8, '0').slice(0, 8));
  }, 0n);
  return `${total / 100_000_000n}.${String(total % 100_000_000n).padStart(8, '0')}`;
}
export function WorkspaceRunner({ op, draft, form, models, newestSet, isDisabled }: Props) {
  const t = useTranslations();
  const api = useApi();
  const client = useQueryClient();
  const errorDetails = useErrorDetails();
  const format = useAiFormat();
  const examples = useQuery({ queryKey: aiKeys.examples(op), queryFn: () => listExamples(api, op) });
  const quota = useQuery({ queryKey: aiKeys.testQuota(), queryFn: () => getTestQuota(api) });
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quick, setQuick] = useState<QuickRun | null>(null);
  const [problem, setProblem] = useState<ErrorDetails | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [target, setTarget] = useState('temporary');
  const [evalId, setEvalId] = useState<string | null>(null);
  const [evalSnapshot, setEvalSnapshot] = useState<ConfigContent | null>(null);
  const content = snapshot(form, draft.version);
  const action = useStartRun(op, JSON.stringify({ target, content, version: draft.version, set: newestSet?.id }), id => { setEvalId(id); });
  const run = useQuery({ queryKey: aiKeys.run(evalId ?? ''), queryFn: () => getRun(api, evalId!), enabled: evalId !== null, refetchInterval: query => query.state.data && ['finished', 'failed'].includes(query.state.data.status) ? false : 2000 });
  const dev = examples.data?.items.filter(isDevExample) ?? [];
  const chosenIds = dev.filter(row => selected.has(row.id)).map(row => row.id);
  const visible = dev.filter(row => (level === 'all' || row.input.level === level) && (!search.trim() || Object.values(row.input).filter(value => typeof value === 'string').join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));

  async function test() {
    if (busy.current || !content) return;
    busy.current = true; setPending(true); setProblem(null);
    const captured = structuredClone(content);
    const model = models.find(row => row.id === captured.model_ref)?.model_id ?? (captured.model_ref === draft.model?.id ? draft.model.model_id : captured.model_ref ?? t('ai.operations.row.noModel'));
    try {
      const result = await testDraftById(api, op, draft.id, { ...(chosenIds.length ? { example_ids: chosenIds } : {}), snapshot: captured });
      setQuick({ result, content: captured, model });
    } catch (e) {
      if (e instanceof ApiError && e.problem.slug === 'model-not-set') setProblem({ message: t('ai.configs.draft.noModelToTest'), code: null });
      else if (e instanceof ApiError && e.problem.status === 429) {
        const at = e.retryAfterSeconds !== null ? retryAt(e.retryAfterSeconds) : quota.data ? new Date(quota.data.resets_at) : null;
        setProblem(at ? { message: t('ai.prompts.test.rateLimited', { limit: quota.data?.limit ?? 20, time: format.time(at) }), code: null } : errorDetails(e));
      } else if (e instanceof ApiError && e.problem.slug === 'validation-failed' && e.problem.violations?.includes('examples: at least one example is needed')) {
        setProblem({ message: t('ai.prompts.test.needExample'), code: null });
      } else setProblem(errorDetails(e));
    } finally {
      busy.current = false; setPending(false); void client.invalidateQueries({ queryKey: aiKeys.testQuota() });
    }
  }

  return <div className="flex min-w-0 flex-col gap-5">
    <section id="test" aria-labelledby="workspace-test" className="flex min-w-0 flex-col gap-4 border-t-2 border-border pt-5">
      <h3 id="workspace-test" className="text-lg font-bold text-ink">{t('ai.prompts.test.title')}</h3>
      <p className="text-ui text-muted">{t('ai.workspace.temporaryNote')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onPress={() => setPickerOpen(true)}>{t('ai.workspace.pickDev')}</Button>
        <p className="text-xs text-muted">{t('ai.workspace.chosen', { count: chosenIds.length })}</p>
        {chosenIds.length > 0 && <Button variant="ghost" onPress={() => setSelected(new Set())}>{t('ai.workspace.clearSelection')}</Button>}
      </div>
      <Dialog isOpen={pickerOpen} onOpenChange={setPickerOpen} title={t('ai.prompts.test.pick')} size="lg" actions={<Button variant="secondary" onPress={() => setPickerOpen(false)}>{t('common.close')}</Button>}>
        <div className="grid min-w-0 gap-3 shell:grid-cols-2">
          <TextField label={t('ai.workspace.search')} value={search} onChange={setSearch} />
          <Select label={t('ai.workspace.level')} value={level} onChange={setLevel} items={[{ id: 'all', label: t('ai.workspace.allLevels') }, ...['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(id => ({ id, label: id }))]} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-ui text-muted">{t('ai.workspace.chosen', { count: chosenIds.length })}</p>
          {chosenIds.length > 0 && <Button variant="ghost" onPress={() => setSelected(new Set())}>{t('ai.workspace.clearSelection')}</Button>}
        </div>
        {examples.isError ? <ListState state="error" onRetry={() => void examples.refetch()} /> : !examples.data ? <ListState state="loading" /> : (
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto overscroll-contain rounded-inner border-2 border-border p-3">
            {visible.length ? visible.map(row => (
              <Checkbox key={row.id} isSelected={selected.has(row.id)} isDisabled={!selected.has(row.id) && chosenIds.length >= 5} onChange={on => setSelected(previous => {
                const next = new Set(previous);
                if (on && next.size < 5) next.add(row.id);
                else if (!on) next.delete(row.id);
                return next;
              })}>
                <span className="text-ui wrap-anywhere">{Object.values(row.input).filter(value => typeof value === 'string' && value !== '').slice(0, 4).join(' · ')}</span>
              </Checkbox>
            )) : <p className="text-ui text-muted">{t('ai.workspace.noMatches')}</p>}
          </div>
        )}
      </Dialog>
      {!chosenIds.length && <p className="text-xs text-muted">{t('ai.workspace.noSelection')}</p>}
      <Button className="self-start" variant="secondary" onPress={() => void test()} isPending={pending} isDisabled={isDisabled || !content}>{t('ai.prompts.test.run')}</Button>
      {!content && <p role="alert" className="text-ui text-danger">{t('ai.prompts.errors.outputJson')}</p>}
      {quota.data && <p className="text-xs text-muted">{t('ai.prompts.test.quota', { remaining: quota.data.remaining, limit: quota.data.limit })}</p>}
      {quota.isError && <p className="text-ui text-danger">{t('ai.prompts.test.quotaFailed')}</p>}
      {examples.isError && <p className="text-ui text-danger">{t('ai.prompts.test.examplesFailed')}</p>}
      {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
      {quick && <section aria-label={t('ai.workspace.snapshot')} className="flex min-w-0 flex-col gap-3 rounded-inner bg-canvas p-3">
        <h4 className="font-semibold text-ink">{t('ai.workspace.snapshot')} · {quick.model}</h4>
        <p className="text-xs text-muted">{t('ai.workspace.runSnapshot')}</p>
        <p className="font-mono text-xs wrap-anywhere">{quick.result.fingerprint}</p>
        <p className="text-ui">{t('ai.workspace.cost')}: {quickRunCost(quick.result) === null ? t('ai.workspace.unknownCost') : `$${quickRunCost(quick.result)}`}</p>
        {quick.result.batch_id && <Link className="text-ui text-primary" to={`/ai/costs?batch=${quick.result.batch_id}`}>{t('ai.workspace.batch')}</Link>}
        <details><summary className="cursor-pointer text-ui text-primary">{t('ai.workspace.snapshot')}</summary><p className="text-xs">{quick.content.model_ref} · {quick.content.effort ?? '—'} · {quick.content.thinking ?? '—'} · {quick.content.max_output_tokens ?? '—'}</p><RevisionContent instructions={quick.content.instructions} examples={quick.content.examples} /></details>
        {quick.result.items.map((item, i) => <div key={i} role="group" aria-label={t('ai.prompts.test.sample', { n: i + 1 })} className="min-w-0 rounded-inner border-2 border-border p-3"><p className="text-ui font-semibold">{t('ai.prompts.test.sample', { n: i + 1 })}</p><p className="text-ui"><span>{t(`ai.prompts.test.statuses.${item.status}`)}</span> · {item.cost_usd === null ? t('ai.workspace.unknownCost') : `$${item.cost_usd}`}</p>{item.reason && <p className="text-ui text-danger">{item.reason}</p>}<pre className="whitespace-pre-wrap font-mono text-xs wrap-anywhere">{JSON.stringify(item.input, null, 2)}</pre><pre className="whitespace-pre-wrap font-mono text-xs wrap-anywhere">{item.output ? JSON.stringify(item.output, null, 2) : item.raw_output ?? item.reason ?? '—'}</pre></div>)}
      </section>}
    </section>
    <section id="eval" aria-labelledby="workspace-eval" className="flex min-w-0 flex-col gap-3 border-t-2 border-border pt-5">
      <h3 id="workspace-eval" className="text-lg font-bold text-ink">{t('ai.configs.draft.runSet')}</h3>
      <Select label={t('ai.workspace.target')} value={target} onChange={setTarget} items={[{ id: 'temporary', label: t('ai.workspace.temporaryTarget') }, { id: 'draft', label: t('ai.workspace.savedTarget') }, { id: 'live', label: t('ai.workspace.liveTarget') }]} />
      {newestSet && <p className="text-xs text-muted">{t('ai.configs.draft.runSetNote', { version: newestSet.version })}</p>}
      <Button variant="secondary" className="self-start" isPending={action.pending} isDisabled={isDisabled || !newestSet || action.waitSeconds > 0 || (target === 'temporary' && !content)} onPress={() => {
        if (!newestSet) return;
        const captured = content ? structuredClone(content) : null;
        setEvalSnapshot(target === 'temporary' ? captured : null);
        action.start({ set_id: newestSet.id, target: target === 'temporary' && captured ? { kind: 'temporary', draft_id: draft.id, content: captured } : target === 'draft' ? { kind: 'draft', draft_id: draft.id } : { kind: 'live' } });
      }}>{t('ai.configs.draft.runSet')}</Button>
      <StartRunFailure action={action} />
      {evalId && <div className="flex min-w-0 flex-col gap-2 rounded-inner bg-canvas p-3">
        <Link className="text-ui text-primary" to={`/ai/eval/runs/${evalId}?op=${op}`}>{t('ai.configs.draft.runSet')} · {evalId}</Link>
        {run.data && <><p className="text-ui">{run.data.model} · {t(`ai.eval.status.${run.data.status}`)} · {run.data.done}/{run.data.total}</p><p className="font-mono text-xs wrap-anywhere">{run.data.fingerprint}</p><p className="text-ui">{t('ai.workspace.cost')}: {run.data.cost_usd === null ? t('ai.workspace.unknownCost') : `$${run.data.cost_usd}`}</p>{run.data.batch_id && <Link className="text-ui text-primary" to={`/ai/costs?batch=${run.data.batch_id}`}>{t('ai.workspace.batch')}</Link>}</>}
        {(run.data?.snapshot ?? evalSnapshot) && <details><summary className="cursor-pointer text-primary">{t('ai.workspace.snapshot')}</summary><RevisionContent instructions={(run.data?.snapshot ?? evalSnapshot)!.instructions} examples={(run.data?.snapshot ?? evalSnapshot)!.examples} /></details>}
        {run.isError && <ListState state="error" onRetry={() => void run.refetch()} />}
      </div>}
    </section>
  </div>;
}
