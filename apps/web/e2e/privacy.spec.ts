import { expect, test } from '@playwright/test';
import { copy } from './copy';
import { PUBLISHED } from './support/published';

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
  await expect(page.getByRole('main')).toContainText('contact@wordmet.com');
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

  await page.goto('/en/sources');
  await expect(page.getByRole('heading', { level: 1, name: 'Data sources' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('There are no data sources to show yet.');
});

// M8.7 with a published text (support/public-api.mjs, version '3' effective 2026-11-01): the meta line, the contents of the `##` headings,
// the article and the help box; the draft notice is gone.
test('a published Privacy page shows its version, contents, article and help box', async ({ page }) => {
  await page.goto(`${PUBLISHED}/vi/privacy`);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1, name: copy.vi.Legal.privacyTitle })).toBeVisible();
  await expect(main.getByText('Phiên bản 3 · Có hiệu lực từ 01/11/2026', { exact: true })).toBeVisible();
  await expect(main.getByText(copy.vi.Legal.draftNotice)).toHaveCount(0);
  await expect(main.getByRole('heading', { level: 2, name: '3. Chia sẻ dữ liệu với ai' })).toBeVisible();
  await expect(main.getByRole('heading', { level: 3, name: 'Email nhắc ôn' })).toBeVisible();
  await expect(main.getByRole('link', { name: 'payOS' })).toHaveAttribute('href', 'https://payos.vn');
  const help = main.getByRole('region', { name: copy.vi.Legal.privacyHelpTitle });
  await expect(help.getByRole('link', { name: 'support@wordmet.com' })).toHaveAttribute('href', 'mailto:support@wordmet.com');
});

test('the published Terms page names its scope from md up and has its own help box', async ({ page }, testInfo) => {
  await page.goto(`${PUBLISHED}/vi/terms`);
  const scope = page.getByText(`· ${copy.vi.Legal.termsScope}`);
  if (testInfo.project.name === 'desktop') await expect(scope).toBeVisible();
  else await expect(scope).toBeHidden();
  await expect(page.getByRole('region', { name: copy.vi.Legal.termsHelpTitle })).toBeVisible();
});

test('the data sources page lists each published source, with a link only where it has an address', async ({ page }) => {
  await page.goto(`${PUBLISHED}/vi/sources`);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 2, name: '3 nguồn đang dùng' })).toBeVisible();
  await expect(main.getByRole('heading', { level: 3 })).toHaveText(['CEFR-J Wordlist', 'Octanove Vocabulary Profile', 'AGID']);
  await expect(main.getByRole('link', { name: new RegExp(`^${copy.vi.Sources.link}`) })).toHaveCount(2);
  await expect(main.getByText('Phiên bản 2016.01.19', { exact: true })).toBeVisible();
  await expect(main.getByText(copy.vi.Sources.empty)).toHaveCount(0);
});
