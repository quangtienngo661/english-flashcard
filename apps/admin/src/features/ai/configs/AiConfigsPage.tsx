import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../../api/use-error-message';
import { userLabel } from '../../../api/user-ref';
import { useApi } from '../../../auth/session-context';
import { Badge } from '../../../ui/Badge';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Dialog } from '../../../ui/Dialog';
import { ListState } from '../../../ui/ListState';
import { PageTabs } from '../../../ui/PageTabs';
import { Select } from '../../../ui/Select';
import { TextField } from '../../../ui/TextField';
import { useMediaQuery } from '../../../ui/use-media-query';
import { AI_OPERATION_ORDER, aiKeys, getConfigs, listModels, listSets, type AiModel, type AiOperation, type ConfigsView, type ConfigView, type EvalSet } from '../ai-api';
import { RevisionContent } from '../PromptHistory';
import { useAiFormat } from '../useAiFormat';
import { DraftEditor } from './DraftEditor';
import { RollbackControl } from './PublishPanel';
import { WorkspaceHistory } from './WorkspaceHistory';
import { createWorkspaceDraft, deleteDraftById, getDraftById, listDrafts, workspaceKeys, workspacePath } from './workspace-api';
import './workspace.css';

const navClass = 'inline-flex min-h-control items-center rounded-control px-3 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary';
export function AiConfigsPage() {
  const t = useTranslations();
  const api = useApi();
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const raw = new URLSearchParams(search).get('op');
  const op: AiOperation = AI_OPERATION_ORDER.find(value => value === raw) ?? 'generate_cloze';
  const configs = useQuery({ queryKey: aiKeys.configs(op), queryFn: () => getConfigs(api, op) });
  const models = useQuery({ queryKey: aiKeys.models(), queryFn: () => listModels(api) });
  const sets = useQuery({ queryKey: aiKeys.sets(op), queryFn: () => listSets(api, op) });
  const newestSet = (sets.data?.items ?? []).reduce<EvalSet | null>((best, set) => best === null || set.version > best.version ? set : best, null);
  const history = pathname.endsWith('/history');
  // Same key as the list below, so the tab count and the list share one request; a further page makes the count "20+".
  // History never reads drafts (it shows the count only if the list was read before).
  const drafts = useInfiniteQuery({ queryKey: workspaceKeys.drafts(op), queryFn: ({ pageParam }) => listDrafts(api, op, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: last => last.next_page_token ?? undefined, enabled: !history });
  const draftCount = drafts.data ? `${drafts.data.pages.reduce((sum, page) => sum + page.items.length, 0)}${drafts.hasNextPage ? '+' : ''}` : undefined;
  const [creating, setCreating] = useState<{ from?: string } | null>(null);
  return <div className="flex min-w-0 flex-col gap-6">
    <p className="text-ui text-muted">{t('ai.workspace.intro')}</p>
    <div className="w-full max-w-sm"><Select label={t('ai.configs.operation')} value={op}
      items={AI_OPERATION_ORDER.map(value => ({ id: value, label: `${t(`ai.operations.names.${value}`)} (${value})` }))}
      onChange={value => void navigate(workspacePath(value as AiOperation, history ? '/history' : ''))} /></div>
    {configs.isError && !configs.data ? configs.error instanceof ApiError && configs.error.problem.slug === 'forbidden'
      ? <Banner variant="error">{t('errors.forbidden')}</Banner> : <ListState state="error" onRetry={() => void configs.refetch()} />
      : !configs.data ? <ListState state="loading" />
      : <div key={op} className="config-workspace">
        <div className="min-w-0">
          <div className="mb-5">
            <PageTabs label={t('ai.workspace.pages')} items={[
              { id: 'drafts', to: workspacePath(op), label: t('ai.workspace.drafts'), current: !history, count: draftCount },
              { id: 'history', to: workspacePath(op, '/history'), label: t('ai.workspace.history'), current: history },
            ]} aside={!history && !id && <Button onPress={() => setCreating({})}>{t('ai.configs.draft.create')}</Button>} />
          </div>
          {history ? <WorkspaceHistory op={op} /> : id
            ? models.isError && !models.data ? <ListState state="error" onRetry={() => void models.refetch()} />
              : !models.data ? <ListState state="loading" /> : <WorkspaceEditor key={`${op}:${id}`} op={op} id={id} view={configs.data} models={models.data.items} newestSet={newestSet} />
            : <WorkspaceDraftList op={op} onClone={from => setCreating({ from })} />}
        </div>
        <LivePanel op={op} view={configs.data} />
      </div>}
    {creating && <CreateDraftDialog key={`${op}:${creating.from ?? ''}`} op={op} from={creating.from} onClose={() => setCreating(null)} />}
  </div>;
}

/** [Tạo nháp] (from the tab row, empty) and [Nhân bản] (a copy of a draft): name it, create it, open it. */
function CreateDraftDialog({ op, from, onClose }: { op: AiOperation; from?: string; onClose: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const client = useQueryClient();
  const navigate = useNavigate();
  const errorDetails = useErrorDetails();
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<ErrorDetails | null>(null);
  const create = useMutation({ mutationFn: () => createWorkspaceDraft(api, op, { ...(from ? { from_config_id: from } : {}), ...(name.trim() ? { name: name.trim() } : {}) }),
    onMutate: () => setProblem(null),
    onSuccess: row => { onClose(); void client.invalidateQueries({ queryKey: workspaceKeys.drafts(op) }); void navigate(workspacePath(op, `/drafts/${row.id}`)); }, onError: e => setProblem(errorDetails(e)) });
  return <Dialog isOpen title={t('ai.configs.draft.create')} onOpenChange={open => !open && onClose()} isDismissable={!create.isPending} actions={<><Button variant="secondary" onPress={onClose} isDisabled={create.isPending}>{t('common.cancel')}</Button><Button onPress={() => create.mutate()} isPending={create.isPending}>{t('ai.configs.draft.create')}</Button></>}>
    <TextField label={t('ai.workspace.name')} value={name} onChange={setName} maxLength={200} isDisabled={create.isPending} />
    {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
  </Dialog>;
}

function LivePanel({ op, view }: { op: AiOperation; view: ConfigsView }) {
  const t = useTranslations();
  const format = useAiFormat();
  const desktop = useMediaQuery('(min-width: 921px)', true);
  const [expanded, setExpanded] = useState(false);
  const [problem, setProblem] = useState<ErrorDetails | null>(null);
  const live = view.live;
  return <aside className="config-live min-w-0 self-start overflow-hidden rounded-panel border-2 border-border bg-canvas" aria-label={t('ai.workspace.live')}>
    <div className="flex min-w-0 flex-col gap-2 bg-primary-soft p-4">
      <h2 className="text-lg font-bold text-ink">{t('ai.configs.live.title', { number: live.number })}</h2>
      <p className="font-semibold text-ink wrap-anywhere">{live.model?.model_id ?? t('ai.operations.row.noModel')}</p>
      {live.name && <p className="text-ui text-muted wrap-anywhere">{live.name}</p>}
      {!desktop && <Button variant="ghost" aria-expanded={expanded} aria-controls="workspace-live-content" onPress={() => setExpanded(value => !value)}>{t(expanded ? 'ai.workspace.collapseLive' : 'ai.workspace.expandLive')}</Button>}
    </div>
    <div id="workspace-live-content" hidden={!desktop && !expanded} className="flex min-w-0 flex-col gap-4 p-4">
      {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
      {live.model ? <dl className="grid min-w-0 grid-cols-2 gap-3 text-ui">
        <dt className="text-muted">{t('ai.models.form.provider')}</dt><dd className="text-right wrap-anywhere">{t(`ai.providers.${live.model.provider}`)}</dd>
        <dt className="text-muted">{t('ai.operations.row.effort')}</dt><dd className="text-right wrap-anywhere">{live.effort ?? t('ai.operations.row.effortDefault')}</dd>
        <dt className="text-muted">{t('ai.operations.row.thinking')}</dt><dd className="text-right wrap-anywhere">{t(live.thinking === 'off' ? 'ai.operations.row.thinkingOff' : 'ai.operations.row.thinkingDefault')}</dd>
        <dt className="text-muted">{t('ai.operations.row.maxTokens')}</dt><dd className="text-right">{live.max_output_tokens ?? '—'}</dd>
      </dl> : <Banner variant="info">{t('ai.configs.live.noModel')}</Banner>}
      {live.published_at && live.published_by_user && <p className="text-xs text-muted wrap-anywhere">{t('ai.configs.live.publishedBy', { at: format.dateTime(live.published_at), by: userLabel(live.published_by_user, t) })}</p>}
      <details><summary className="cursor-pointer text-ui text-primary">{t('ai.configs.live.content')}</summary><RevisionContent instructions={live.instructions} examples={live.examples} /></details>
      <p className="border-t-2 border-border pt-3 text-xs text-muted">{t('ai.workspace.liveNote')}</p>
      <RollbackControl op={op} view={view} onProblem={setProblem} />
    </div>
  </aside>;
}

const RUN_TONE = { queued: 'primary', running: 'primary', finished: 'success', failed: 'danger', cancelled: 'neutral' } as const;
/** Draft · Model · Lần chạy gần nhất · Cập nhật · menu; below 40rem of its own width every row becomes a card. */
// raw-ok: one column template shared by the header and every row, so the columns line up.
const draftGrid = 'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 @list:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.8fr)_8.5rem_2.5rem]';

export function WorkspaceDraftList({ op, onClone }: { op: AiOperation; onClone: (from: string) => void }) {
  const t = useTranslations();
  const api = useApi();
  const client = useQueryClient();
  const errorDetails = useErrorDetails();
  const format = useAiFormat();
  const [deleting, setDeleting] = useState<ConfigView | null>(null);
  const [problem, setProblem] = useState<ErrorDetails | null>(null);
  const list = useInfiniteQuery({ queryKey: workspaceKeys.drafts(op), queryFn: ({ pageParam }) => listDrafts(api, op, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: last => last.next_page_token ?? undefined });
  const remove = useMutation({ mutationFn: () => deleteDraftById(api, op, deleting!.id), onSuccess: () => { setDeleting(null); void client.invalidateQueries({ queryKey: workspaceKeys.drafts(op) }); }, onError: e => { setDeleting(null); setProblem(errorDetails(e)); } });
  const rows = list.data?.pages.flatMap(page => page.items) ?? [];
  return <section className="flex min-w-0 flex-col gap-4">
    {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
    {list.isError ? <ListState state="error" onRetry={() => void list.refetch()} /> : !list.data ? <ListState state="loading" /> : !rows.length ? <p className="py-8 text-ui text-muted">{t('ai.workspace.empty')}</p>
      : <div className="@container">
        <div role="table" aria-label={t('ai.workspace.drafts')} className="overflow-hidden rounded-panel border-2 border-border">
          <div role="row" className={`${draftGrid} hidden min-h-10 border-b-2 border-border bg-canvas text-xs font-semibold text-muted @list:grid`}>
            <span role="columnheader">{t('ai.workspace.cols.draft')}</span><span role="columnheader">{t('ai.workspace.cols.model')}</span>
            <span role="columnheader">{t('ai.workspace.cols.lastRun')}</span><span role="columnheader">{t('ai.workspace.cols.updated')}</span><span role="columnheader" />
          </div>
          <div role="rowgroup" className="divide-y-2 divide-border">{rows.map(row => {
            const run = row.last_run;
            return <div role="row" key={row.id} className={`${draftGrid} py-3`}>
              <div role="cell" className="flex min-w-0 flex-col gap-0.5">
                <Link className="w-fit rounded-sm font-semibold text-primary outline-none wrap-anywhere hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-primary" to={workspacePath(op, `/drafts/${row.id}`)}>{row.name || t('ai.workspace.unnamed', { number: row.number })}</Link>
                <span className="text-xs text-muted wrap-anywhere">#{row.number} · {t('ai.workspace.version', { version: row.version })}{row.note ? ` · ${row.note}` : ''}</span>
              </div>
              <span role="cell" className="hidden text-ui wrap-anywhere @list:block">{row.model?.model_id ?? t('ai.operations.row.noModel')}</span>
              <div role="cell" className="col-span-2 flex min-w-0 flex-col gap-1 text-xs @list:col-span-1">
                {run ? <>
                  <span className="flex flex-wrap items-center gap-2"><Badge tone={RUN_TONE[run.status as keyof typeof RUN_TONE] ?? 'neutral'}>{t(`ai.costs.batches.statuses.${run.status}`)}</Badge>
                    <span className="text-ink">{t(`ai.costs.batches.kinds.${run.kind}`)} · {run.total}</span><span className="text-muted wrap-anywhere">{run.model}</span></span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {run.fingerprint && <span title={run.fingerprint} className="font-mono text-muted">{run.fingerprint.slice(0, 8)}</span>}
                    <Link className="text-primary hover:underline" to={`/ai/costs?batch=${run.id}`}>{t('ai.workspace.batch')}</Link>
                    {run.kind === 'eval' && run.source_id && <Link className="text-primary hover:underline" to={`/ai/eval/runs/${run.source_id}?op=${op}`}>{t('ai.configs.draft.runSet')}</Link>}
                  </span>
                </> : <Badge>{t('ai.workspace.notRun')}</Badge>}
              </div>
              <span role="cell" className="hidden whitespace-nowrap text-xs text-muted tabular-nums @list:block">{row.updated_at ? format.dateTime(row.updated_at) : '—'}</span>
              <div role="cell" className="col-start-2 row-start-1 justify-self-end @list:col-start-auto @list:row-start-auto"><DraftMenu op={op} row={row} onClone={() => onClone(row.id)} onDelete={() => setDeleting(row)} /></div>
            </div>;
          })}</div>
        </div>
      </div>}
    {list.hasNextPage && <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>{t('common.loadMore')}</Button>}
    <ConfirmDialog isOpen={deleting !== null} title={t('ai.configs.draft.deleteConfirm', { number: deleting?.number ?? 0 })} confirmLabel={t('ai.configs.draft.delete')} tone="danger" onConfirm={() => remove.mutate()} onCancel={() => setDeleting(null)} isPending={remove.isPending}>{t('ai.configs.draft.deleteBody')}</ConfirmDialog>
  </section>;
}

import { Menu, MenuItem, MenuTrigger, Popover, Button as AriaButton } from 'react-aria-components';
import { MoreHorizontal } from 'lucide-react';
function DraftMenu({ op, row, onClone, onDelete }: { op: AiOperation; row: ConfigView; onClone: () => void; onDelete: () => void }) {
  const t = useTranslations();
  const navigate = useNavigate();
  return <MenuTrigger><AriaButton aria-label={t('ai.workspace.actions', { number: row.number })} className={navClass}><MoreHorizontal aria-hidden className="size-5" /></AriaButton>
    <Popover placement="bottom end" className="z-30 min-w-44 rounded-inner border-2 border-border bg-surface p-1 shadow-menu"><Menu aria-label={t('ai.workspace.actions', { number: row.number })} className="outline-none" onAction={key => {
      if (key === 'clone') onClone(); else if (key === 'delete') onDelete(); else void navigate(`${workspacePath(op, `/drafts/${row.id}`)}${key === 'edit' ? '' : `#${key}`}`);
    }}>{['edit', 'test', 'eval', 'clone', 'publish', 'delete'].map(action => <MenuItem key={action} id={action} className="cursor-pointer rounded-sm px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft">{t(`ai.workspace.menu.${action}`)}</MenuItem>)}</Menu></Popover>
  </MenuTrigger>;
}

function WorkspaceEditor({ op, id, view, models, newestSet }: { op: AiOperation; id: string; view: ConfigsView; models: AiModel[]; newestSet: EvalSet | null }) {
  const api = useApi();
  const draft = useQuery({ queryKey: workspaceKeys.draft(op, id), queryFn: () => getDraftById(api, op, id) });
  return draft.isError ? <ListState state="error" onRetry={() => void draft.refetch()} /> : !draft.data ? <ListState state="loading" /> :
    <DraftEditor op={op} initial={draft.data} inputFields={view.input_fields} guard={view.guard} models={models} newestSet={newestSet} />;
}
