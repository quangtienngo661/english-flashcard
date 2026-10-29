import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { problem, signedInAs } from './support/mock-api';

const at = '2026-10-15T02:12:00.000Z';
const model = (over: Record<string, unknown> = {}) => ({
  id: 'm1', provider: 'openai', model_id: 'gpt-test', shutdown_at: null, lifecycle: null, effort_choices: [], thinking_off_available: false,
  structured_outputs: true, max_output_tokens: null, price: { input: '2.5000', cached_input: null, output: '10.0000' }, note: null, info_checked_at: at,
  used_by: [], estimate: { per_call_usd: '0.0065', per_call_vnd: 169, per_day_1000_vnd: 169000, max_call_usd: null, max_call_vnd: null }, ...over,
});
const status = (providers = { openai: true, anthropic: false, fake: true }) => ({
  operations: [], today: { calls: 0, cap: null, failed_calls: 0, failed_cost_usd: '0', cost_usd: '0', cost_vnd: 0, admin_cost_usd: '0', admin_usd_cap: null }, ai_enabled: true, providers,
});
const t = vi.ai.models;

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Model (A/80)', () => {
  test.use({ locale: 'vi-VN' });

  test('menu → list; [Thêm model] offers only providers with a key, posts, and the list shows the new model', async ({ page }) => {
    let rows = [model()];
    const posted: unknown[] = [];
    await signedInAs(page, 'admin', {
      'GET /v1/admin/ai/status': () => ({ json: status() }),
      'GET /v1/admin/ai/models': () => ({ json: { items: rows } }),
      'POST /v1/admin/ai/models': (req) => {
        posted.push(req.body);
        rows = [...rows, model({ id: 'm2', model_id: 'gpt-new', price: null, estimate: null })];
        return { status: 201, json: rows[1] };
      },
    });
    await page.goto('/ai/status');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiModels }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiModels })).toBeVisible();
    await expect(page.getByText('OpenAI · gpt-test').filter({ visible: true })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByRole('button', { name: t.add }).filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel(t.form.modelId)).toBeVisible();
    await dialog.getByRole('button', { name: new RegExp(t.form.provider) }).click();
    await expect(page.getByRole('option')).toHaveText(['OpenAI', 'Fake']);
    await page.getByRole('option', { name: 'OpenAI' }).click();
    await dialog.getByLabel(t.form.modelId).fill('gpt-new');
    expect(await seriousViolations(page)).toEqual([]);
    await dialog.getByRole('button', { name: t.form.submitAdd }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/ai\/models$/);
    expect(posted).toEqual([{ provider: 'openai', model_id: 'gpt-new', price_input: null, price_cached_input: null, price_output: null, note: null }]);
    await expect(page.getByText('OpenAI · gpt-new').filter({ visible: true })).toBeVisible();
    await expect(page.getByText(t.noPrice).filter({ visible: true })).toBeVisible();
  });

  test('a price edit with a bad value keeps focus on the field; a good one is PATCHed', async ({ page }) => {
    const patched: unknown[] = [];
    await signedInAs(page, 'admin', {
      'GET /v1/admin/ai/models': () => ({ json: { items: [model()] } }),
      'PATCH /v1/admin/ai/models/m1': (req) => {
        patched.push(req.body);
        return { json: model() };
      },
    });
    await page.goto('/ai/models');
    await page.getByRole('link', { name: t.editPriceFor.replace('{model}', 'gpt-test') }).filter({ visible: true }).click();
    const dialog = page.getByRole('dialog');
    const input = dialog.getByLabel(t.form.priceInput);
    await input.fill('abc');
    await dialog.getByRole('button', { name: t.form.submitSave }).click();
    await expect(dialog.getByText(t.form.priceInvalid)).toBeVisible();
    await expect(input).toBeFocused();
    expect(await seriousViolations(page)).toEqual([]);
    await input.fill('3,25');
    await dialog.getByRole('button', { name: t.form.submitSave }).click();
    await expect(dialog).toBeHidden();
    expect(patched).toEqual([{ price_input: 3.25, price_cached_input: null, price_output: 10, note: null }]);
  });

  test('deleting a model an operation uses: confirm, then the sentence with the operation names; the model stays', async ({ page }) => {
    await signedInAs(page, 'admin', {
      'GET /v1/admin/ai/models': () => ({ json: { items: [model({ used_by: ['generate_cloze'] })] } }),
      'DELETE /v1/admin/ai/models/m1': () => problem(409, 'model-in-use'),
    });
    await page.goto('/ai/models');
    await page.getByRole('button', { name: t.deleteFor.replace('{model}', 'gpt-test') }).filter({ visible: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: t.deleteTitle.replace('{model}', 'gpt-test') })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await dialog.getByRole('button', { name: t.deleteConfirm }).click();
    await expect(page.getByText(/Model đang được thao tác dùng, chưa xóa được\./)).toBeVisible();
    await expect(page.getByText(/Thao tác đang dùng: Sinh câu điền từ\./)).toBeVisible();
    await expect(page.getByText('OpenAI · gpt-test').filter({ visible: true })).toBeVisible();
  });

  test('editor: no Model menu entry, and /ai/models shows the no-access view without calling the API', async ({ page }) => {
    let calls = 0;
    await signedInAs(page, 'editor', {
      'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
      'GET /v1/admin/ai/models': () => {
        calls += 1;
        return { json: { items: [] } };
      },
    });
    await page.goto('/ai/models');
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    await openNavIfCollapsed(page);
    await expect(page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiModels })).toHaveCount(0);
    expect(calls).toBe(0);
  });
});
