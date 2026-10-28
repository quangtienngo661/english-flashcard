import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
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
  output_tokens: 0, reasoning_tokens: 0, cost_usd: '0.00010000', cost_known: true, created_at: at,
  content: { request: { messages: ['hi'] }, response: '{"sentence":"I ___ home."}', expires_at: '2026-10-25T10:00:00.000Z' }, ...over,
});
const uploads: Record<string, MockHandler> = { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) };

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Chi phí (A/85)', () => {
  test.use({ locale: 'vi-VN' });

  test('menu → totals; picking a group asks again; a range over 366 days is stopped before any request; axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...uploads,
      'GET /v1/admin/ai/costs': (req) => ({ json: costs(req.query.get('group_by') === 'model' ? 'openai/gpt-x' : '2026-10-15') }),
    });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiCosts }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiCosts })).toBeVisible();
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
    await page.goto('/ai/costs?from=2026-10-01&to=2026-10-02');
    await expect(page.getByText(c.errors.fromAfterTo)).toBeVisible();
    await expect(page.getByLabel(c.filters.from)).toHaveAttribute('aria-invalid', 'true');
  });

  test('editor: no menu entry, and /ai/costs shows the no-access view without calling the API', async ({ page }) => {
    await signedInAs(page, 'editor', { ...uploads, 'GET /v1/admin/ai/costs': () => ({ json: costs() }) });
    await page.goto('/ai/costs');
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
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
