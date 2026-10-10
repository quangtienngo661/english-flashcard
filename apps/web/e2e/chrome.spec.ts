import { expect, test } from '@playwright/test';
import { copy } from './copy';

test('Review#1 H1 renders in Be Vietnam Pro with Vietnamese glyphs', async ({ page }) => {
  await page.goto('/vi');
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    const h1 = document.querySelector('h1');
    if (!h1) return { family: '', loaded: false };
    const family = getComputedStyle(h1).fontFamily.split(',')[0].trim();
    return { family, loaded: document.fonts.check(`16px ${family}`, h1.textContent ?? '') };
  });
  expect(result.family).toMatch(/Vietnam/);
  expect(result.loaded).toBe(true);
});

test('skip link moves focus to main', async ({ page }) => {
  await page.goto('/vi');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: copy.vi.Nav.skipToContent });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});

test('footer contact is a mailto link', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Contact' })).toHaveAttribute('href', /^mailto:/);
});

test('footer language link keeps the current page', async ({ page }) => {
  await page.goto('/vi/privacy');
  await page.getByRole('contentinfo').getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
});
