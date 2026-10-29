import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { signedInAs } from './support/mock-api';

const OPS = ['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'];
const status = (over: Record<string, unknown> = {}) => ({
  operations: OPS.map((operation) => ({
    operation, ready: false, reason: 'model-not-set', model: null, effort: null, thinking: null, max_output_tokens: null,
    last_error: null, model_warning: null,
  })),
  today: { calls: 0, cap: 3000, failed_calls: 0, failed_cost_usd: '0.0000', cost_usd: '0.0000', cost_vnd: 0 },
  ai_enabled: true,
  providers: { openai: false, anthropic: false, fake: true },
  ...over,
});
const uploads = { json: { items: [], next_page_token: null } };

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Tình trạng (A/84)', () => {
  test.use({ locale: 'vi-VN' });

  test('admin: menu → six "Chưa sẵn sàng · Chưa chọn model" rows → [Chọn model] opens Cấu hình of that operation; axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', {
      'GET /v1/admin/content/uploads': () => uploads,
      'GET /v1/admin/ai/status': () => ({ json: status() }),
    });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiStatus }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiStatus })).toBeVisible();
    await expect(page.getByText('Lời gọi hôm nay: 0/3.000')).toBeVisible();
    await expect(page.getByText('Chưa chọn model').filter({ visible: true })).toHaveCount(6);
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByRole('link', { name: /Chọn model/ }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/ai\/configs\?op=generate_cloze$/);
  });

  test('AI off: the head says so and links to the settings AI tab', async ({ page }) => {
    await signedInAs(page, 'admin', {
      'GET /v1/admin/ai/status': () => ({ json: status({ ai_enabled: false, operations: status().operations.map((o) => ({ ...o, reason: 'ai-disabled' })) }) }),
    });
    await page.goto('/ai/status');
    await expect(page.getByText('AI toàn hệ thống: Đang tắt')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mở Cài đặt' })).toHaveAttribute('href', '/settings?tab=ai');
    await expect(page.getByText('AI đang tắt').filter({ visible: true })).toHaveCount(6);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('editor: no AI menu entry, and /ai/status shows the no-access view without calling the API', async ({ page }) => {
    let calls = 0;
    await signedInAs(page, 'editor', {
      'GET /v1/admin/content/uploads': () => uploads,
      'GET /v1/admin/ai/status': () => {
        calls += 1;
        return { json: status() };
      },
    });
    await page.goto('/ai/status');
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    await openNavIfCollapsed(page);
    await expect(page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiStatus })).toHaveCount(0);
    expect(calls).toBe(0);
  });
});
