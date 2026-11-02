import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { useApi } from '../../../auth/session-context';
import { useErrorDetails } from '../../../api/use-error-message';
import { userLabel } from '../../../api/user-ref';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { Dialog } from '../../../ui/Dialog';
import { ListState } from '../../../ui/ListState';
import { Tabs } from '../../../ui/Tabs';
import type { AiOperation } from '../ai-api';
import { PromptHistory, RevisionContent } from '../PromptHistory';
import { useAiFormat } from '../useAiFormat';
import { ConfigHistory } from './ConfigHistory';
import { createWorkspaceDraft, listConfigRevisions, listDraftRevisions, workspaceKeys, workspacePath, type ConfigRevision } from './workspace-api';

export function WorkspaceHistory({ op }: { op: AiOperation }) {
  const t = useTranslations();
  const api = useApi();
  const client = useQueryClient();
  const navigate = useNavigate();
  const errorDetails = useErrorDetails();
  const [tab, setTab] = useState('publish');
  const create = useMutation({ mutationFn: (from: string) => createWorkspaceDraft(api, op, { from_config_id: from }), onSuccess: draft => {
    void client.invalidateQueries({ queryKey: workspaceKeys.drafts(op) }); void navigate(workspacePath(op, `/drafts/${draft.id}`));
  } });
  return <div className="flex min-w-0 flex-col gap-4">
    {create.error && <Banner variant="error">{errorDetails(create.error).message}</Banner>}
    <Tabs label={t('ai.workspace.historyTabs')} selected={tab} onSelect={setTab} items={[{ id: 'publish', label: t('ai.configs.history.title') }, { id: 'prompts', label: t('ai.workspace.promptHistory') }]}>
      {selected => selected === 'publish' ? <ConfigHistory op={op} hasDraft={false} onCreateFrom={id => create.mutate(id)} creating={create.isPending} />
        : <div className="flex min-w-0 flex-col gap-6">
          <ConfigRevisions op={op} />
          <PromptHistory op={op} title={t('ai.configs.oldPrompts')} note={t('ai.configs.oldPromptsNote')} />
        </div>}
    </Tabs>
  </div>;
}

function ConfigRevisions({ op }: { op: AiOperation }) {
  const t = useTranslations();
  const api = useApi();
  const list = useInfiniteQuery({
    queryKey: workspaceKeys.configRevisions(op),
    queryFn: ({ pageParam }) => listConfigRevisions(api, op, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap(page => page.items) ?? [];
  return <section aria-labelledby="workspace-config-revisions" className="flex min-w-0 flex-col gap-4">
    <h2 id="workspace-config-revisions" className="text-lg font-bold text-ink">{t('ai.workspace.revisions')}</h2>
    {list.isError ? <ListState state="error" onRetry={() => void list.refetch()} /> : !list.data ? <ListState state="loading" />
      : !rows.length ? <p className="text-ui text-muted">{t('ai.workspace.emptyRevisions')}</p>
      : rows.map(row => <details key={row.id} className="min-w-0 rounded-inner border-2 border-border p-3">
        <summary className="cursor-pointer text-ui font-semibold text-primary wrap-anywhere">
          #{row.config_number} · {row.name ?? t('ai.workspace.unnamed', { number: row.config_number })} · {t('ai.workspace.version', { version: row.version })}
        </summary>
        <p className="mt-2 text-xs text-muted">{row.operation} · {row.config_status}</p>
        <SavedRevision row={row} />
      </details>)}
    {list.hasNextPage && <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>{t('common.loadMore')}</Button>}
  </section>;
}

function SavedRevision({ row }: { row: ConfigRevision }) {
  const t = useTranslations();
  const format = useAiFormat();
  const fields = [
    [t('ai.operations.row.model'), row.content.model_ref ?? '—'],
    [t('ai.operations.row.effort'), row.content.effort ?? t('ai.operations.row.effortDefault')],
    [t('ai.operations.row.thinking'), t(row.content.thinking === 'off' ? 'ai.operations.row.thinkingOff' : 'ai.operations.row.thinkingDefault')],
    [t('ai.operations.row.maxTokens'), row.content.max_output_tokens === null ? '—' : String(row.content.max_output_tokens)],
  ];
  return <div className="flex min-w-0 flex-col gap-3 pt-3">
    <p className="text-xs text-muted wrap-anywhere">{format.dateTime(row.saved_at)} · {userLabel(row.saved_by_user, t)}</p>
    {row.note && <p className="text-ui wrap-anywhere">{row.note}</p>}
    <dl className="grid min-w-0 grid-cols-2 gap-2 text-ui">{fields.map(([label, value]) => <div key={label} className="col-span-2 grid min-w-0 grid-cols-2 gap-3">
      <dt className="text-muted">{label}</dt><dd className="wrap-anywhere">{value}</dd>
    </div>)}</dl>
    <p className="font-mono text-xs wrap-anywhere">{row.fingerprint}</p>
    <RevisionContent instructions={row.content.instructions} examples={row.content.examples} />
  </div>;
}

export function DraftRevisionDialog({ op, id, onClose }: { op: AiOperation; id: string; onClose: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const list = useInfiniteQuery({ queryKey: workspaceKeys.revisions(op, id), queryFn: ({ pageParam }) => listDraftRevisions(api, op, id, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: last => last.next_page_token ?? undefined });
  const rows = list.data?.pages.flatMap(page => page.items) ?? [];
  return <Dialog isOpen title={t('ai.workspace.revisions')} size="lg" onOpenChange={open => !open && onClose()} actions={<Button variant="secondary" onPress={onClose}>{t('common.close')}</Button>}>
    {list.isError ? <ListState state="error" onRetry={() => void list.refetch()} /> : !list.data ? <ListState state="loading" /> : rows.length === 0 ? <p>{t('ai.workspace.emptyRevisions')}</p> : <div className="flex min-w-0 flex-col gap-5">{rows.map(row => <details key={row.id} className="min-w-0 border-b-2 border-border pb-3">
      <summary className="cursor-pointer text-ui font-semibold text-primary">{t('ai.workspace.revisionTitle', { version: row.version })} · {row.name}</summary>
      <SavedRevision row={row} />
    </details>)}</div>}
    {list.hasNextPage && <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>{t('common.loadMore')}</Button>}
  </Dialog>;
}
