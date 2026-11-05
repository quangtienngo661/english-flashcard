import { expect, test } from '@playwright/test';

// The footer links to the legal pages again (owner, 04/11/2026; they were hidden from 09/10/2026). The pages show the text an admin
// published, or the draft notice while the API is unreachable or nothing is published, as here.
test('the footer links to the Terms and Privacy pages, and the link opens the page', async ({ page }) => {
  await page.goto('/vi');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Điều khoản sử dụng' })).toHaveAttribute('href', '/vi/terms');
  await expect(footer.getByRole('link', { name: 'Chính sách bảo mật' })).toHaveAttribute('href', '/vi/privacy');
  await footer.getByRole('link', { name: 'Chính sách bảo mật' }).click();
  await expect(page).toHaveURL(/\/vi\/privacy$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Chính sách bảo mật' })).toBeVisible();
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

// Owner 05/11/2026: the licences of CEFR-J, Octanove and AGID ask for credit where learners can see it, so the footer links to the
// public data sources page. The e2e build has no API behind it, so the page shows its "nothing to show" sentence and no error.
test('the footer links to the data sources page, which opens in Vietnamese and in English without an API', async ({ page }) => {
  await page.goto('/vi');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Nguồn dữ liệu' })).toHaveAttribute('href', '/vi/sources');
  await footer.getByRole('link', { name: 'Nguồn dữ liệu' }).click();
  await expect(page).toHaveURL(/\/vi\/sources$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Nguồn dữ liệu' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Hiện chưa có nguồn dữ liệu nào để hiển thị.');
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.goto('/en/sources');
  await expect(page.getByRole('heading', { level: 1, name: 'Data sources' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('There are no data sources to show yet.');
});
