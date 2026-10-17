import { expect, test } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { meBody, mockApi, problem, signedInAs, tokenBody } from './support/mock-api';
import { seriousViolations } from './support/axe';

test.use({ locale: 'vi-VN' });

const login = vi.account.login;

test('Review Focus 4: signed-out deep link /uploads/abc → /login → after login lands on /uploads/abc', async ({ page }) => {
  let signedIn = false;
  await mockApi(page, {
    'POST /v1/auth/refresh': () => (signedIn ? tokenBody() : problem(401, 'invalid-token')),
    'POST /v1/auth/login': () => {
      signedIn = true;
      return tokenBody();
    },
    'GET /v1/me': () => ({ json: meBody('editor') }),
  });

  await page.goto('/uploads/abc');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel(login.email).fill('editor@wordmet.com');
  await page.getByLabel(login.password).fill('Abcdef1!x');
  await page.getByRole('button', { name: login.submit }).click();

  await expect(page).toHaveURL(/\/uploads\/abc$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi.nav.uploads);
});

test('B25#2 (e2e): a verified user without a role is logged out and sees the no-access notice on /login', async ({ page }) => {
  let logouts = 0;
  await mockApi(page, {
    'POST /v1/auth/refresh': () => problem(401, 'invalid-token'),
    'POST /v1/auth/login': () => tokenBody(),
    'GET /v1/me': () => ({ json: meBody('editor', { staff_role: null, permissions: [] }) }),
    'POST /v1/auth/logout': () => {
      logouts += 1;
      return { status: 204 };
    },
  });
  await page.goto('/login');
  await page.getByLabel(login.email).fill('learner@wordmet.com');
  await page.getByLabel(login.password).fill('Abcdef1!x');
  await page.getByRole('button', { name: login.submit }).click();

  await expect(page.getByRole('alert')).toContainText(vi.errors.noAccess);
  await expect(page).toHaveURL(/\/login$/);
  expect(logouts).toBe(1);
});

test('B25#27 (e2e): while the password must be changed every path leads to /change-password; after the change the app opens', async ({ page }) => {
  let changed = false;
  await mockApi(page, {
    'POST /v1/auth/refresh': () => tokenBody(),
    'GET /v1/me': () => ({ json: meBody('editor', { must_change_password: !changed }) }),
    'POST /v1/auth/password/change': () => {
      changed = true;
      return tokenBody('e2e-token-2');
    },
    'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
  });

  await page.goto('/uploads');
  await expect(page).toHaveURL(/\/change-password$/);
  await page.goto('/login');
  await expect(page).toHaveURL(/\/change-password$/);

  const t = vi.account.changePassword;
  await page.getByLabel(t.current).fill('generated');
  await page.getByLabel(t.new, { exact: true }).fill('Abcdef1!x');
  await page.getByLabel(t.confirm).fill('Abcdef1!x');
  await page.getByRole('button', { name: t.submit }).click();

  await expect(page).toHaveURL(/\/uploads$/);
});

test('B25#21: the account screens have no serious or critical axe violations (390 and 1440)', async ({ page }) => {
  let signedIn = false;
  await mockApi(page, {
    'POST /v1/auth/refresh': () => (signedIn ? tokenBody() : problem(401, 'invalid-token')),
    'POST /v1/auth/otp': () => ({ status: 204 }),
    'GET /v1/me': () => ({ json: meBody('editor', { must_change_password: true }) }),
  });
  const serious = () => seriousViolations(page);

  await page.goto('/login');
  await expect(page.getByLabel(login.email)).toBeVisible();
  expect(await serious()).toEqual([]);

  await page.getByRole('link', { name: login.forgot }).click();
  await expect(page.getByLabel(vi.account.forgot.email)).toBeVisible();
  expect(await serious()).toEqual([]);

  await page.getByLabel(vi.account.forgot.email).fill('ten@wordmet.com');
  await page.getByRole('button', { name: vi.account.forgot.send }).click();
  await page.getByLabel(vi.account.forgot.newPassword).fill('abc');
  await page.getByRole('button', { name: vi.account.forgot.submit }).click();
  await expect(page.getByText(vi.account.passwordRules.uppercase)).toBeVisible();
  expect(await serious()).toEqual([]);

  signedIn = true;
  await page.goto('/change-password');
  await expect(page.getByLabel(vi.account.changePassword.current)).toBeVisible();
  await page.getByLabel(vi.account.changePassword.new, { exact: true }).fill('abc');
  await page.getByRole('button', { name: vi.account.changePassword.submit }).click();
  await expect(page.getByText(vi.account.passwordRules.min_length)).toBeVisible();
  expect(await serious()).toEqual([]);
});

test('UBC17 a 429 on the first refresh shows the retry countdown, then the app opens /uploads (B25E30)', async ({ page }) => {
  let refreshes = 0;
  await signedInAs(page, 'editor', {
    'POST /v1/auth/refresh': () =>
      ++refreshes === 1
        ? { status: 429, headers: { 'content-type': 'application/problem+json', 'retry-after': '2' }, json: { type: 'http://localhost:3000/problems/rate-limited', status: 429, title: 'x' } }
        : { json: { access_token: 'e2e-token', token_type: 'Bearer', expires_in: 900 } },
    'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
  });
  await page.goto('/uploads');
  // The countdown is a timer beside the live status line, not inside it (review M7).
  await expect(page.getByRole('timer')).toHaveText(/Thử lại sau [12] giây/);
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.uploads })).toBeVisible({ timeout: 6000 });
  await expect(page).toHaveURL(/\/uploads$/);
  expect(refreshes).toBe(2);
});
