import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../api/client';
import {
  addFromSource, getEstimate, getRealPass, getSourcePreview, isRealPassActive, listRealPasses, realKeys, sourceKeyPart, startRealJudge, type RealJudgeFilters,
} from './real-questions-api';

function fakeApi() {
  const mock = { get: vi.fn().mockResolvedValue({}), post: vi.fn().mockResolvedValue({}) };
  return { api: mock as unknown as ApiClient, mock };
}

const filters: RealJudgeFilters = { judge_id: 'J', operation: 'generate_cloze', config: null, test_accounts_only: false };

describe('real questions api', () => {
  it('the estimate carries the judge and operation; the config pair and the test-account switch only when they are set', async () => {
    const { api, mock } = fakeApi();
    await getEstimate(api, { judge_id: 'J', operation: 'generate_cloze', config: { number: 4, model: 'fake:ok' }, test_accounts_only: true });
    await getEstimate(api, filters);
    expect(mock.get.mock.calls.map((c) => c[0])).toEqual([
      '/v1/admin/practice/real-judge/estimate?judge_id=J&operation=generate_cloze&config_number=4&model=fake%3Aok&test_accounts_only=true',
      '/v1/admin/practice/real-judge/estimate?judge_id=J&operation=generate_cloze',
    ]);
  });

  it('starting a pass is a POST of the filters with the Idempotency-Key', async () => {
    const { api, mock } = fakeApi();
    await startRealJudge(api, { ...filters, config: { number: 4, model: 'fake:ok' }, test_accounts_only: true }, 'k1');
    expect(mock.post).toHaveBeenCalledExactlyOnceWith(
      '/v1/admin/practice/real-judge',
      { judge_id: 'J', operation: 'generate_cloze', config: { number: 4, model: 'fake:ok' }, test_accounts_only: true },
      { idempotencyKey: 'k1' },
    );
  });

  it('the passes are paged by page_size and page_token; one pass is read with its items', async () => {
    const { api, mock } = fakeApi();
    await listRealPasses(api);
    await listRealPasses(api, 'tok+/=');
    await getRealPass(api, 'P1');
    expect(mock.get.mock.calls.map((c) => c[0])).toEqual([
      '/v1/admin/practice/real-judge/passes?page_size=20',
      '/v1/admin/practice/real-judge/passes?page_size=20&page_token=tok%2B%2F%3D',
      '/v1/admin/practice/real-judge/passes/P1/items',
    ]);
  });

  it('the preview names the report or the question, never both; adding sends the corrected answer and the note with an Idempotency-Key', async () => {
    const { api, mock } = fakeApi();
    await getSourcePreview(api, { report_id: 'R' });
    await getSourcePreview(api, { question_id: 'Q' });
    expect(mock.get.mock.calls.map((c) => c[0])).toEqual([
      '/v1/admin/practice/eval-examples/from-source?report_id=R',
      '/v1/admin/practice/eval-examples/from-source?question_id=Q',
    ]);
    await addFromSource(api, { report_id: 'R', expected: { forms: ['go'] }, note: null }, 'k2');
    expect(mock.post).toHaveBeenCalledExactlyOnceWith(
      '/v1/admin/practice/eval-examples/from-source', { report_id: 'R', expected: { forms: ['go'] }, note: null }, { idempotencyKey: 'k2' },
    );
  });

  it('the cache keys: one `all` root, so one invalidation reads the estimate, the passes and every pass again', () => {
    expect(realKeys.estimate(filters).slice(0, 2)).toEqual(realKeys.all);
    expect(realKeys.passes().slice(0, 2)).toEqual(realKeys.all);
    expect(realKeys.pass('P1').slice(0, 2)).toEqual(realKeys.all);
    expect(realKeys.source({ report_id: 'R' })).not.toEqual(realKeys.source({ question_id: 'R' }));
    expect(sourceKeyPart({ report_id: 'R' })).toBe('report:R');
    expect(sourceKeyPart({ question_id: 'Q' })).toBe('question:Q');
  });

  it('a pass is active while it is queued or running', () => {
    expect(isRealPassActive({ status: 'queued' })).toBe(true);
    expect(isRealPassActive({ status: 'running' })).toBe(true);
    expect(isRealPassActive({ status: 'finished' })).toBe(false);
    expect(isRealPassActive({ status: 'failed' })).toBe(false);
  });
});
