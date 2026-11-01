import type { ApiClient } from '../../../api/client';
import type { UserRef } from '../../../api/user-ref';
import type { AiOperation, ConfigContent, ConfigsView, ConfigView, PublishBody, PublishCheck, SaveDraftBody, TestResult } from '../ai-api';

export type ConfigRevision = {
  id: string; config_id: string; version: number; content: ConfigContent; fingerprint: string;
  name: string | null; note: string | null; saved_by_user: UserRef; saved_at: string;
};
export type ConfigHistoryRevision = ConfigRevision & {
  operation: AiOperation;
  config_number: number;
  config_status: ConfigView['status'] | 'deleted';
  config_deleted_at: string | null;
};
type Page<T> = { items: T[]; next_page_token: string | null };
const base = (op: AiOperation) => `/v1/admin/ai/configs/${op}/drafts`;
const row = (op: AiOperation, id: string) => `${base(op)}/${encodeURIComponent(id)}`;
function pageQuery(token?: string) {
  const query = new URLSearchParams({ page_size: '20' });
  if (token) query.set('page_token', token);
  return query.toString();
}
export const workspaceKeys = {
  drafts: (op: AiOperation) => ['ai', 'workspace-drafts', op] as const,
  draft: (op: AiOperation, id: string) => ['ai', 'workspace-draft', op, id] as const,
  check: (op: AiOperation, id: string) => ['ai', 'workspace-check', op, id] as const,
  revisions: (op: AiOperation, id: string) => ['ai', 'workspace-revisions', op, id] as const,
  configRevisions: (op: AiOperation) => ['ai', 'workspace-config-revisions', op] as const,
};
export const listDrafts = (api: ApiClient, op: AiOperation, token?: string) => api.get<Page<ConfigView>>(`${base(op)}?${pageQuery(token)}`);
export const createWorkspaceDraft = (api: ApiClient, op: AiOperation, body: { from_config_id?: string; name?: string }) => api.post<ConfigView>(base(op), body, { idempotencyKey: crypto.randomUUID() });
export const getDraftById = (api: ApiClient, op: AiOperation, id: string) => api.get<ConfigView>(row(op, id));
export const saveDraftById = (api: ApiClient, op: AiOperation, id: string, body: SaveDraftBody) => api.put<ConfigView>(row(op, id), body, { idempotencyKey: crypto.randomUUID() });
export const deleteDraftById = (api: ApiClient, op: AiOperation, id: string) => api.delete<void>(row(op, id), { idempotencyKey: crypto.randomUUID() });
export const listDraftRevisions = (api: ApiClient, op: AiOperation, id: string, token?: string) => api.get<Page<ConfigRevision>>(`${row(op, id)}/revisions?${pageQuery(token)}`);
export const listConfigRevisions = (api: ApiClient, op: AiOperation, token?: string) => api.get<Page<ConfigHistoryRevision>>(`/v1/admin/ai/configs/${op}/revisions?${pageQuery(token)}`);
export const checkDraftById = (api: ApiClient, op: AiOperation, id: string) => api.get<PublishCheck>(`${row(op, id)}/publish-check`);
export const publishDraftById = (api: ApiClient, op: AiOperation, id: string, body: PublishBody) => api.post<ConfigsView>(`${row(op, id)}/publish`, body, { idempotencyKey: crypto.randomUUID() });
export const testDraftById = (api: ApiClient, op: AiOperation, id: string, body: { example_ids?: string[]; snapshot?: ConfigContent }) => api.post<TestResult>(`${row(op, id)}/test`, body);
export const contentOfDraft = (draft: ConfigView): ConfigContent => ({
  instructions: draft.instructions, examples: draft.examples, model_ref: draft.model?.id ?? null,
  effort: draft.effort, thinking: draft.thinking, max_output_tokens: draft.max_output_tokens,
});
export const workspacePath = (op: AiOperation, suffix = '') => `/ai/configs${suffix}?op=${op}`;
