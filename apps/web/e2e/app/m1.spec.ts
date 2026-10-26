import { expect, test, type Page } from '@playwright/test';
import { copy } from '../copy';
import { seriousViolations } from '../support/axe';
import { meBody, mockApi, problem, requests, signedInAs, tokenBody } from '../support/mock-api';

const vi = copy.vi.App;
const signedOut = { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') };

test.describe('M1 flows (mocked API)', () => {
  test('sign-up → code → language → Today', async ({ page }) => {
    let profile = meBody({ native_language: null });
    // Like the API (design §4.2): sign-up gives no session; the right code sets the refresh cookie, so later full loads stay signed in.
    let verified = false;
    await mockApi(page, {
      'POST /v1/auth/refresh': () => (verified ? tokenBody() : problem(401, 'invalid-token')),
      'POST /v1/auth/register': () => ({ status: 201, json: { email: 'lan@example.com', verification_required: true } }),
      'GET /v1/me': () => ({ json: profile }),
      'POST /v1/auth/verify-email': () => {
        verified = true;
        return tokenBody();
      },
      'PATCH /v1/me': (req) => {
        profile = { ...profile, ...(req.body as object) };
        return { json: profile };
      },
      'GET /v1/me/entitlements': () => problem(404, 'not-found'),
    });
    await page.goto('/vi/app/register');
    await page.getByRole('textbox', { name: vi.auth.register.givenName }).fill('Lan');
    await page.getByLabel(vi.auth.register.birthDate).fill('2008-05-14');
    await page.getByRole('textbox', { name: vi.auth.email }).fill('lan@example.com');
    await page.getByLabel(vi.auth.password).fill('Aa1!aaaa');
    await page.getByRole('checkbox').check({ force: true });
    await page.getByRole('button', { name: vi.auth.register.submit }).click();

    await expect(page).toHaveURL(/\/vi\/app\/verify-email$/);
    await expect(page.getByText('lan@example.com')).toBeVisible();
    // The password typed on the form is kept in memory (client-side move), so the page does not ask for it.
    await expect(page.getByLabel(vi.auth.password)).toHaveCount(0);
    await page.getByRole('textbox', { name: 'Chữ số 1' }).click();
    await page.keyboard.type('481205');
    await page.getByRole('button', { name: vi.auth.verify.submit }).click();

    await expect(page).toHaveURL(/\/vi\/app\/welcome$/);
    await page.getByRole('button', { name: vi.auth.welcome.submit }).click();
    await expect(page).toHaveURL(/\/vi\/app$/);
    expect(requests(page, 'POST', '/v1/auth/register')[0].body).toMatchObject({ accept_terms: true, client: 'web', birth_date: '2008-05-14' });
    expect(requests(page, 'POST', '/v1/auth/verify-email')[0].body).toMatchObject({
      email: 'lan@example.com', code: '481205', password: 'Aa1!aaaa', client: 'web',
    });
    expect(requests(page, 'POST', '/v1/auth/otp')).toHaveLength(0);
  });

  test('sign-in unverified → code page → Today', async ({ page }) => {
    let verified = false;
    await mockApi(page, {
      'POST /v1/auth/refresh': () => (verified ? tokenBody() : problem(401, 'invalid-token')),
      'POST /v1/auth/login': () => problem(403, 'email-not-verified'),
      'POST /v1/auth/verify-email': () => {
        verified = true;
        return tokenBody();
      },
      'GET /v1/me': () => ({ json: meBody() }),
      'GET /v1/me/entitlements': () => problem(404, 'not-found'),
    });
    await page.goto('/vi/app/login');
    await page.getByRole('textbox', { name: vi.auth.email }).fill('lan@example.com');
    await page.getByLabel(vi.auth.password).fill('Aa1!aaaa');
    await page.getByRole('button', { name: vi.auth.login.submit }).click();

    await expect(page).toHaveURL(/\/vi\/app\/verify-email\?reason=login$/);
    await expect(page.getByText(vi.auth.verify.loginBody.replace('{email}', 'lan@example.com'))).toBeVisible();
    await page.getByRole('textbox', { name: 'Chữ số 1' }).click();
    await page.keyboard.type('481205');
    await page.getByRole('button', { name: vi.auth.verify.submit }).click();
    await expect(page).toHaveURL(/\/vi\/app$/);
    expect(requests(page, 'POST', '/v1/auth/verify-email')[0].body).toMatchObject({ email: 'lan@example.com', password: 'Aa1!aaaa' });
  });

  test('E2: signing in with ?next lands on Settings', async ({ page }) => {
    let signedIn = false;
    await signedInAs(page, 'free', {
      'POST /v1/auth/refresh': () => (signedIn ? tokenBody() : problem(401, 'invalid-token')),
      'POST /v1/auth/login': () => {
        signedIn = true;
        return tokenBody();
      },
    });
    await page.goto('/vi/app/settings');
    await expect(page).toHaveURL(/\/vi\/app\/login\?next=%2Fvi%2Fapp%2Fsettings$/);
    await page.getByRole('textbox', { name: vi.auth.email }).fill('lan@example.com');
    await page.getByLabel(vi.auth.password).fill('pw');
    await page.getByRole('button', { name: vi.auth.login.submit }).click();
    await expect(page).toHaveURL(/\/vi\/app\/settings$/);
    await expect(page.getByRole('heading', { name: vi.settings.title, level: 1 })).toBeVisible();
  });

  test('E10: an en path for a vi profile moves to vi', async ({ page }) => {
    await signedInAs(page);
    await page.goto('/en/app/settings');
    await expect(page).toHaveURL(/\/vi\/app\/settings$/);
  });

  test('E8: a locked account sees the K/93 box', async ({ page }) => {
    await mockApi(page, { ...signedOut, 'POST /v1/auth/login': () => problem(403, 'account-locked') });
    await page.goto('/vi/app/login');
    await page.getByRole('textbox', { name: vi.auth.email }).fill('lan@example.com');
    await page.getByLabel(vi.auth.password).fill('pw');
    await page.getByRole('button', { name: vi.auth.login.submit }).click();
    await expect(page.getByText(vi.auth.login.lockedTitle)).toBeVisible();
  });

  test('Settings shows the usage rows of the plan (D15)', async ({ page }) => {
    await signedInAs(page, 'pro');
    await page.goto('/vi/app/settings');
    await expect(page.getByText('đã dùng 1/30')).toBeVisible();
    await expect(page.getByText('còn 287/300')).toBeVisible();
    await expect(page.getByText(/Còn 29 phiên, mở lại lúc 0:00\./)).toBeVisible();
  });
});

// Every M1 page × vi/en × light/dark; the desktop (1440) and mobile (390) projects run each once.
// verify-email opened directly (no pending email, no password in memory) shows its email and password fields too.
const SIGNED_OUT_PAGES = ['login', 'register', 'forgot-password', 'reset-password?email=lan%40example.com', 'verify-email', 'verify-email?reason=login'];
const MEMBER_PAGES = ['', 'settings', 'settings/account', 'welcome'];

async function open(page: Page, locale: 'vi' | 'en', path: string, signedIn: boolean) {
  if (signedIn) await signedInAs(page, 'free', {}, { native_language: locale });
  else await mockApi(page, signedOut);
  await page.goto(`/${locale}/app${path ? `/${path}` : ''}`);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
}

for (const scheme of ['light', 'dark'] as const) {
  for (const locale of ['vi', 'en'] as const) {
    test(`axe: no serious violation on M1 pages (${locale}, ${scheme})`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of SIGNED_OUT_PAGES) {
        await open(page, locale, path, false);
        expect(await seriousViolations(page), `${locale}/app/${path}`).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), `${locale}/app/${path}`).toBe(false);
      }
      for (const path of MEMBER_PAGES) {
        await open(page, locale, path, true);
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(scheme);
        expect(await seriousViolations(page), `${locale}/app/${path}`).toEqual([]);
      }
    });
  }
}
