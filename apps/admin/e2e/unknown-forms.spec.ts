import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { requests, signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const t = vi.unknownForms;
const LIST = '/v1/admin/practice/unknown-forms';
const row = { id: 'f-1', lemma_key: 'go', form: 'went', rejected_count: 3, first_seen_at: '2026-10-10T08:00:00.000Z', last_seen_at: '2026-10-20T09:30:00.000Z' };
const base = { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) };

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Dạng chia chưa biết (A/77)', () => {
  test('editor: menu → list → accept shows the toast → Hoàn tác deletes it and the row comes back; axe clean', async ({ page }) => {
    let accepted = false;
    await signedInAs(page, 'editor', {
      ...base,
      [`GET ${LIST}`]: () => ({ json: { items: accepted ? [] : [row], next_page_token: null } }),
      'POST /v1/admin/content/word-forms': () => {
        accepted = true;
        return { status: 201, json: { id: 'wf-1', lemma_key: 'go', form: 'went' } };
      },
      'DELETE /v1/admin/content/word-forms/wf-1': () => {
        accepted = false;
        return { status: 204 };
      },
    });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.unknownForms }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.unknownForms })).toBeVisible();
    await expect(page.getByText('went').filter({ visible: true }).first()).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByRole('button', { name: t.acceptFor.replace('{form}', 'went').replace('{lemma}', 'go') }).filter({ visible: true }).first().click();
    await expect(page.getByText('Đã thêm “went” vào dạng chia của “go”.')).toBeVisible();
    await expect(page.getByText(t.empty)).toBeVisible();
    await page.getByRole('button', { name: t.undo }).click();
    await expect.poll(() => requests(page, 'DELETE', '/v1/admin/content/word-forms/wf-1').length).toBe(1);
    await expect(page.getByText('went').filter({ visible: true }).first()).toBeVisible();
  });
});
