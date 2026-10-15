import { expect, test } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const uploads = {
  json: { items: [{ id: 'b1', status: 'succeeded', file_name: 'one.csv', row_count: 3, created_at: '2026-10-14T09:30:00.000Z' }], next_page_token: null },
};

/** The first check of the real colours in a browser (as-built landing, "Còn mở / Cho plan admin" 3). */
test('UBC1 admin paints with the package palette and Lexend', async ({ page }) => {
  await signedInAs(page, 'editor', { 'GET /v1/admin/content/uploads': () => uploads });
  await page.goto('/uploads');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi.nav.uploads);

  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(241, 243, 253)');
  await expect(page.getByRole('button', { name: vi.uploads.upload })).toHaveCSS('background-color', 'rgb(36, 69, 214)');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-family', /^"?Lexend/);
  await expect(page.locator('link[href*="family=Lexend"]')).toHaveCount(1);
  await expect(page.locator('link[href*="Be+Vietnam"]')).toHaveCount(0);
});
