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

// Since 14/11/2026 both landings exist, so the footer links to the other one (design landing-redesign L4 reversed); it has no page anchors (Figma 7:209).
test('footer links to the other language, marked with its own lang', async ({ page }) => {
  await page.goto('/vi');
  const link = page.getByRole('contentinfo').getByRole('link', { name: copy.vi.Footer.otherLanguage, exact: true });
  await expect(link).toHaveAttribute('href', '/en');
  await expect(link).toHaveAttribute('lang', 'en');
  await page.goto('/en');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: copy.en.Footer.otherLanguage, exact: true })).toHaveAttribute('href', '/vi');
});
