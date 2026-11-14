import type { ApiClient } from '../../api/client';
import type { UserRef } from '../../api/user-ref';
import type { GatewayOperation } from './ai-api';

export const BATCH_KINDS = ['test', 'eval', 'judge'] as const;
export const BATCH_STATUSES = ['queued', 'running', 'finished', 'failed', 'cancelled'] as const;
export type BatchKind = (typeof BATCH_KINDS)[number];
export type BatchStatus = (typeof BATCH_STATUSES)[number];
export type BatchFilters = { from: string; to: string; operation?: string; kind?: string; status?: string };
export type AiBatch = {
  id: string; kind: BatchKind; operation: GatewayOperation; status: BatchStatus;
  config_id: string | null; config_version: number | null; fingerprint: string | null; source_id: string | null; parent_id: string | null;
  model: string; provider: string; total: number; done: number; started_by_user: UserRef;
  created_at: string; started_at: string | null; finished_at: string | null;
  cost_usd: string | null; known_cost_usd: string; unknown_cost_calls: number; calls: number; retries: number;
  input_tokens: number; cached_input_tokens: number; output_tokens: number; reasoning_tokens: number;
};
export type BatchTestItem = {
  call_id: string; operation_id: string; attempt: number; outcome: string; held_out?: boolean;
  content: { response: unknown; expires_at: string } | null;
};
export type BatchDetailView = AiBatch & { snapshot: Record<string, unknown> | null; items: BatchTestItem[] };

export const batchKeys = {
  all: ['ai', 'batches'] as const,
  list: (filters: BatchFilters) => ['ai', 'batches', 'list', filters] as const,
  detail: (id: string) => ['ai', 'batches', 'detail', id] as const,
};
export const isBatchActive = (batch: Pick<AiBatch, 'status'>) => batch.status === 'queued' || batch.status === 'running';

export function listBatches(api: ApiClient, filters: BatchFilters, pageToken?: string) {
  const query = new URLSearchParams({ from: filters.from, to: filters.to, page_size: '20' });
  for (const field of ['operation', 'kind', 'status'] as const) if (filters[field]) query.set(field, filters[field]);
  if (pageToken) query.set('page_token', pageToken);
  return api.get<{ items: AiBatch[]; next_page_token: string | null }>(`/v1/admin/ai/batches?${query}`);
}
export const getBatch = (api: ApiClient, id: string) => api.get<BatchDetailView>(`/v1/admin/ai/batches/${encodeURIComponent(id)}`);
