import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { problem, signedInAs } from './support/mock-api';

const at = '2026-10-15T02:12:00.000Z';
const ORDER = ['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'];
const model = (over: Record<string, unknown> = {}) => ({
  id: 'm1', provider: 'openai', model_id: 'gpt-x', shutdown_at: null, lifecycle: null, effort_choices: ['low', 'high'], thinking_off_available: true,
  structured_outputs: true, max_output_tokens: 4000, price: null, note: null, info_checked_at: at, used_by: [], estimate: null, ...over,
});
const setting = (operation: string, over: Record<string, unknown> = {}) => ({
  operation, model: null, effort: null, thinking: null, max_output_tokens: null, version: 1, input_fields: [], estimate: null, ...over,
});
const onM1 = { model: { id: 'm1', provider: 'openai', model_id: 'gpt-x' }, effort: 'high', thinking: 'off', max_output_tokens: 800, version: 3 };
const t = vi.ai.operations.row;
const saveName = (op: string) => t.saveFor.replace('{operation}', op);

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Thao tác (A/81)', () => {
  test.use({ locale: 'vi-VN' });

  test('menu → six rows; picking another effort and [Lưu] PUTs the row, toasts, and the page is clean', async ({ page }) => {
    let rows: Array<Record<string, unknown>> = [...ORDER].sort().map((op) => setting(op, op === 'lookup_word' ? onM1 : {}));
    const put: unknown[] = [];
    await signedInAs(page, 'admin', {
      'GET /v1/admin/ai/status': () => ({ json: { operations: [], today: { calls: 0, cap: null, failed_calls: 0, failed_cost_usd: '0', cost_usd: '0', cost_vnd: 0 }, ai_enabled: true, providers: { openai: true, anthropic: false, fake: false } } }),
      'GET /v1/admin/ai/operations': () => ({ json: { items: rows } }),
      'GET /v1/admin/ai/models': () => ({ json: { items: [model()] } }),
      'PUT /v1/admin/ai/operations/lookup_word': (req) => {
        put.push(req.body);
        rows = rows.map((r) => (r.operation === 'lookup_word' ? { ...r, effort: 'low', version: 4 } : r));
        return { json: rows.find((r) => r.operation === 'lookup_word') };
      },
    });
    await page.goto('/ai/status');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiOperations }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiOperations })).toBeVisible();
    await expect(page.getByRole('group', { name: /lookup_word/ })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    const row = page.getByRole('group', { name: /lookup_word/ });
    await row.getByRole('button', { name: new RegExp(`${t.effort}$`) }).click();
    await page.getByRole('option', { name: 'low' }).click();
    await row.getByRole('button', { name: saveName('lookup_word') }).click();
    await expect(page.getByText(t.saved)).toBeVisible();
    expect(put).toEqual([{ expected_version: 3, model_ref: 'm1', effort: 'low', thinking: 'off', max_output_tokens: 800 }]);
    await expect(row.getByRole('button', { name: saveName('lookup_word') })).toBeDisabled();
  });

  test('a dirty row and a nav link ask "Rời trang?"; [Ở lại] keeps the edit, [Rời trang] goes', async ({ page }) => {
    await signedInAs(page, 'admin', {
      'GET /v1/admin/ai/status': () => ({ json: { operations: [], today: { calls: 0, cap: null, failed_calls: 0, failed_cost_usd: '0', cost_usd: '0', cost_vnd: 0 }, ai_enabled: true, providers: { openai: true, anthropic: false, fake: false } } }),
      'GET /v1/admin/ai/operations': () => ({ json: { items: [...ORDER].sort().map((op) => setting(op, op === 'lookup_word' ? onM1 : {})) } }),
      'GET /v1/admin/ai/models': () => ({ json: { items: [model()] } }),
    });
    await page.goto('/ai/operations');
    const row = page.getByRole('group', { name: /lookup_word/ });
    await row.getByRole('button', { name: new RegExp(`${t.effort}$`) }).click();
    await page.getByRole('option', { name: 'low' }).click();
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiStatus }).click();
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialog.getByText(vi.leave.title)).toBeVisible();
    await dialog.getByRole('button', { name: vi.leave.stay }).click();
    await expect(page).toHaveURL(/\/ai\/operations$/);
    await expect(row.getByRole('button', { name: new RegExp(`${t.effort}$`) })).toContainText('low');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiStatus }).click();
    await dialog.getByRole('button', { name: vi.leave.leave }).click();
    await expect(page).toHaveURL(/\/ai\/status$/);
  });

  test('a 409 conflict shows its copy and [Tải lại]; the thinking 400 shows under the Thinking field', async ({ page }) => {
    let mode: 'conflict' | 'thinking' = 'conflict';
    await signedInAs(page, 'admin', {
      'GET /v1/admin/ai/operations': () => ({ json: { items: [...ORDER].sort().map((op) => setting(op, op === 'lookup_word' ? { ...onM1, effort: 'low', thinking: null } : {})) } }),
      'GET /v1/admin/ai/models': () => ({ json: { items: [model()] } }),
      'PUT /v1/admin/ai/operations/lookup_word': () =>
        mode === 'conflict' ? problem(409, 'operation-settings-conflict') : problem(400, 'validation-failed', { violations: ['thinking: off needs effort high or below'] }),
    });
    await page.goto('/ai/operations');
    const row = page.getByRole('group', { name: /lookup_word/ });
    await row.getByRole('button', { name: new RegExp(`${t.effort}$`) }).click();
    await page.getByRole('option', { name: 'high' }).click();
    await row.getByRole('button', { name: saveName('lookup_word') }).click();
    await expect(row.getByText(vi.errors['operation-settings-conflict'])).toBeVisible();
    await expect(row.getByRole('button', { name: saveName('lookup_word') })).toBeDisabled();
    await row.getByRole('button', { name: t.reload }).click();
    await expect(row.getByText(vi.errors['operation-settings-conflict'])).toBeHidden();
    await expect(row.getByRole('button', { name: new RegExp(`${t.effort}$`) })).toContainText('low');

    mode = 'thinking';
    await row.getByRole('button', { name: new RegExp(`${t.thinking}$`) }).click();
    await page.getByRole('option', { name: t.thinkingOff }).click();
    await row.getByRole('button', { name: saveName('lookup_word') }).click();
    await expect(row.getByText(t.thinkingNeedsEffort)).toBeVisible();
  });

  test('an editor sees no menu entry and the page does not call the API', async ({ page }) => {
    let calls = 0;
    await signedInAs(page, 'editor', {
      'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
      'GET /v1/admin/ai/operations': () => {
        calls += 1;
        return { json: { items: [] } };
      },
    });
    await page.goto('/ai/operations');
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    await openNavIfCollapsed(page);
    await expect(page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiOperations })).toHaveCount(0);
    expect(calls).toBe(0);
  });
});
