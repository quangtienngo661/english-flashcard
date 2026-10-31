import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import vi from '../messages/vi.json' with { type: 'json' };
import { cfgCheck, cfgConfig, cfgDraft, cfgView } from './support/ai-configs';
import { devExample, evalSet, heldOutExample, runItem, runStats } from './support/ai-eval';
import { judgeAgreement, judgeOnFake, judgePass, judgeRevision, score, tally } from './support/ai-judges';
import { seriousViolations } from './support/axe';
import { mockApi, problem, signedInAs, type MockHandler, type MockRequest } from './support/mock-api';
import { contentMocks, SENSE_ID } from './support/content';
import { settingsMocks } from './support/settings';

/** Design §8: axe on every refreshed screen × VI/EN × 1440/390 (the two projects): no serious or critical violation. */

const at = '2026-10-14T09:30:00.000Z';
const JOB = 'a3f2c1aa-0000-4000-8000-000000000001';
const batch = {
  id: 'b1',
  status: 'partial',
  file_name: 'cefrj-vocabulary-profile-1.5.csv',
  row_count: 7799,
  counters: { processed: 7799, created: 7512, updated: 240, unchanged: 40, rejected: 7 },
  warnings: ['Dòng 12: bỏ dấu đã rà của revision 3f2a'],
  created_at: at,
  started_at: at,
  finished_at: at,
  reverted: false,
};
const job = { id: JOB, status: 'running', filter: { level: 'B1' }, snapshot_count: 1250, not_ready_count: 0, counters: { processed: 480, published: 480 }, created_at: at, started_at: at, finished_at: null };
const staffRow = { id: 'u9', email: 'new@wordmet.com', email_verified: true, staff_role: null };
const mocks: Record<string, MockHandler> = {
  'GET /v1/admin/content/uploads': () => ({ json: { items: [{ id: 'b1', status: 'partial', file_name: batch.file_name, row_count: 7799, created_at: at }], next_page_token: null } }),
  'GET /v1/admin/content/uploads/b1': () => ({ json: batch }),
  'GET /v1/admin/content/senses/publish-jobs': () => ({ json: { items: [job], next_page_token: null } }),
  [`GET /v1/admin/content/senses/publish-jobs/${JOB}`]: () => ({ json: job }),
  'GET /v1/admin/content/sources': () => ({ json: { items: [{ id: 's1', kind: 'third_party', name: 'CEFR-J Vocabulary Profile', version: '1.5', url: null, license: 'CC BY 4.0', attribution: '', display_priority: 10 }] } }),
  'GET /v1/admin/taxonomy/topics': () => ({ json: { items: [{ code: 'food', names: { vi: 'Ăn uống' }, archived_at: null }] } }),
  'GET /v1/admin/staff': () => ({ json: { items: [{ id: 'admin-1', email: 'admin@wordmet.com', email_verified: true, staff_role: 'admin' }], next_page_token: null } }),
  'GET /v1/admin/users': () => ({ json: staffRow }),
  'PUT /v1/admin/users/u9/staff-role': () => ({ json: { ...staffRow, staff_role: 'editor' } }),
  'GET /v1/admin/ai/status': () => ({ json: {
    operations: ['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'].map((operation, i) => ({
      operation, ready: i === 0, reason: i === 0 ? null : 'model-not-set', model: i === 0 ? { provider: 'openai', model_id: 'gpt-x' } : null, effort: null, thinking: null,
      max_output_tokens: null, last_error: i === 1 ? { at, outcome: 'timeout', http_status: 504, purpose: 'test' } : null,
      model_warning: i === 0 ? { shutdown_at: '2026-11-30T00:00:00.000Z', lifecycle: 'deprecated' } : null,
    })),
    today: { calls: 1240, cap: 3000, failed_calls: 12, failed_cost_usd: '0.0400', cost_usd: '2.3100', cost_vnd: 60291, admin_cost_usd: '1.50000000', admin_usd_cap: 2 },
    ai_enabled: true,
    providers: { openai: true, anthropic: false, fake: true },
  } }),
  'GET /v1/admin/ai/models': () => ({ json: { items: [
    {
      id: 'm1', provider: 'openai', model_id: 'gpt-x', shutdown_at: '2026-11-30T00:00:00.000Z', lifecycle: 'deprecated', effort_choices: [], thinking_off_available: false,
      structured_outputs: true, max_output_tokens: null, price: { input: '2.5000', cached_input: null, output: '10.0000' }, note: 'rẻ nhất', info_checked_at: at,
      used_by: ['generate_cloze'], estimate: { per_call_usd: '0.0065', per_call_vnd: 169, per_day_1000_vnd: 169000, max_call_usd: null, max_call_vnd: null },
    },
    {
      id: 'm2', provider: 'anthropic', model_id: 'claude-x', shutdown_at: null, lifecycle: null, effort_choices: [], thinking_off_available: false,
      structured_outputs: null, max_output_tokens: null, price: null, note: null, info_checked_at: at, used_by: [], estimate: null,
    },
  ] } }),
  'GET /v1/admin/ai/operations': () => ({ json: { items: ['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'].map((operation, i) => ({
    operation, model: i === 1 ? { id: 'm1', provider: 'openai', model_id: 'gpt-x' } : null, effort: null, thinking: null, max_output_tokens: i === 1 ? 800 : null,
    version: 1, input_fields: [], estimate: null,
  })) } }),
  'GET /v1/admin/ai/configs/generate_cloze': () => ({ json: cfgView({
    live: cfgConfig(3, { model: { id: 'm1', provider: 'openai', model_id: 'gpt-x' } }),
    previous: cfgConfig(2),
    draft: cfgDraft(4, { model: { id: 'm1', provider: 'openai', model_id: 'gpt-x' }, note: 'thử lời dặn ngắn hơn' }),
  }) }),
  'GET /v1/admin/ai/configs/generate_cloze/publish-check': () => ({ json: cfgCheck({
    warnings: [
      { code: 'rate-drop', criterion: 'rule', before: { passed: 6, counted: 7 }, after: { passed: 1, counted: 3 } },
      { code: 'dev-regressed', example_ids: ['e1', 'e2'] },
      { code: 'held-out-failures-up', before: 1, after: 3 },
    ],
  }) }),
  'GET /v1/admin/ai/configs/generate_cloze/history': () => ({ json: { items: [
    { id: 'ev3', kind: 'publish', at, actor_user: { id: 'u9', email: 'lan@wordmet.com', system: false }, config: { id: 'C3', number: 3, model_id: 'gpt-x' }, from_config: { id: 'C2', number: 2, model_id: null }, candidate_run_id: 'RC', baseline_run_id: null, warnings: [] },
    { id: 'ev2', kind: 'rollback', at, actor_user: { id: 'u9', email: 'lan@wordmet.com', system: false }, config: { id: 'C2', number: 2, model_id: 'gpt-x' }, from_config: { id: 'C3', number: 3, model_id: 'gpt-x' }, candidate_run_id: null, baseline_run_id: null, warnings: [] },
    { id: 'ev1', kind: 'publish', at, actor_user: { id: 'sys', email: null, system: true }, config: { id: 'C1', number: 1, model_id: null }, from_config: { id: 'C0', number: 0, model_id: 'gpt-x' }, candidate_run_id: null, baseline_run_id: null, warnings: [] },
  ], next_page_token: null } }),
  'GET /v1/admin/ai/prompts/generate_cloze/revisions': () => ({ json: { items: [{
    revision: 3, instructions: 'Write one short sentence.', examples: [], saved_by: 'sys', saved_at: at, saved_by_user: { id: 'sys', email: null, system: true },
  }], next_page_token: null } }),
  'GET /v1/admin/ai/test-quota': () => ({ json: { limit: 20, remaining: 17, resets_at: at } }),
  'GET /v1/admin/ai/eval/examples': () => ({ json: { items: [
    devExample('e1', 'bank', { input: { word: 'bank', part_of_speech: 'noun', level: 'A2', meaning_vi: 'bờ sông', context_label: null }, note: 'river', expected: { forms: ['bank', 'banks'] } }),
    heldOutExample('e2'),
  ] } }),
  'GET /v1/admin/ai/eval/sets': () => ({ json: { items: [evalSet({ id: 'S2', version: 2 }), evalSet({ id: 'S1', version: 1, revealed_count: 1 })] } }),
  'GET /v1/admin/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001/items': () => ({ json: {
    items: [runItem({ rule: { status: 'fail', problems: ['unknown-form:banking'], reason: null }, scores: [score({ verdict: 'fail_minor', reason: 'though fits too' })] })],
    stats: runStats({ total: 1, shape_pass: 1, rule_fail: 1, expected_pass: 1 }, { total: 1, shape_pass: 1, rule_pass: 1, expected_pass: 1 }),
    passes: [judgePass({ total: 1, judged: 1 })],
    judge_stats: [{ judge_id: 'J1', judge_name: 'Chỉ một đáp án', judge_revision_id: 'JR2', revision: 2, criterion: 'single_answer', dev: tally({ fail_minor: 1 }), held_out: tally({ pass: 1 }), calibrated: false }],
  } }),
  'GET /v1/admin/ai/judges': () => ({ json: { items: [judgeOnFake()] } }),
  'GET /v1/admin/ai/judges/J1/revisions': () => ({ json: { items: [judgeOnFake().latest, judgeRevision()] } }),
  'GET /v1/admin/ai/judges/J1/agreement': () => ({ json: judgeAgreement() }),
  'GET /v1/admin/ai/costs': () => ({ json: {
    items: [{ key: '2026-10-15', calls: 10, input_tokens: 1200, cached_input_tokens: 300, output_tokens: 800, reasoning_tokens: 50, cost_usd: '0.01230000', cost_vnd: 321, unknown_cost_calls: 2 }],
    total: { calls: 10, input_tokens: 1200, cached_input_tokens: 300, output_tokens: 800, reasoning_tokens: 50, cost_usd: '0.01230000', cost_vnd: 321, unknown_cost_calls: 2 },
  } }),
  'GET /v1/admin/ai/calls': () => ({ json: { items: [{
    id: 'c1', attempt: 1, purpose: 'learner', operation: 'generate_cloze', provider: 'openai', model: 'gpt-x', effort: null, thinking: null, max_output_tokens: null,
    prompt_revision: 3, outcome: 'timeout', http_status: null, provider_error_code: null, latency_ms: 10000, input_tokens: 120, cached_input_tokens: 20,
    output_tokens: 0, reasoning_tokens: 0, cost_usd: '0.00010000', cost_known: true, created_at: at, held_out: false,
    content: { request: { messages: ['hi'] }, response: '{}', expires_at: '2026-10-15T10:00:00.000Z' },
  }, {
    id: 'c2', attempt: 1, purpose: 'eval', operation: 'generate_cloze', provider: 'openai', model: 'gpt-x', effort: null, thinking: null, max_output_tokens: null,
    prompt_revision: 3, outcome: 'succeeded', http_status: 200, provider_error_code: null, latency_ms: 800, input_tokens: 120, cached_input_tokens: 20,
    output_tokens: 40, reasoning_tokens: 0, cost_usd: '0.00020000', cost_known: true, created_at: at, held_out: true, content: null,
  }] } }),
  'GET /v1/admin/ai/eval/runs': (req) => ({ json: { items: req.query.get('set_id') ? [evalRun, { ...evalRun, id: 'aaaaaaaa-0000-4000-8000-000000000002', model: 'gpt-y' }] : [evalRun], next_page_token: null } }),
  'GET /v1/admin/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001': () => ({ json: { ...evalRun, draft: null, heartbeat_at: null, items: [] } }),
  ...settingsMocks,
  ...contentMocks,
  'GET /v1/admin/transactions': () => ({ json: { items: [{
    id: 't1', kind: 'renewal', plan: 'pro', interval: 'month', amount_minor: 99000, currency: 'VND', occurred_at: at, period_start: at,
    period_end: '2026-11-14T09:30:00.000Z', status: 'pending', provider: 'fake', provider_transaction_id: 'fake_txn_8f2c41d9a7',
    user: { id: 'u1', email: 'lan@example.com' },
  }], next_page_token: null } }),
};

const evalRun = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001', operation: 'generate_cloze', provider: 'openai', model: 'gpt-x', effort: null, thinking: null, max_output_tokens: null, prompt_revision: null,
  config_id: null, config_version: null, config_number: null,
  status: 'finished', total: 1, done: 1, valid_count: 1, set_id: 'S1', set_version: 1, legacy: false, complete: true, avg_latency_ms: 700, cost_usd: '0.01000000', cost_unknown_count: 0, error: null, started_by: 'u9',
  started_by_user: { id: 'u9', email: 'lan@wordmet.com', system: false }, created_at: at, started_at: at, finished_at: at,
};
const RID = '5b1f0000-0000-4000-8000-0000000000a1';
const reportRow = {
  id: RID, sense_id: 's1', reason: 'wrong_meaning', reason_label: 'Nghĩa sai', note: 'Nghĩa không khớp', status: 'open',
  question_snapshot: {
    type: 'mcq_definition',
    prompt: { kind: 'mcq', meaning: 'a computer that serves', meaning_language: 'en', context_label: null, options: ['máy chủ', 'bộ nhớ', 'bộ nhớ đệm', 'ổ đĩa'] },
    correct: { lemma: 'server', meaning: 'máy chủ', definition_en: null, option_index: 0 },
    hints_shown: { level1: null, level2: null, level3: null },
    learner: { answer: 'ổ đĩa', option_index: 3, answers_tried: [], result: 'wrong', hint_level: 0 },
  },
  created_at: at, resolved_at: null, resolved_by: null, resolved_by_role: null, resolved_by_user: null,
  refundable: true, question_source: 'ai', ai_operation_id: 'op-1', call_operation_id: 'call-1', model: 'gpt-x', prompt_revision: 3, ai_charged: true, refunded: null,
};
const reasonRow = {
  code: 'wrong_meaning', label_vi: 'Nghĩa sai', label_en: 'Wrong meaning', detail_hint_vi: null, detail_hint_en: null, applies_to: 'all', note_required: false,
  refundable: true, active: true, position: 10, updated_at: at, updated_by_user: { id: 'admin-1', email: 'admin@wordmet.com', system: false },
};
Object.assign(mocks, {
  'GET /v1/admin/practice/report-reasons': () => ({ json: { items: [reasonRow] } }),
  'GET /v1/admin/practice/reports': () => ({ json: { items: [reportRow], next_page_token: null } }),
  [`GET /v1/admin/practice/reports/${RID}`]: () => ({ json: reportRow }),
  'GET /v1/admin/practice/refunds': () => ({ json: { items: [{
    report_id: RID, user_id: 'u-lan', user: { id: 'u-lan', email: 'lan@example.com', system: false }, resolved_by: 'u-minh', resolved_by_role: 'editor',
    resolved_by_user: { id: 'u-minh', email: 'minh@example.com', system: false }, self_resolved: false, refunded: true, resolved_at: at,
  }], next_page_token: null } }),
  'GET /v1/admin/practice/unknown-forms': () => ({ json: { items: [{ id: 'f-1', lemma_key: 'go', form: 'went', rejected_count: 3, first_seen_at: at, last_seen_at: at }], next_page_token: null } }),
});

const UID = '6b1f0000-0000-4000-8000-00000000e42a';
const userRow = { id: UID, email: 'lan@example.com', given_name: 'Lan', family_name: 'Nguyễn', email_verified: true, staff_role: null, status: 'locked', created_at: at, last_seen_at: at };
const grantRow = {
  id: '9a000000-0000-4000-8000-000000000001', user_id: UID, kind: 'plan', plan: 'pro', limits: null, starts_at: at, ends_at: '2099-11-21T17:00:00.000Z', reason: 'Giải IELTS tháng 10',
  granted_by: 'a1', granted_by_role: 'admin', revoked_at: null, revoked_by: null, revoke_reason: null, paid_renewal_action: null, created_at: at,
  user: { id: UID, email: 'lan@example.com' }, granted_by_user: { id: 'a1', email: 'admin@wordmet.com' }, revoked_by_user: null, status: 'active', last_change: null,
};
Object.assign(mocks, {
  // The staff page asks the same path with `?email=` and expects one user, the Người dùng list asks for a page.
  'GET /v1/admin/users': (req: MockRequest) => ({ json: req.query.has('email') ? staffRow : { items: [userRow], next_page_token: null } }),
  [`GET /v1/admin/users/${UID}`]: () => ({ json: { ...userRow, birth_date: '2008-05-14', terms_accepted_at: at, terms_version: '2026-10-01', locked_at: at, locked_by: { id: 'a1', email: 'admin@wordmet.com' }, lock_reason: 'Spam' } }),
  'GET /v1/admin/entitlements/grants': () => ({ json: { items: [grantRow], next_page_token: null } }),
  'GET /v1/admin/entitlements/ai-usage': () => ({ json: { date: '2026-10-27', used: 812, confirmed: 800, reserved: 12, cap: 1000, alert_percent: 80, alert_reached: false, enabled: true } }),
});

const pages = ['/uploads', '/uploads/b1', '/uploads/new', '/publish-jobs', `/publish-jobs/${JOB}`, '/sources', '/sources/new', '/export', '/ai/costs', '/ai/costs?group_by=operation', '/ai/calls', '/ai/calls?operation_id=op-1', '/transactions', '/ai/status', '/ai/models', '/ai/models/new', '/ai/models/m1', '/ai/configs', '/ai/eval', '/ai/eval/new', '/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001', '/ai/judges', '/ai/judges/label?run=aaaaaaaa-0000-4000-8000-000000000001&judge=J1', '/settings', '/settings?tab=entitlements', '/words', '/senses', `/senses/${SENSE_ID}`, '/topics', '/reports', `/reports/${RID}`, '/report-reasons', '/report-reasons/new', '/refunds', '/unknown-forms', '/users', `/users/${UID}`, '/entitlements', '/entitlements/new'];

for (const [lang, copy] of [['vi', vi], ['en', en]] as const) {
  test.describe(`axe (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((l) => localStorage.setItem('wordmet-admin.locale', l), lang);
    });

    test('the login page', async ({ page }) => {
      await mockApi(page, { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') });
      await page.goto('/login');
      await expect(page.getByRole('heading', { level: 1, name: copy.account.login.title })).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });

    test('every signed-in screen, its panels and dialogs', async ({ page }) => {
      test.setTimeout(150_000); // one test walks every screen; each added screen adds seconds under parallel load
      await signedInAs(page, 'admin', mocks);
      for (const path of pages) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
        await waitForContent(page, path);
        expect(await seriousViolations(page), path).toEqual([]);
      }
    });

    test('the staff page with a role-change toast', async ({ page }) => {
      await signedInAs(page, 'admin', mocks);
      await page.goto('/staff');
      await page.getByLabel(copy.staff.search.label).fill(staffRow.email);
      await page.getByRole('button', { name: copy.staff.search.submit }).click();
      await page.getByRole('button', { name: copy.staff.card.grantEditor }).click();
      await page.getByRole('dialog').getByRole('button', { name: copy.common.confirm }).click();
      await expect(page.getByText(copy.staff.toast.granted.replace('{role}', 'editor').replace('{email}', staffRow.email))).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  });
}

/** Wait until what a screen loads is on it, so axe does not scan a loading state. */
async function waitForContent(page: Page, path: string) {
  if (path.endsWith('/new') || path === '/ai/models/m1') await expect(page.getByRole('dialog')).toBeVisible();
  else if (path === '/uploads/b1') await expect(page.getByTestId('detail-panel').getByRole('heading', { level: 2, name: batch.file_name })).toBeVisible();
  else if (path === '/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001') {
    await expect(page.getByTestId('detail-panel').getByRole('heading', { level: 2 })).toContainText(/Lần chạy|Run/);
    // The judge section and its columns come with the results: scan them too.
    await expect(page.getByTestId('detail-panel').getByText(/Chưa hiệu chỉnh|Not calibrated/)).toBeVisible();
  }
  else if (path.startsWith('/publish-jobs/')) await expect(page.getByTestId('detail-panel').getByRole('heading', { level: 2 })).toContainText('a3f2c1');
  else if (path.startsWith('/users/')) await expect(page.getByTestId('detail-panel').getByRole('heading', { level: 2 })).toBeVisible();
  else if (path.startsWith('/reports/')) await expect(page.getByTestId('detail-panel').getByRole('heading', { level: 2 })).toBeVisible();
  else if (path === '/ai/configs') {
    await expect(page.getByText(/17\/20/)).toBeVisible();
    await expect(page.getByText(/bank · noun/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^(Xem bản|View revision) 3$/ })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /^(Tôi đã đọc cảnh báo và vẫn publish|I read the warnings and still want to publish)$/ })).toBeVisible();
    await expect(page.getByRole('list', { name: /^(Lịch sử publish|Publish history)$/ })).toBeVisible();
  }
  else if (path === '/ai/judges') await expect(page.getByRole('main').getByText(/Chỉ một đáp án · (bản|revision) 2/).filter({ visible: true })).toBeVisible();
  else if (path.startsWith('/ai/judges/label')) await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toContainText(/Gắn nhãn|Label/);
  else if (path === '/export' || path === '/ai/calls') await expect(page.getByRole('main')).toBeVisible();
  else if (path.startsWith('/senses/')) await expect(page.getByRole('heading', { level: 2, name: 'deploy · verb' })).toBeVisible();
  else if (path.startsWith('/settings')) await expect(page.getByRole('tabpanel').getByRole('heading', { level: 2 })).toBeVisible();
  else await expect(page.locator('tbody tr, [data-testid="card"]').first()).toBeAttached();
}
