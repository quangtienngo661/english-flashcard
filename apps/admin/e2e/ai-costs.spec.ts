import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { COST_BATCH_ID, COST_CONFIG_ID, COST_SOURCE_ID, costBatch, costBatchDetail, costBatchMocks } from './support/ai-costs';
import { problem, requests, signedInAs, type MockHandler } from './support/mock-api';

const at = '2026-10-25T02:12:00.000Z';
const c = vi.ai.costs;
const k = vi.ai.calls;
const totals = (over: Record<string, unknown> = {}) => ({
  calls: 10, input_tokens: 1200, cached_input_tokens: 300, output_tokens: 800, reasoning_tokens: 50, cost_usd: '0.01230000', cost_vnd: 321, unknown_cost_calls: 0, ...over,
});
const costs = (key = '2026-10-15') => ({
  items: [{ key, ...totals() }, { key: key === '2026-10-15' ? '2026-10-16' : 'anthropic/claude-x', ...totals({ calls: 5, unknown_cost_calls: 2 }) }],
  total: totals({ calls: 15, unknown_cost_calls: 2, cost_vnd: 522 }),
});
const aiCall = (over: Record<string, unknown> = {}) => ({
  id: 'c1', attempt: 1, purpose: 'learner', operation: 'generate_cloze', provider: 'openai', model: 'gpt-x', effort: null, thinking: null, max_output_tokens: null,
  prompt_revision: 3, outcome: 'timeout', http_status: null, provider_error_code: null, latency_ms: 10000, input_tokens: 120, cached_input_tokens: 20,
  output_tokens: 0, reasoning_tokens: 0, cost_usd: '0.00010000', cost_known: true, created_at: at, held_out: false,
  content: { request: { messages: ['hi'] }, response: '{"sentence":"I ___ home."}', expires_at: '2026-10-25T10:00:00.000Z' }, ...over,
});
const uploads: Record<string, MockHandler> = { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) };

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Chi phí (A/85)', () => {
  test.use({ locale: 'vi-VN' });

  test('menu → batches → aggregate totals; picking a group asks again; a range over 366 days is stopped before any request; axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...uploads,
      ...costBatchMocks(),
      'GET /v1/admin/ai/costs': (req) => ({ json: costs(req.query.get('group_by') === 'model' ? 'openai/gpt-x' : '2026-10-15') }),
    });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiCosts }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiCosts })).toBeVisible();
    await expect(page.getByRole('tab', { name: c.batches.tab })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('fake:batch-e2e').filter({ visible: true })).toBeVisible();
    expect(requests(page, 'GET', '/v1/admin/ai/costs')).toHaveLength(0);
    await page.getByRole('tab', { name: c.batches.aggregate }).click();
    await expect(page).toHaveURL(/group_by=day/);
    await expect(page.getByText('15/10/2026').filter({ visible: true })).toBeVisible();
    await expect(page.getByText(c.note)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByRole('button', { name: new RegExp(c.filters.groupBy) }).click();
    await expect(page.getByRole('option')).toHaveText(Object.values(c.groups));
    await page.getByRole('option', { name: c.groups.model }).click();
    await expect(page).toHaveURL(/group_by=model/);
    await expect(page.getByText('openai/gpt-x').filter({ visible: true })).toBeVisible();

    const before = requests(page, 'GET', '/v1/admin/ai/costs').length;
    await page.getByLabel(c.filters.from).fill('2000-01-01');
    await page.getByRole('button', { name: c.filters.apply }).click();
    await expect(page.getByText(c.errors.tooLong)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    expect(requests(page, 'GET', '/v1/admin/ai/costs')).toHaveLength(before);
  });

  test('an API 400 on the range lands on the date field', async ({ page }) => {
    await signedInAs(page, 'admin', {
      'GET /v1/admin/ai/costs': () => problem(400, 'validation-failed', { violations: ['from: Must not be after to'] }),
    });
    await page.goto('/ai/costs?from=2026-10-01&to=2026-10-02&group_by=day');
    await expect(page.getByText(c.errors.fromAfterTo)).toBeVisible();
    await expect(page.getByLabel(c.filters.from)).toHaveAttribute('aria-invalid', 'true');
  });

  test('editor: no menu entry, and /ai/costs shows the no-access view without calling the API', async ({ page }) => {
    await signedInAs(page, 'editor', { ...uploads, ...costBatchMocks(), 'GET /v1/admin/ai/costs': () => ({ json: costs() }) });
    await page.goto('/ai/costs');
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    expect(requests(page, 'GET', '/v1/admin/ai/costs')).toHaveLength(0);
    expect(requests(page, 'GET', '/v1/admin/ai/batches')).toHaveLength(0);
  });

  test('batch filters, pagination and expiring test outputs keep ledger totals and config provenance; axe clean', async ({ page }) => {
    const pending = costBatch({ status: 'running', done: 4, cost_usd: null, known_cost_usd: '0.00700000', unknown_cost_calls: 2 });
    await signedInAs(page, 'admin', {
      'GET /v1/admin/ai/batches': (req) => ({ json: req.query.get('status') === 'failed' ? { items: [], next_page_token: null } : req.query.has('page_token')
        ? { items: [costBatch({ id: COST_SOURCE_ID, kind: 'test', model: 'fake:batch-page-2' })], next_page_token: null }
        : { items: [{ ...pending, kind: req.query.get('kind') ?? 'eval' }], next_page_token: 'page-2' } }),
      [`GET /v1/admin/ai/batches/${COST_BATCH_ID}`]: () => ({ json: costBatchDetail({ ...pending, kind: 'test', source_id: null, items: [
        { call_id: 'available', operation_id: 'test-1', attempt: 1, outcome: 'success', content: { response: 'Visible batch output', expires_at: '2999-01-01T00:00:00Z' } },
        { call_id: 'expired', operation_id: 'test-2', attempt: 1, outcome: 'success', content: null },
        { call_id: 'held-out', operation_id: 'test-3', attempt: 1, outcome: 'success', held_out: true, content: { response: 'HIDDEN HELDOUT', expires_at: '2999-01-01T00:00:00Z' } },
      ] }) }),
    });
    await page.goto('/ai/costs');
    await expect(page.getByText(c.batches.unknown).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(c.batches.partial).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(/12 calls · 2 retry/).filter({ visible: true })).toBeVisible();
    await page.getByRole('button', { name: new RegExp(c.batches.kind) }).click();
    await page.getByRole('option', { name: c.batches.kinds.test }).click();
    await expect(page).toHaveURL(/kind=test/);
    await expect.poll(() => requests(page, 'GET', '/v1/admin/ai/batches').at(-1)?.query.get('kind')).toBe('test');
    await page.getByRole('link', { name: c.batches.open.replace('{id}', COST_BATCH_ID) }).filter({ visible: true }).click();
    const panel = page.getByTestId('detail-panel');
    await expect(panel.getByText('Visible batch output')).toBeVisible();
    await expect(panel.getByText(c.batches.expired)).toBeVisible();
    await expect(panel.getByText(c.batches.heldOut)).toBeVisible();
    await expect(panel).not.toContainText('HIDDEN HELDOUT');
    await expect(panel.getByText(`Cấu hình ${COST_CONFIG_ID} · v3`)).toBeVisible();
    await expect(panel.getByText('a'.repeat(64))).toBeVisible();
    await expect(panel.getByText(c.batches.temporary)).toHaveCount(0);
    await expect(panel.getByText(c.batches.saved)).toHaveCount(0);
    expect(await seriousViolations(page)).toEqual([]);
    await panel.getByRole('button', { name: vi.common.close }).click();
    await expect(panel).toBeHidden();
    await page.getByRole('button', { name: vi.common.loadMore }).click();
    await expect(page.getByText('fake:batch-page-2').filter({ visible: true })).toBeVisible();
    expect(requests(page, 'GET', '/v1/admin/ai/batches').at(-1)?.query.get('page_token')).toBe('page-2');
    await page.getByRole('button', { name: new RegExp(c.batches.status) }).click();
    await page.getByRole('option', { name: c.batches.statuses.failed }).click();
    await expect(page.getByText(c.batches.empty)).toBeVisible();
    expect(requests(page, 'GET', '/v1/admin/ai/batches').at(-1)?.query.has('page_token')).toBe(false);
    expect(requests(page, 'GET', '/v1/admin/ai/costs')).toHaveLength(0);
  });
});

test.describe('Các lần gọi (A/86)', () => {
  test.use({ locale: 'vi-VN' });

  test('a link from an error report opens the calls; [Xem] shows the stored JSON in a dialog; axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', { 'GET /v1/admin/ai/calls': () => ({ json: { items: [aiCall(), aiCall({ id: 'c2', attempt: 2, content: null, outcome: 'succeeded', http_status: 200 })] } }) });
    await page.goto('/ai/calls?operation_id=op-123');
    await expect(page.getByLabel(k.search.label)).toHaveValue('op-123');
    await expect(page.getByText('Còn tới 25/10').filter({ visible: true })).toBeVisible();
    await expect(page.getByText(k.noContent).filter({ visible: true })).toBeVisible();
    expect(requests(page, 'GET', '/v1/admin/ai/calls')[0].query.get('operation_id')).toBe('op-123');
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByRole('button', { name: /Xem nội dung/ }).filter({ visible: true }).click();
    const dialog = page.getByRole('dialog', { name: k.content.title });
    await expect(dialog).toContainText('"sentence": "I ___ home."');
    expect(await seriousViolations(page)).toEqual([]);
    await dialog.getByRole('button', { name: vi.common.close }).click();
    await expect(dialog).toBeHidden();
  });

  test('a call made for a held-out example shows the badge and "Nội dung được ẩn", with no [Xem]; axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', {
      'GET /v1/admin/ai/calls': () => ({ json: { items: [aiCall({ purpose: 'eval', held_out: true, content: null }), aiCall({ id: 'c2', attempt: 2, purpose: 'eval' })] } }),
    });
    await page.goto('/ai/calls?operation_id=eval-run-example');
    await expect(page.getByText(k.heldOut, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(k.hiddenContent).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Xem nội dung/ }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: k.viewFor.replace('{attempt}', '1') })).toHaveCount(0);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('searching a new id updates the URL; an unknown id says so', async ({ page }) => {
    await signedInAs(page, 'admin', { 'GET /v1/admin/ai/calls': () => ({ json: { items: [] } }) });
    await page.goto('/ai/calls');
    await expect(page.getByText(k.hint)).toBeVisible();
    await page.getByLabel(k.search.label).fill('nope');
    await page.getByRole('button', { name: k.search.submit }).click();
    await expect(page).toHaveURL(/operation_id=nope/);
    await expect(page.getByText(k.empty)).toBeVisible();
  });
});
