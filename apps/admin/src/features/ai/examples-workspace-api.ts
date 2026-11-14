import type { ApiClient } from '../../api/client';
import type { AiOperation } from './ai-api';

export type BulkDeleteExamplesResult = { deleted_ids: string[]; already_missing_ids: string[] };

/** One confirmed request keeps its key across retries, including an uncertain network response. */
export function bulkDeleteExamples(api: ApiClient, operation: AiOperation, ids: readonly string[], idempotencyKey: string) {
  return api.post<BulkDeleteExamplesResult>('/v1/admin/ai/eval/examples/bulk-delete', { operation, ids }, { idempotencyKey });
}
