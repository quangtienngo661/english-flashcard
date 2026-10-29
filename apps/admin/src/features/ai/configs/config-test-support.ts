// Test-only fixtures for the "Cấu hình" page (nhóm B M2) tests; not imported by the app.
import type { Route } from '../../../auth/test-support';
import type { AiModel, ConfigEvent, ConfigView, ConfigsView, PublishCheck } from '../ai-api';
import { AT, CLOZE_FIELDS, GUARD, SYSTEM, URL as PROMPT_URL, evalSet, example, quota, revision } from '../prompt-test-support';

export const LAN = { id: 'u9', email: 'lan@wordmet.com', system: false };
export const RUN_ID = 'aaaaaaaa-0000-4000-8000-000000000001';

/** The live config 3 of `generate_cloze` as the seeded database has it, on `fake:ok`. */
export const configView = (over: Partial<ConfigView> = {}): ConfigView => ({
  id: 'C3', operation: 'generate_cloze', number: 3, version: 0, status: 'published', instructions: 'Write one short sentence.', examples: [example()],
  model: { id: 'M1', provider: 'fake', model_id: 'fake:ok' }, effort: null, thinking: null, max_output_tokens: null, note: null, created_from: null,
  created_by_user: SYSTEM, created_at: AT, published_by_user: SYSTEM, published_at: AT, estimate: null, ...over,
});

/** The draft 4, a copy of config 3. */
export const draftView = (over: Partial<ConfigView> = {}): ConfigView => configView({
  id: 'C4', number: 4, version: 0, status: 'draft', created_from: 'C3', created_by_user: LAN, published_by_user: null, published_at: null, ...over,
});

export const configsView = (over: Partial<ConfigsView> = {}): ConfigsView => ({
  operation: 'generate_cloze', input_fields: CLOZE_FIELDS, guard: GUARD, live_version: 5, live: configView(), draft: null, previous: null, ...over,
});

export const modelRow = (id: string, provider: AiModel['provider'], model_id: string, over: Partial<AiModel> = {}): AiModel => ({
  id, provider, model_id, shutdown_at: null, lifecycle: null, effort_choices: [], thinking_off_available: false, structured_outputs: true, max_output_tokens: null,
  price: null, note: null, info_checked_at: AT, used_by: [], estimate: null, hidden: false, ...over,
});
export const FAKE_OK = modelRow('M1', 'fake', 'fake:ok', { lifecycle: 'active' });

/** What `publish-check` says about the draft 4 (saved at version 0) on the newest version S2: a complete run of each side, nothing to warn about. */
export const publishCheck = (over: Partial<PublishCheck> = {}): PublishCheck => ({
  operation: 'generate_cloze', draft: { id: 'C4', number: 4, version: 0 }, turn_off: false, set: { id: 'S2', version: 2 }, candidate_run_id: 'RC',
  baseline: { required: true, run_id: 'RB' }, blockers: [], warnings: [], ...over,
});

export const configEvent = (over: Partial<ConfigEvent> = {}): ConfigEvent => ({
  id: 'ev1', kind: 'publish', at: AT, actor_user: LAN, config: { id: 'C4', number: 4, model_id: 'fake:ok' },
  from_config: { id: 'C3', number: 3, model_id: 'fake:ok' }, candidate_run_id: 'RC', baseline_run_id: 'RB', warnings: [], ...over,
});

export const URL = {
  ...PROMPT_URL,
  configs: (op = 'generate_cloze') => `GET /v1/admin/ai/configs/${op}`,
  createDraft: (op = 'generate_cloze') => `POST /v1/admin/ai/configs/${op}/draft`,
  saveDraft: (op = 'generate_cloze') => `PUT /v1/admin/ai/configs/${op}/draft`,
  deleteDraft: (op = 'generate_cloze') => `DELETE /v1/admin/ai/configs/${op}/draft`,
  testDraft: (op = 'generate_cloze') => `POST /v1/admin/ai/configs/${op}/draft/test`,
  publishCheck: (op = 'generate_cloze') => `GET /v1/admin/ai/configs/${op}/publish-check`,
  publish: (op = 'generate_cloze') => `POST /v1/admin/ai/configs/${op}/publish`,
  rollback: (op = 'generate_cloze') => `POST /v1/admin/ai/configs/${op}/rollback`,
  history: (op = 'generate_cloze') => `GET /v1/admin/ai/configs/${op}/history?page_size=20`,
  models: 'GET /v1/admin/ai/models',
};

/** The two frozen versions of `generate_cloze`: S2 is the newest (the API lists them newest first). */
export const TWO_SETS = () => Response.json({ items: [evalSet({ id: 'S2', version: 2 }), evalSet({ id: 'S1', version: 1 })] });

/** Every read the page makes for `op`, answered; `over` replaces or adds routes. */
export function configRoutes(over: Record<string, Route> = {}, op = 'generate_cloze'): Record<string, Route> {
  return {
    [URL.configs(op)]: () => Response.json(configsView()),
    [URL.models]: () => Response.json({ items: [FAKE_OK] }),
    [URL.sets(op)]: TWO_SETS,
    [URL.publishCheck(op)]: () => Response.json(publishCheck({ operation: op as PublishCheck['operation'] })),
    [URL.history(op)]: () => Response.json({ items: [], next_page_token: null }),
    [URL.examples(op)]: () => Response.json({ items: [] }),
    [URL.quota]: () => Response.json(quota()),
    [URL.revisions(op)]: () => Response.json({ items: [revision(2), revision(1)], next_page_token: null }),
    ...over,
  };
}
