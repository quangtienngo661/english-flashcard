import { expect, test } from '@playwright/test';
import { copy } from './copy';

// Part 8 constraints: public display type is Bricolage Grotesque Bold 700 (design §3.1 said 800; the "404" and the logo stay 800).
test('H1 renders in Bricolage Grotesque, weight 700, with Vietnamese glyphs', async ({ page }) => {
  await page.goto('/vi');
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    const h1 = document.querySelector('h1');
    if (!h1) return { family: '', weight: '', loaded: false };
    const style = getComputedStyle(h1);
    const family = style.fontFamily.split(',')[0].trim();
    return { family, weight: style.fontWeight, loaded: document.fonts.check(`700 16px ${family}`, 'Ôn từ đúng lúc') };
  });
  expect(result.family).toMatch(/Bricolage Grotesque/);
  expect(result.weight).toBe('700');
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

// The language link left the footer with the English landing (design landing-redesign L4); since M8.4 the footer has no page anchors (Figma 7:209).
test('footer has no language link', async ({ page }) => {
  await page.goto('/vi');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: /english/i })).toHaveCount(0);
});
