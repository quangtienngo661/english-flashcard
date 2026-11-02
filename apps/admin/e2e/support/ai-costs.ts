import type { AiBatch, BatchDetailView } from '../../src/features/ai/batches-api';
import type { MockHandler } from './mock-api';

export const COST_BATCH_ID = '11111111-1111-4111-8111-111111111111';
export const COST_CONFIG_ID = '33333333-3333-4333-8333-333333333333';
export const COST_SOURCE_ID = '22222222-2222-4222-8222-222222222222';

/** Batch API response shape: config provenance is top-level; snapshots contain execution settings only. */
export function costBatch(over: Partial<AiBatch> = {}): AiBatch {
  return {
    id: COST_BATCH_ID, kind: 'eval', operation: 'generate_cloze', status: 'finished',
    config_id: COST_CONFIG_ID, config_version: 3, fingerprint: 'a'.repeat(64), source_id: COST_SOURCE_ID, parent_id: null,
    model: 'fake:batch-e2e', provider: 'fake', total: 10, done: 10,
    started_by_user: { id: 'admin-1', email: 'admin@wordmet.com' }, created_at: '2026-11-01T02:00:00Z',
    started_at: '2026-11-01T02:00:01Z', finished_at: '2026-11-01T02:01:00Z',
    cost_usd: '0.01230000', known_cost_usd: '0.01230000', unknown_cost_calls: 0, calls: 12, retries: 2,
    input_tokens: 1200, cached_input_tokens: 300, output_tokens: 800, reasoning_tokens: 50,
    ...over,
  };
}

export function costBatchDetail(over: Partial<BatchDetailView> = {}): BatchDetailView {
  return {
    ...costBatch(), snapshot: { instructions: 'Frozen batch prompt', examples: [], model_ref: 'fake-model-id', effort: null, thinking: null, max_output_tokens: 500 },
    items: [], ...over,
  };
}

export const costBatchMocks = (): Record<string, MockHandler> => ({
  'GET /v1/admin/ai/batches': () => ({ json: { items: [costBatch()], next_page_token: null } }),
  [`GET /v1/admin/ai/batches/${COST_BATCH_ID}`]: () => ({ json: costBatchDetail() }),
});
