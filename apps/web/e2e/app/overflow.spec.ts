import { expect, test, type Page } from '@playwright/test';
import { LONG } from '../support/fixtures';
import { mockApi, problem, signedInAs } from '../support/mock-api';

// Review Focus 2: long content never makes the page scroll sideways (390 px in the mobile project, 1440 in desktop).
async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

const longMe = { given_name: LONG.givenName, family_name: LONG.familyName, email: LONG.email };

for (const locale of ['vi', 'en'] as const) {
  test(`no horizontal scroll on M1 pages with long names (${locale})`, async ({ page }) => {
    await signedInAs(page, 'pro', {}, { ...longMe, native_language: locale });
    for (const path of ['', '/settings', '/settings/account']) {
      await page.goto(`/${locale}/app${path}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await noSideScroll(page);
    }
  });

  test(`no horizontal scroll on the sign-in pages (${locale})`, async ({ page }) => {
    await mockApi(page, { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') });
    for (const path of ['/login', '/register', '/forgot-password', '/reset-password']) {
      await page.goto(`/${locale}/app${path}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await noSideScroll(page);
    }
  });
}
