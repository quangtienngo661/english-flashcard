// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as realStack from '../e2e-real/support/ai-config';

vi.mock('../e2e-real/support/api', () => ({ API: 'http://config-script.test', API_DIR: '/unused-api' }));

type Reply = { status: number; json: unknown; text: string };
type Options = { body?: unknown; idem?: boolean };
type Call = { method: string; path: string; opts: Options };
type Transport = (method: string, path: string, opts?: Options) => Promise<Reply>;
type Helpers = {
  publishModel: (call: Transport, options: { op: string; modelId: string; maxOutputTokens?: number | null }) => Promise<unknown>;
  turnOff: (call: Transport, op: string) => Promise<unknown>;
};
const moduleUrl = new URL('../../api/scripts/ai-config-publish.mjs', import.meta.url).href;
const apiScript = await import(/* @vite-ignore */ moduleUrl) as Helpers;
const OP = 'generate_cloze';
const BASE = `/v1/admin/ai/configs/${OP}`;
const DRAFTS = `${BASE}/drafts`;
const OWN = 'new-script-draft';
const draft = (id: string, note: string | null = null) => ({
  id, number: 4, version: 1, instructions: 'Preserve prompt', examples: [], model: null, max_output_tokens: null, note,
});
const live = { ...draft('live'), version: 2, model: { id: 'old-model' } };

/** A strict API boundary fixture. Unknown paths fail rather than silently accepting legacy calls. */
function scenario(options: { baseline?: boolean; off?: boolean; noChange?: boolean; missingLeftover?: boolean; blocker?: string } = {}) {
  const calls: Call[] = [];
  const bodies: Record<string, unknown>[] = [];
  const published = { ...draft('published'), model: options.off ? null : { id: 'new-model' } };
  let checks = 0;
  const transport: Transport = async (method, path, opts = {}) => {
    calls.push({ method, path, opts });
    const reply = (status: number, json: unknown = null): Reply => ({ status, json, text: JSON.stringify(json) });
    if (method === 'GET' && path === '/v1/admin/ai/models?provider=fake') return reply(200, { items: [{ id: 'new-model', model_id: 'fake:ok' }] });
    if (method === 'GET' && path === BASE) return reply(200, {
      live: options.noChange ? { ...live, model: { id: 'new-model' } } : live,
      live_version: 2, draft: null, draft_count: 4,
    });
    if (method === 'GET' && path === `/v1/admin/ai/eval/sets?operation=${OP}`) return reply(200, { items: [{ id: 'frozen-set', version: 2 }] });
    if (method === 'GET' && path === `${DRAFTS}?page_size=100`) return reply(200, {
      items: [draft('owner-a', 'Do not touch'), draft('leftover-a', 'scripted: old-run')], next_page_token: 'next+/=',
    });
    if (method === 'GET' && path === `${DRAFTS}?page_size=100&page_token=next%2B%2F%3D`) return reply(200, {
      items: [draft('owner-b'), { ...draft('leftover-b'), name: 'scripted: interrupted-create' }], next_page_token: null,
    });
    if (method === 'DELETE' && [ `${DRAFTS}/leftover-a`, `${DRAFTS}/leftover-b` ].includes(path)) return reply(options.missingLeftover ? 404 : 204);
    if (method === 'POST' && path === DRAFTS) return reply(201, draft(OWN));
    if (method === 'PUT' && path === `${DRAFTS}/${OWN}`) {
      bodies.push(opts.body as Record<string, unknown>);
      return reply(200, { ...draft(OWN), version: 2 });
    }
    if (method === 'POST' && path === '/v1/admin/ai/eval/runs') {
      bodies.push(opts.body as Record<string, unknown>);
      return reply(202, { run_id: `run-${bodies.length}`, batch_id: 'batch-id', fingerprint: 'frozen' });
    }
    if (method === 'GET' && path.startsWith('/v1/admin/ai/eval/runs/run-')) return reply(200, { status: 'finished' });
    if (method === 'GET' && path === `${DRAFTS}/${OWN}/publish-check`) return reply(200, {
      draft: { version: 2 }, candidate_run_id: 'candidate', baseline: { run_id: checks > 0 ? 'baseline' : null },
      blockers: options.blocker ? [options.blocker] : options.baseline && checks++ === 0 ? ['baseline-required'] : [], warnings: ['review-warning'], turn_off: options.off,
    });
    if (method === 'POST' && path === `${DRAFTS}/${OWN}/publish`) return reply(200, { live: published });
    throw new Error(`Unexpected API request: ${method} ${path}`);
  };
  return { transport, calls, bodies, published };
}

const variants = [
  { name: 'API smoke/learner script', helpers: apiScript },
  { name: 'admin real-stack helper', helpers: {
    publishModel: async (_call: Transport, options: Parameters<Helpers['publishModel']>[1]) => realStack.publishModel('test-token', options),
    turnOff: async (_call: Transport, op: string) => realStack.turnOff('test-token', op),
  } },
];

describe.each(variants)('$name plural draft lifecycle', ({ helpers }) => {
  let current: ReturnType<typeof scenario>;
  beforeEach(() => {
    current = scenario();
    // Stub only network I/O: the TS helper's request construction and JSON handling remain real.
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('X-CSRF-Protection')).toBe('1');
      const response = await current.transport(init.method ?? 'GET', new URL(String(input)).pathname + new URL(String(input)).search, {
        ...(init.body ? { body: JSON.parse(String(init.body)) } : {}), idem: headers.has('Idempotency-Key'),
      });
      return new Response(response.status === 204 ? null : response.text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  function writesAreIdempotent() {
    const writes = current.calls.filter((call) => call.method !== 'GET');
    expect(writes.length).toBeGreaterThan(0);
    for (const write of writes) expect(write.opts.idem, `${write.method} ${write.path}`).toBe(true);
  }

  it('pages all drafts, leaves owner drafts alone, and publishes only its named draft ID with an explicit eval target', async () => {
    const result = await helpers.publishModel(current.transport, { op: OP, modelId: 'fake:ok' });
    expect(result).toEqual(current.published);
    expect(current.calls.filter((call) => call.method === 'DELETE').map((call) => call.path)).toEqual([`${DRAFTS}/leftover-a`, `${DRAFTS}/leftover-b`]);
    expect(current.calls.find((call) => call.method === 'POST' && call.path === DRAFTS)?.opts.body).toEqual({ name: 'scripted: fake:ok' });
    expect(current.calls.find((call) => call.method === 'POST' && call.path === '/v1/admin/ai/eval/runs')?.opts.body).toEqual({ operation: OP, target: { kind: 'draft', draft_id: OWN }, set_id: 'frozen-set' });
    expect(current.calls.find((call) => call.method === 'POST' && call.path.endsWith('/publish'))?.opts.body).toMatchObject({ expected_version: 2, candidate_run_id: 'candidate', acknowledge_warnings: true });
    writesAreIdempotent();
  });

  it('runs a live target baseline and rechecks the same draft ID before publishing', async () => {
    current = scenario({ baseline: true });
    await helpers.publishModel(current.transport, { op: OP, modelId: 'fake:ok' });
    expect(current.calls.filter((call) => call.path === '/v1/admin/ai/eval/runs').map((call) => call.opts.body)).toEqual([
      { operation: OP, target: { kind: 'draft', draft_id: OWN }, set_id: 'frozen-set' },
      { operation: OP, target: { kind: 'live' }, set_id: 'frozen-set' },
    ]);
    expect(current.calls.filter((call) => call.path === `${DRAFTS}/${OWN}/publish-check`)).toHaveLength(2);
    writesAreIdempotent();
  });

  it('turns off only its own draft, preserves owner drafts, and makes no eval call', async () => {
    current = scenario({ off: true });
    expect(await helpers.turnOff(current.transport, OP)).toEqual(current.published);
    expect(current.calls.some((call) => call.path.startsWith('/v1/admin/ai/eval/'))).toBe(false);
    expect(current.calls.find((call) => call.method === 'PUT')?.opts.body).toMatchObject({ model_ref: null, note: 'scripted: off' });
    expect(current.calls.filter((call) => call.method === 'DELETE').map((call) => call.path)).toEqual([`${DRAFTS}/leftover-a`, `${DRAFTS}/leftover-b`]);
    expect(current.calls.find((call) => call.path.endsWith('/publish'))?.opts.body).toMatchObject({ candidate_run_id: null, baseline_run_id: null, acknowledge_warnings: false });
    writesAreIdempotent();
  });

  it('leaves every draft untouched when the requested model is already live', async () => {
    current = scenario({ noChange: true });
    expect(await helpers.publishModel(current.transport, { op: OP, modelId: 'fake:ok' })).toMatchObject({ id: 'live' });
    expect(current.calls.filter((call) => call.method !== 'GET')).toEqual([]);
    expect(current.calls.some((call) => call.path.startsWith(DRAFTS))).toBe(false);
  });

  it('treats a concurrently removed scripted leftover as already cleared', async () => {
    current = scenario({ missingLeftover: true });
    expect(await helpers.publishModel(current.transport, { op: OP, modelId: 'fake:ok' })).toEqual(current.published);
  });

  it('refuses publishing while the selected draft has blockers', async () => {
    current = scenario({ blocker: 'eval-required' });
    await expect(helpers.publishModel(current.transport, { op: OP, modelId: 'fake:ok' })).rejects.toThrow('blockers');
    expect(current.calls.some((call) => call.method === 'POST' && call.path.endsWith('/publish'))).toBe(false);
  });
});
