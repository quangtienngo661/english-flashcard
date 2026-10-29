import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../api/client';
import {
  AI_OPERATION_ORDER, aiKeys, cancelRun, createDraft, createExample, createModel, deleteDraft, deleteExample, deleteModel, deleteRun, effortChoicesFor, freezeSet, getCosts, getForms, getPrompt,
  getConfigs, getPublishCheck, getRun, getRunComparison, getSet, getStatus, getTestQuota, isDevExample, isRunCancelled, isRunDone, listCalls, listExamples, listModels, listOperations,
  listConfigHistory, listRevisions, listRunItems, listRuns, listSets, publishDraft, refreshModel, revealExample, rollbackToPrevious, runTest, saveOperation, savePrompt, saveDraft, sortByOperationOrder, startRun, testDraft, updateExample,
  updateModel, type AiModel, type ExampleRow,
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

describe('eval example set and runs (A/83)', () => {
  it('examples: list by operation, add, edit, delete', async () => {
    const { api, mock } = fakeApi();
    const body = { operation: 'lookup_word' as const, input: { word: 'go' }, note: null };
    await createExample(api, body);
    await updateExample(api, 'e1', { input: { word: 'went' }, note: 'past' });
    await deleteExample(api, 'e1');
    expect(mock.post).toHaveBeenCalledWith('/v1/admin/ai/eval/examples', body);
    expect(mock.patch).toHaveBeenCalledWith('/v1/admin/ai/eval/examples/e1', { input: { word: 'went' }, note: 'past' });
    expect(mock.delete).toHaveBeenCalledWith('/v1/admin/ai/eval/examples/e1');
  });

  it('a run is started with the Idempotency-Key; runs are paged by operation; one run by id', async () => {
    const { api, mock } = fakeApi();
    await startRun(api, { operation: 'generate_cloze', prompt: 'current' }, 'key-1');
    expect(mock.post).toHaveBeenCalledWith('/v1/admin/ai/eval/runs', { operation: 'generate_cloze', prompt: 'current' }, { idempotencyKey: 'key-1' });
    await listRuns(api, 'generate_cloze');
    await listRuns(api, 'generate_cloze', 'tok+/=');
    await getRun(api, 'r1');
    expect(mock.get.mock.calls.map((c) => c[0])).toEqual([
      '/v1/admin/ai/eval/runs?operation=generate_cloze&page_size=20',
      '/v1/admin/ai/eval/runs?operation=generate_cloze&page_size=20&page_token=tok%2B%2F%3D',
      '/v1/admin/ai/eval/runs/r1',
    ]);
  });

  it('a run is stopped with a POST to /cancel and a finished one deleted with a DELETE, both by id and without a body or a key', async () => {
    const { api, mock } = fakeApi();
    await cancelRun(api, 'r1');
    await deleteRun(api, 'r1');
    expect(mock.post).toHaveBeenCalledExactlyOnceWith('/v1/admin/ai/eval/runs/r1/cancel');
    expect(mock.delete).toHaveBeenCalledExactlyOnceWith('/v1/admin/ai/eval/runs/r1');
  });

  it('a run ends at finished or failed, not at queued or running', () => {
    expect(['queued', 'running', 'finished', 'failed'].map(isRunDone)).toEqual([false, false, true, true]);
  });

  it('a stopped run is a failed one whose error is "cancelled"; a finished run or another error is not', () => {
    expect(isRunCancelled({ status: 'failed', error: 'cancelled' })).toBe(true);
    expect(isRunCancelled({ status: 'failed', error: 'stalled' })).toBe(false);
    expect(isRunCancelled({ status: 'failed', error: null })).toBe(false);
    expect(isRunCancelled({ status: 'finished', error: 'cancelled' })).toBe(false);
  });
});

describe('golden set api (nhóm B M1)', () => {
  it('forms of a word: GET with word and part_of_speech, both encoded', async () => {
    const { api, mock } = fakeApi();
    await getForms(api, 'deploy', 'verb');
    await getForms(api, 'ice cream', 'noun');
    expect(mock.get.mock.calls.map((c) => c[0])).toEqual([
      '/v1/admin/ai/eval/examples/forms?word=deploy&part_of_speech=verb',
      '/v1/admin/ai/eval/examples/forms?word=ice+cream&part_of_speech=noun',
    ]);
  });

  it('a held-out example is opened with a POST to /reveal, without a body', async () => {
    const { api, mock } = fakeApi();
    await revealExample(api, 'e1');
    expect(mock.post).toHaveBeenCalledExactlyOnceWith('/v1/admin/ai/eval/examples/e1/reveal');
  });

  it('versions: freeze POSTs the operation, list and one version are GETs', async () => {
    const { api, mock } = fakeApi();
    await freezeSet(api, 'generate_cloze');
    await listSets(api, 'lookup_word');
    await getSet(api, 'S1');
    expect(mock.post).toHaveBeenCalledExactlyOnceWith('/v1/admin/ai/eval/sets', { operation: 'generate_cloze' });
    expect(mock.get.mock.calls.map((c) => c[0])).toEqual(['/v1/admin/ai/eval/sets?operation=lookup_word', '/v1/admin/ai/eval/sets/S1']);
  });

  it('run items and the comparison of two runs are GETs; listRuns can be limited to one version, after the page token', async () => {
    const { api, mock } = fakeApi();
    await listRunItems(api, 'R1');
    await getRunComparison(api, 'A', 'B');
    await listRuns(api, 'generate_cloze', undefined, 'S1');
    await listRuns(api, 'generate_cloze', 'tok', 'S1');
    expect(mock.get.mock.calls.map((c) => c[0])).toEqual([
      '/v1/admin/ai/eval/runs/R1/items',
      '/v1/admin/ai/eval/runs/compare?a=A&b=B',
      '/v1/admin/ai/eval/runs?operation=generate_cloze&page_size=20&set_id=S1',
      '/v1/admin/ai/eval/runs?operation=generate_cloze&page_size=20&page_token=tok&set_id=S1',
    ]);
  });

  it('a run is started on a version with set_id, which is part of the body', async () => {
    const { api, mock } = fakeApi();
    await startRun(api, { operation: 'generate_cloze', prompt: 'current', set_id: 'S2' }, 'key-2');
    expect(mock.post).toHaveBeenCalledWith('/v1/admin/ai/eval/runs', { operation: 'generate_cloze', prompt: 'current', set_id: 'S2' }, { idempotencyKey: 'key-2' });
  });

  it('only a dev row of the example list can be read or edited', () => {
    const rows = [{ id: 'e1', split: 'dev' }, { id: 'e2', split: 'held_out' }] as unknown as ExampleRow[];
    expect(rows.filter(isDevExample).map((row) => row.id)).toEqual(['e1']);
  });

  it('query keys of the new reads are distinct and start with ai', () => {
    const keys = [aiKeys.sets('generate_cloze'), aiKeys.set('S1'), aiKeys.runItems('R1'), aiKeys.forms('deploy', 'verb'), aiKeys.compare('A', 'B')];
    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(5);
    expect(keys.every((key) => key[0] === 'ai')).toBe(true);
  });
});

describe('config lifecycle api (nhóm B M2)', () => {
  it('the configs of an operation are one GET; the draft is created, saved, deleted and test-run under /draft', async () => {
    const { api, mock } = fakeApi();
    await getConfigs(api, 'generate_cloze');
    await createDraft(api, 'generate_cloze', {});
    await createDraft(api, 'lookup_word', { from_config_id: 'C1' });
    const body = {
      expected_version: 0, instructions: 'x', examples: [], model_ref: null, effort: null, thinking: null, max_output_tokens: null, note: null,
    };
    await saveDraft(api, 'generate_cloze', body);
    await deleteDraft(api, 'generate_cloze');
    await testDraft(api, 'generate_cloze', { example_ids: ['e1'] });
    expect(mock.get).toHaveBeenCalledExactlyOnceWith('/v1/admin/ai/configs/generate_cloze');
    expect(mock.post.mock.calls).toEqual([
      ['/v1/admin/ai/configs/generate_cloze/draft', {}],
      ['/v1/admin/ai/configs/lookup_word/draft', { from_config_id: 'C1' }],
      ['/v1/admin/ai/configs/generate_cloze/draft/test', { example_ids: ['e1'] }],
    ]);
    expect(mock.put).toHaveBeenCalledExactlyOnceWith('/v1/admin/ai/configs/generate_cloze/draft', body);
    expect(mock.delete).toHaveBeenCalledExactlyOnceWith('/v1/admin/ai/configs/generate_cloze/draft');
  });

  it('a run of a config is started with config instead of prompt, and the key of the configs read starts with ai', async () => {
    const { api, mock } = fakeApi();
    await startRun(api, { operation: 'generate_cloze', config: 'draft', set_id: 'S2' }, 'key-3');
    expect(mock.post).toHaveBeenCalledWith('/v1/admin/ai/eval/runs', { operation: 'generate_cloze', config: 'draft', set_id: 'S2' }, { idempotencyKey: 'key-3' });
    expect(aiKeys.configs('lookup_word')).toEqual(['ai', 'configs', 'lookup_word']);
  });
});

describe('config publish api (nhóm B M2)', () => {
  it('the publish check and the history are GETs (the history is paged), publish and rollback are POSTs with their bodies', async () => {
    const { api, mock } = fakeApi();
    await getPublishCheck(api, 'generate_cloze');
    await listConfigHistory(api, 'lookup_word');
    await listConfigHistory(api, 'lookup_word', 'tok+/=');
    const body = { expected_version: 2, candidate_run_id: 'RC', baseline_run_id: null, acknowledge_warnings: false };
    await publishDraft(api, 'generate_cloze', body);
    await rollbackToPrevious(api, 'generate_cloze', { expected_live_version: 5 });
    expect(mock.get.mock.calls.map((c) => c[0])).toEqual([
      '/v1/admin/ai/configs/generate_cloze/publish-check',
      '/v1/admin/ai/configs/lookup_word/history?page_size=20',
      '/v1/admin/ai/configs/lookup_word/history?page_size=20&page_token=tok%2B%2F%3D',
    ]);
    expect(mock.post.mock.calls).toEqual([
      ['/v1/admin/ai/configs/generate_cloze/publish', body],
      ['/v1/admin/ai/configs/generate_cloze/rollback', { expected_live_version: 5 }],
    ]);
  });

  it('the keys of the publish check and the history start with ai and differ from the configs key', () => {
    const keys = [aiKeys.configs('generate_cloze'), aiKeys.publishCheck('generate_cloze'), aiKeys.configHistory('generate_cloze')];
    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(3);
    expect(keys.every((key) => key[0] === 'ai')).toBe(true);
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

describe('ai reports api (A/85, A/86)', () => {
  it('reads costs with from, to and group_by, and the calls of one operation id (encoded)', async () => {
    const { api, mock } = fakeApi();
    await getCosts(api, '2026-10-01', '2026-10-27', 'operation');
    await listCalls(api, 'a b/1');
    expect(mock.get.mock.calls.map((c) => c[0])).toEqual([
      '/v1/admin/ai/costs?from=2026-10-01&to=2026-10-27&group_by=operation',
      '/v1/admin/ai/calls?operation_id=a+b%2F1',
    ]);
  });
});
