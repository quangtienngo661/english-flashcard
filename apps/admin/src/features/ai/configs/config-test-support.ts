// Test-only fixtures for the "Cấu hình" page (nhóm B M2) tests; not imported by the app.
import type { Route } from '../../../auth/test-support';
import type { AiModel, ConfigView, ConfigsView } from '../ai-api';
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

export const URL = {
  ...PROMPT_URL,
  configs: (op = 'generate_cloze') => `GET /v1/admin/ai/configs/${op}`,
  createDraft: (op = 'generate_cloze') => `POST /v1/admin/ai/configs/${op}/draft`,
  saveDraft: (op = 'generate_cloze') => `PUT /v1/admin/ai/configs/${op}/draft`,
  deleteDraft: (op = 'generate_cloze') => `DELETE /v1/admin/ai/configs/${op}/draft`,
  testDraft: (op = 'generate_cloze') => `POST /v1/admin/ai/configs/${op}/draft/test`,
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
    [URL.examples(op)]: () => Response.json({ items: [] }),
    [URL.quota]: () => Response.json(quota()),
    [URL.revisions(op)]: () => Response.json({ items: [revision(2), revision(1)], next_page_token: null }),
    ...over,
  };
}
