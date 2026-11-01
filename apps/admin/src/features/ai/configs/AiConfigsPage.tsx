import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../../api/use-error-message';
import { userLabel } from '../../../api/user-ref';
import { useApi } from '../../../auth/session-context';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Dialog } from '../../../ui/Dialog';
import { ListState } from '../../../ui/ListState';
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
          <nav aria-label={t('ai.workspace.pages')} className="mb-6 flex gap-2 border-b-2 border-border pb-2">
            <NavLink end to={workspacePath(op)} className={navClass} aria-current={!history ? 'page' : undefined}>{t('ai.workspace.drafts')}</NavLink>
            <NavLink to={workspacePath(op, '/history')} className={navClass}>{t('ai.workspace.history')}</NavLink>
          </nav>
          {history ? <WorkspaceHistory op={op} /> : id
            ? models.isError && !models.data ? <ListState state="error" onRetry={() => void models.refetch()} />
              : !models.data ? <ListState state="loading" /> : <WorkspaceEditor key={`${op}:${id}`} op={op} id={id} view={configs.data} models={models.data.items} newestSet={newestSet} />
            : <WorkspaceDraftList op={op} />}
        </div>
        <LivePanel op={op} view={configs.data} />
      </div>}
  </div>;
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

export function WorkspaceDraftList({ op, revisions = false }: { op: AiOperation; revisions?: boolean }) {
  const t = useTranslations();
  const api = useApi();
  const client = useQueryClient();
  const navigate = useNavigate();
  const errorDetails = useErrorDetails();
  const format = useAiFormat();
  const [creating, setCreating] = useState<{ from?: string } | null>(null);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<ConfigView | null>(null);
  const [problem, setProblem] = useState<ErrorDetails | null>(null);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const list = useInfiniteQuery({ queryKey: workspaceKeys.drafts(op), queryFn: ({ pageParam }) => listDrafts(api, op, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: last => last.next_page_token ?? undefined });
  const create = useMutation({ mutationFn: () => createWorkspaceDraft(api, op, { ...(creating?.from ? { from_config_id: creating.from } : {}), ...(name.trim() ? { name: name.trim() } : {}) }),
    onSuccess: row => { setCreating(null); void client.invalidateQueries({ queryKey: workspaceKeys.drafts(op) }); void navigate(workspacePath(op, `/drafts/${row.id}`)); }, onError: e => setProblem(errorDetails(e)) });
  const remove = useMutation({ mutationFn: () => deleteDraftById(api, op, deleting!.id), onSuccess: () => { setDeleting(null); void client.invalidateQueries({ queryKey: workspaceKeys.drafts(op) }); }, onError: e => { setDeleting(null); setProblem(errorDetails(e)); } });
  const rows = list.data?.pages.flatMap(page => page.items) ?? [];
  function newDraft(from?: string) { setName(''); setProblem(null); setCreating({ from }); }
  return <section className="flex min-w-0 flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-ink">{t(revisions ? 'ai.workspace.revisions' : 'ai.workspace.drafts')}</h2>{!revisions && <Button onPress={() => newDraft()}>{t('ai.configs.draft.create')}</Button>}</div>
    {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
    {list.isError ? <ListState state="error" onRetry={() => void list.refetch()} /> : !list.data ? <ListState state="loading" /> : !rows.length ? <p className="py-8 text-ui text-muted">{t('ai.workspace.empty')}</p> : <ul className="divide-y-2 divide-border border-y-2 border-border">{rows.map(row => {
      const run = row.last_run;
      return <li key={row.id} className="flex min-w-0 flex-wrap items-start justify-between gap-4 py-5">
        <div className="min-w-0 flex-1"><Link className={`${navClass} px-0 wrap-anywhere`} to={workspacePath(op, `/drafts/${row.id}`)}>{row.name || t('ai.workspace.unnamed', { number: row.number })}</Link>
          <p className="text-xs text-muted wrap-anywhere">#{row.number} · {row.model?.model_id ?? t('ai.operations.row.noModel')} · {t('ai.workspace.version', { version: row.version })}</p>
          {row.note && <p className="text-xs text-muted wrap-anywhere">{row.note}</p>}
          {run && <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            <span>{t(`ai.costs.batches.kinds.${run.kind}`)} · {t(`ai.costs.batches.statuses.${run.status}`)} · {run.total}</span>
            <span>{run.model}</span>
            {run.fingerprint && <span className="wrap-anywhere">{run.fingerprint}</span>}
            <Link to={`/ai/costs?batch=${run.id}`}>{t('ai.workspace.batch')}</Link>
            {run.kind === 'eval' && run.source_id && <Link to={`/ai/eval/runs/${run.source_id}?op=${op}`}>{t('ai.configs.draft.runSet')}</Link>}
          </div>}
          {row.updated_at && <p className="text-xs text-muted">{format.dateTime(row.updated_at)}</p>}
        </div>
        {revisions ? <Button variant="ghost" onPress={() => setRevisionId(row.id)}>{t('ai.workspace.viewRevisions')}</Button> : <DraftMenu op={op} row={row} onClone={() => newDraft(row.id)} onDelete={() => setDeleting(row)} />}
      </li>;
    })}</ul>}
    {list.hasNextPage && <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>{t('common.loadMore')}</Button>}
    <Dialog isOpen={creating !== null} title={t('ai.configs.draft.create')} onOpenChange={open => !open && setCreating(null)} isDismissable={!create.isPending} actions={<><Button variant="secondary" onPress={() => setCreating(null)} isDisabled={create.isPending}>{t('common.cancel')}</Button><Button onPress={() => create.mutate()} isPending={create.isPending}>{t('ai.configs.draft.create')}</Button></>}>
      <TextField label={t('ai.workspace.name')} value={name} onChange={setName} maxLength={200} isDisabled={create.isPending} />
      {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
    </Dialog>
    <ConfirmDialog isOpen={deleting !== null} title={t('ai.configs.draft.deleteConfirm', { number: deleting?.number ?? 0 })} confirmLabel={t('ai.configs.draft.delete')} tone="danger" onConfirm={() => remove.mutate()} onCancel={() => setDeleting(null)} isPending={remove.isPending}>{t('ai.configs.draft.deleteBody')}</ConfirmDialog>
    {revisionId && <DraftRevisionDialog op={op} id={revisionId} onClose={() => setRevisionId(null)} />}
  </section>;
}

import { Menu, MenuItem, MenuTrigger, Popover, Button as AriaButton } from 'react-aria-components';
import { MoreHorizontal } from 'lucide-react';
import { DraftRevisionDialog } from './WorkspaceHistory';
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
