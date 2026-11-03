import { expect, test } from '@playwright/test';

// Legal links are hidden until launch (owner, 09/10/2026); the pages still exist at their URLs.
// When the links come back: delete the first test and add one that opens /vi/privacy from the footer.
test('legal links are hidden: no Privacy/Terms link in the footer', async ({ page }) => {
  await page.goto('/vi');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Chính sách bảo mật' })).toHaveCount(0);
  await expect(footer.getByRole('link', { name: 'Điều khoản sử dụng' })).toHaveCount(0);
});

// The old policy described only the launch-notice list, which no longer exists (design landing-redesign L2), so /privacy is a draft
// notice until the real text is written (docs/preparation/LEGAL_AND_PILOT_RESEARCH_2026-11-02.md). It must not add its own robots override.
test('privacy page follows the site robots setting and names the contact address', async ({ page }) => {
  // e2e builds without NEXT_PUBLIC_INDEXABLE, so the whole site is noindex (LP11).
  const robotsOf = async (path: string) => {
    await page.goto(path);
    return page.locator('meta[name="robots"]').getAttribute('content');
  };
  expect(await robotsOf('/vi/privacy')).toBe(await robotsOf('/vi'));
  await page.goto('/vi/privacy');
  await expect(page.getByRole('main')).toContainText('hello@wordmet.com');
});
