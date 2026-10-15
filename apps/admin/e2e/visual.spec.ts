import { test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { mockApi, problem, signedInAs, type MockHandler } from './support/mock-api';

/**
 * Screenshots only, no assertions (UB11): the owner reviews the shell at 1440 and 390 before the rest is built.
 * Opt-in so CI never runs it: `VISUAL=1 pnpm test:e2e e2e/visual.spec.ts`. Files land in test-results/visual/.
 */
test.skip(process.env.VISUAL !== '1', 'screenshots on request only');
test.use({ locale: 'vi-VN' });

const at = '2026-10-15T03:02:00.000Z';
const uploads = [
  { id: 'b1', status: 'running', file_name: 'oxford-3000-a1.csv', row_count: 812, created_at: at },
  { id: 'b2', status: 'succeeded', file_name: 'fill-senses.csv', row_count: 4, created_at: at },
  { id: 'b3', status: 'partial', file_name: 'cefrj-vocabulary-profile-1.5.csv', row_count: 7799, created_at: at },
  { id: 'b4', status: 'failed', file_name: 'topics-office.csv', row_count: 120, created_at: at },
  { id: 'b5', status: 'queued', file_name: 'phrasal-verbs-b1.csv', row_count: 356, created_at: at },
];
const batch = {
  id: 'b3',
  status: 'partial',
  file_name: 'cefrj-vocabulary-profile-1.5.csv',
  row_count: 7799,
  counters: { processed: 7799, created: 7512, updated: 240, unchanged: 40, rejected: 7 },
  warnings: ['Dòng 12: bỏ dấu đã rà của revision 3f2a'],
  created_at: at,
  started_at: at,
  finished_at: at,
  reverted: false,
};
const staff = [
  { id: 'admin-1', email: 'admin@wordmet.com', email_verified: true, staff_role: 'admin' },
  { id: 'e1', email: 'lan.editor@wordmet.com', email_verified: true, staff_role: 'editor' },
  { id: 'e2', email: 'minh.content@wordmet.com', email_verified: false, staff_role: 'editor' },
];
const mocks: Record<string, MockHandler> = {
  'GET /v1/admin/content/uploads': () => ({ json: { items: uploads, next_page_token: null } }),
  'GET /v1/admin/content/uploads/b3': () => ({ json: batch }),
  'GET /v1/admin/staff': () => ({ json: { items: staff, next_page_token: null } }),
  'GET /v1/admin/taxonomy/topics': () => ({ json: { items: [{ code: 'food', names: { vi: 'Ăn uống' }, archived_at: null }] } }),
};

async function shot(page: Page, name: string, lang: string) {
  await page.waitForTimeout(400); // let entrance animations finish
  await page.screenshot({ path: `test-results/visual/${name}-${test.info().project.name}-${lang}.png`, fullPage: true });
}

for (const lang of ['vi', 'en'] as const) {
  test(`shell screens (${lang})`, async ({ page }) => {
    test.skip(lang === 'en' && test.info().project.name !== 'desktop', 'EN at 1440 only');
    await page.addInitScript((l) => localStorage.setItem('wordmet-admin.locale', l), lang);

    await mockApi(page, { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') });
    await page.goto('/login');
    await page.getByRole('button', { name: lang === 'vi' ? vi.account.login.submit : /Sign in|Log in/ }).waitFor();
    await shot(page, '01-login', lang);
    await page.unrouteAll();

    await signedInAs(page, 'admin', mocks);
    await page.goto('/uploads');
    await page.getByText('fill-senses.csv').filter({ visible: true }).first().waitFor();
    await shot(page, '02-uploads', lang);

    await page.goto('/staff');
    await page.getByText('lan.editor@wordmet.com').filter({ visible: true }).first().waitFor();
    await shot(page, '03-staff', lang);

    await page.goto('/export');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await shot(page, '04-export', lang);

    await page.goto('/ai/costs');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await shot(page, '05-coming-soon', lang);

    await page.goto('/uploads/b3');
    await page.getByRole('heading', { level: 2 }).first().waitFor();
    await page.getByRole('button', { name: lang === 'vi' ? vi.batch.revert : /Revert/ }).first().click();
    await page.getByRole('dialog').waitFor();
    await shot(page, '06-revert-dialog', lang);
    await page.keyboard.press('Escape');

    await page.goto('/uploads');
    if (test.info().project.name === 'mobile') {
      await page.getByRole('button', { name: vi.shell.openMenu }).click();
      await page.getByRole('dialog').waitFor();
      await shot(page, '07-drawer', lang);
      await page.getByRole('dialog').getByRole('button', { name: new RegExp(`^${vi.shell.account}:`) }).click();
    } else {
      await page.getByRole('button', { name: /^(Tài khoản|Account):/ }).click();
    }
    await page.getByRole('menu').waitFor();
    await shot(page, '08-account-menu', lang);
  });
}
