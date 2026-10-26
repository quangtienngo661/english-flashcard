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

// Audit 26/10/2026 #1, #11: a 60-character deck name with no space must not widen the page.
const DECK = '55555555-5555-4555-8555-555555555555';
const UNBROKEN = LONG.unbrokenDeckName;

test('no horizontal scroll on the deck page with an unbroken 60-character name (vi)', async ({ page }) => {
  const summary = { id: DECK, name: UNBROKEN, version: 1, total: 2, today: { priority: 0, due: 2, new: 0 }, cells: [0, 1, 2, 3, 4, 5].map((level) => ({ level, total: level === 1 ? 2 : 0, due: level === 1 ? 2 : 0 })), backlog: 0 };
  await signedInAs(page, 'pro', {
    'GET /v1/groups': () => ({ json: { items: [summary] } }),
    [`GET /v1/groups/${DECK}`]: () => ({ json: { id: DECK, name: UNBROKEN, version: 1, item_count: 2, removable_items: 0, created_at: '2026-10-01T03:00:00Z', updated_at: '2026-10-01T03:00:00Z' } }),
    [`GET /v1/groups/${DECK}/queue`]: () => ({ json: { cards: [] } }),
    [`GET /v1/groups/${DECK}/items`]: () => ({ json: { items: [], next_page_token: null } }),
  });
  await page.goto(`/vi/app/group?id=${DECK}`);
  await expect(page.getByRole('heading', { level: 1, name: UNBROKEN })).toBeVisible();
  await noSideScroll(page);
});

