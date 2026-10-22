import { expect, test, type Page } from '@playwright/test';

// Owner review set (D1, D4): every page of the milestone × vi/en × light/dark × 390/1024/1440 px.
// Needs SHOTS_EMAIL and SHOTS_PASSWORD of a learner made by `pnpm --filter api learner:setup`.
const MILESTONE = process.env.SHOTS_MILESTONE ?? 'm1';
const WIDTHS = [390, 1024, 1440];
const SIGNED_OUT = ['login', 'register', 'forgot-password'];
const MEMBER = ['', 'settings', 'settings/account'];

const email = process.env.SHOTS_EMAIL ?? '';
const password = process.env.SHOTS_PASSWORD ?? '';

async function settle(page: Page) {
  // Dev mode compiles a page on its first visit; give it time.
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
}

async function shoot(page: Page, name: string) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `test-results/shots/${MILESTONE}/${name}-${width}.png`, fullPage: true });
  }
}

async function setLanguage(page: Page, locale: 'vi' | 'en') {
  await page.goto(`/vi/app/settings`);
  await settle(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('label').getByText(locale === 'vi' ? 'Tiếng Việt' : 'English', { exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/app/settings`));
}

test('milestone screenshots', async ({ page }) => {
  test.skip(!email || !password, 'SHOTS_EMAIL / SHOTS_PASSWORD not set');
  // Signed-out pages first (a signed-in visit to them redirects into the app), then sign in once.
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const locale of ['vi', 'en'] as const) {
      for (const path of SIGNED_OUT) {
        await page.goto(`/${locale}/app/${path}`);
        await settle(page);
        await shoot(page, `${locale}-${scheme}-${path}`);
      }
    }
  }
  await page.goto('/vi/app/login');
  await settle(page);
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 60_000 });
  for (const locale of ['vi', 'en'] as const) {
    await setLanguage(page, locale);
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of MEMBER) {
        await page.goto(`/${locale}/app${path ? `/${path}` : ''}`);
        await settle(page);
        await shoot(page, `${locale}-${scheme}-${path.replace('/', '_') || 'today'}`);
      }
    }
  }
  await setLanguage(page, 'vi');
});
