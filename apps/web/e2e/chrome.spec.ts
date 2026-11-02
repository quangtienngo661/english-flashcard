import { expect, test } from '@playwright/test';
import { copy } from './copy';

test('Review#1 H1 renders in Lexend with Vietnamese glyphs', async ({ page }) => {
  await page.goto('/vi');
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    const h1 = document.querySelector('h1');
    if (!h1) return { family: '', loaded: false };
    const family = getComputedStyle(h1).fontFamily.split(',')[0].trim();
    return { family, loaded: document.fonts.check(`16px ${family}`, h1.textContent ?? '') };
  });
  expect(result.family).toMatch(/Lexend/);
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
  await page.goto('/vi');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: copy.vi.Footer.contact })).toHaveAttribute('href', /^mailto:/);
});

// The language link left the footer with the English landing (design landing-redesign L4); the footer keeps page anchors and the contact.
test('footer has no language link and its anchors point at the page', async ({ page }) => {
  await page.goto('/vi');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: /english/i })).toHaveCount(0);
  await expect(footer.getByRole('link', { name: copy.vi.Landing.footer.plans })).toHaveAttribute('href', '#goi');
  await expect(footer.getByRole('link', { name: copy.vi.Landing.footer.faq })).toHaveAttribute('href', '#hoi-dap');
});
