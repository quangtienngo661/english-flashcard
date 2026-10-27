import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../api/client';
import {
  AI_OPERATION_ORDER, createModel, deleteModel, effortChoicesFor, getPrompt, getStatus, getTestQuota, listExamples, listModels, listOperations,
  listRevisions, refreshModel, runTest, saveOperation, savePrompt, sortByOperationOrder, updateModel, type AiModel,
} from './ai-api';

function fakeApi() {
  const mock = {
    get: vi.fn().mockResolvedValue({}), post: vi.fn().mockResolvedValue({}), put: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue(undefined), postForm: vi.fn(),
  };
  return { api: mock as unknown as ApiClient, mock };
}

describe('ai api paths and methods', () => {
  it('reads', async () => {
    const { api, mock } = fakeApi();
    await getStatus(api); await listModels(api); await listOperations(api); await getPrompt(api, 'lookup_word'); await getTestQuota(api);
    await listExamples(api, 'generate_cloze');
    expect(mock.get.mock.calls.map((c) => c[0])).toEqual([
      '/v1/admin/ai/status', '/v1/admin/ai/models', '/v1/admin/ai/operations', '/v1/admin/ai/prompts/lookup_word',
      '/v1/admin/ai/test-quota', '/v1/admin/ai/eval/examples?operation=generate_cloze',
    ]);
  });

  it('pages revisions with page_size and page_token', async () => {
    const { api, mock } = fakeApi();
    await listRevisions(api, 'check_private_word');
    await listRevisions(api, 'check_private_word', 'tok+/=');
    expect(mock.get.mock.calls[0][0]).toBe('/v1/admin/ai/prompts/check_private_word/revisions?page_size=20');
    expect(mock.get.mock.calls[1][0]).toBe('/v1/admin/ai/prompts/check_private_word/revisions?page_size=20&page_token=tok%2B%2F%3D');
  });

  it('writes', async () => {
    const { api, mock } = fakeApi();
    const model = { provider: 'openai' as const, model_id: 'gpt-x' };
    await createModel(api, model);
    await updateModel(api, 'm1', { note: 'n' });
    await refreshModel(api, 'm1');
    await deleteModel(api, 'm1');
    const op = { expected_version: 0, model_ref: 'm1', effort: null, thinking: null, max_output_tokens: 1200 };
    await saveOperation(api, 'lookup_word', op);
    const prompt = { expected_revision: 1, instructions: 'x', examples: [] };
    await savePrompt(api, 'lookup_word', prompt);
    const test = { instructions: 'x', examples: [], example_ids: ['e1'] };
    await runTest(api, 'lookup_word', test);
    expect(mock.post.mock.calls).toEqual([
      ['/v1/admin/ai/models', model], ['/v1/admin/ai/models/m1/refresh'], ['/v1/admin/ai/prompts/lookup_word/test', test],
    ]);
    expect(mock.patch).toHaveBeenCalledWith('/v1/admin/ai/models/m1', { note: 'n' });
    expect(mock.delete).toHaveBeenCalledWith('/v1/admin/ai/models/m1');
    expect(mock.put.mock.calls).toEqual([['/v1/admin/ai/operations/lookup_word', op], ['/v1/admin/ai/prompts/lookup_word', prompt]]);
  });
});

describe('sortByOperationOrder', () => {
  it('puts generate_cloze first though the API returns a→z, without mutating the input', () => {
    const apiOrder = [...AI_OPERATION_ORDER].sort().map((operation) => ({ operation }));
    expect(apiOrder[0].operation).toBe('check_private_word');
    const sorted = sortByOperationOrder(apiOrder);
    expect(sorted.map((row) => row.operation)).toEqual([...AI_OPERATION_ORDER]);
    expect(apiOrder[0].operation).toBe('check_private_word');
  });
});

describe('effortChoicesFor', () => {
  const models = [{ id: 'm1', effort_choices: ['low', 'high'] }, { id: 'm2', effort_choices: [] }] as unknown as AiModel[];
  it("returns the choices of the setting's model", () => {
    expect(effortChoicesFor({ model: { id: 'm1', provider: 'openai', model_id: 'x' } }, models)).toEqual(['low', 'high']);
  });
  it('is empty without a model or with an unknown one', () => {
    expect(effortChoicesFor({ model: null }, models)).toEqual([]);
    expect(effortChoicesFor({ model: { id: 'zz', provider: 'openai', model_id: 'x' } }, models)).toEqual([]);
  });
});
