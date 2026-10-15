import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vi from '../messages/vi.json' with { type: 'json' };
import { changePasswordViaApi, loginToken } from './support/api';
import { passwordFromMail } from './support/mailpit';
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';

/** One story told in order (spec §10): each test builds on the accounts and data of the one before. */
test.describe.configure({ mode: 'serial' });

const state: RealState = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
/** Names of what THIS run creates; unique even when the two base accounts are reused (E2E_REUSE_STATE). */
const id = randomUUID().slice(0, 8);
const editorEmail = `e2e-editor-${id}@example.com`;
const NEW_EDITOR_PASSWORD = 'Editor-New-Pass-7!';
const NEW_ADMIN_PASSWORD = 'Admin-New-Pass-8!';
const OTHER_ADMIN_PASSWORD = 'Admin-New-Pass-9!'; // a reused state may already hold the first one
let adminPassword = state.admin.password;
let editorPassword = '';
let adminContext: BrowserContext;
let editorContext: BrowserContext;
let learnerContext: BrowserContext;
let adminPage: Page;
let editorPage: Page;

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(vi.account.login.email).fill(email);
  await page.getByLabel(vi.account.login.password, { exact: true }).fill(password);
  await page.getByRole('button', { name: vi.account.login.submit }).click();
}

async function findStaff(page: Page, email: string) {
  await page.getByLabel(vi.staff.search.label).fill(email);
  await page.getByRole('button', { name: vi.staff.search.submit }).click();
  await expect(page.getByRole('region', { name: email })).toBeVisible();
}

const confirmDialog = (page: Page, name: string) => page.getByRole('dialog').getByRole('button', { name, exact: true }).click();

test.beforeAll(async ({ browser }) => {
  adminContext = await browser.newContext();
  editorContext = await browser.newContext();
  learnerContext = await browser.newContext();
  adminPage = await adminContext.newPage();
  editorPage = await editorContext.newPage();
});
test.afterAll(async () => {
  await Promise.all([adminContext.close(), editorContext.close(), learnerContext.close()]);
});

test('B25#23 + B25#27 + flow 1: the admin creates an editor (generated password, must change); the mail holds a password; the editor can only reach /change-password until the password changes', async () => {
  await signIn(adminPage, state.admin.email, adminPassword);
  await expect(adminPage).toHaveURL(/\/uploads$/);
  await adminPage.getByRole('navigation').getByRole('link', { name: vi.nav.staff }).click();

  await adminPage.getByRole('button', { name: vi.staff.createAccount }).click();
  const dialog = adminPage.getByRole('dialog');
  await dialog.getByLabel(vi.staff.create.email).fill(editorEmail);
  await dialog.getByRole('button', { name: vi.staff.create.continue }).click();
  await confirmDialog(adminPage, vi.staff.create.submit);
  await expect(adminPage.getByText(vi.staff.create.doneBody.replace('{email}', editorEmail))).toBeVisible();
  await confirmDialog(adminPage, vi.staff.create.close);
  await expect(adminPage.getByText('Password:')).toHaveCount(0); // the password never shows on screen

  editorPassword = await passwordFromMail(editorEmail);
  expect(editorPassword).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[-_.!@#%+=]).{8,}$/);

  await signIn(editorPage, editorEmail, editorPassword);
  await expect(editorPage).toHaveURL(/\/change-password$/);
  await editorPage.goto('/uploads');
  await expect(editorPage).toHaveURL(/\/change-password$/);

  // The same password is refused (same_as_current)…
  await editorPage.getByLabel(vi.account.changePassword.current).fill(editorPassword);
  await editorPage.getByLabel(vi.account.changePassword.new, { exact: true }).fill(editorPassword);
  await editorPage.getByLabel(vi.account.changePassword.confirm).fill(editorPassword);
  await editorPage.getByRole('button', { name: vi.account.changePassword.submit }).click();
  await expect(editorPage.getByText(vi.errors.same_as_current)).toBeVisible();
  await expect(editorPage).toHaveURL(/\/change-password$/);

  // …a new one lands in the app.
  await editorPage.getByLabel(vi.account.changePassword.new, { exact: true }).fill(NEW_EDITOR_PASSWORD);
  await editorPage.getByLabel(vi.account.changePassword.confirm).fill(NEW_EDITOR_PASSWORD);
  await editorPage.getByRole('button', { name: vi.account.changePassword.submit }).click();
  await expect(editorPage).toHaveURL(/\/uploads$/);
  editorPassword = NEW_EDITOR_PASSWORD;
});

test('B25#9 + B25#2 + flow 2: the admin removes the editor role and grants it again by "Tìm theo email"; a learner is told they have no access', async () => {
  await adminPage.goto('/staff');
  await findStaff(adminPage, editorEmail);
  await adminPage.getByRole('button', { name: vi.staff.card.remove }).click();
  await confirmDialog(adminPage, vi.staff.card.remove);
  await expect(adminPage.getByRole('region', { name: editorEmail }).getByText(vi.staff.card.noRole)).toBeVisible();

  await adminPage.getByRole('button', { name: vi.staff.card.grantEditor }).click();
  await confirmDialog(adminPage, vi.common.confirm);
  await expect(adminPage.getByRole('region', { name: editorEmail }).getByText(/· editor$/)).toBeVisible();
  await adminPage.reload();
  await expect(adminPage.getByText(editorEmail).first()).toBeVisible(); // the staff list shows the editor

  const learnerPage = await learnerContext.newPage();
  await signIn(learnerPage, state.learner.email, state.learner.password);
  await expect(learnerPage.getByText(vi.errors.noAccess)).toBeVisible();
  await expect(learnerPage).toHaveURL(/\/login$/);
});

test('B25#12 + B25#14 + flow 3: the editor registers a source, uploads small.csv (one invalid row), downloads rejected.csv, publishes the batch and reverts it', async () => {
  await editorPage.goto('/sources');
  await editorPage.getByRole('button', { name: vi.sources.register }).first().click();
  await editorPage.getByLabel(`${vi.sources.form.name} *`).fill(`Real-${id}`);
  await editorPage.getByLabel(`${vi.sources.form.version} *`).fill('1.0');
  await editorPage.getByLabel(`${vi.sources.form.license} *`).fill('test license');
  await editorPage.getByRole('button', { name: vi.sources.form.save }).click();
  await expect(editorPage.getByText(`Real-${id}`).first()).toBeVisible();

  await editorPage.goto('/uploads/new');
  const csv = readFileSync(path.join(import.meta.dirname, 'fixtures', 'small.csv'), 'utf8').replaceAll('__RUN__', id);
  await editorPage.setInputFiles('input[type="file"]', { name: 'small.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await editorPage.getByRole('button', { name: new RegExp(vi.uploads.levelSource) }).click();
  await editorPage.getByRole('option', { name: new RegExp(`Real-${id}`) }).click();
  const accepted = editorPage.waitForResponse((r) => r.url().endsWith('/v1/admin/content/uploads') && r.request().method() === 'POST');
  await editorPage.getByRole('button', { name: vi.uploads.submit, exact: true }).click();
  expect((await accepted).status()).toBe(202); // B25#12: the CORS preflight with Idempotency-Key succeeded
  await expect(editorPage).toHaveURL(/\/uploads\/[0-9a-f-]{36}$/);
  const batchId = editorPage.url().split('/').pop()!;

  // The batch opens in the panel beside its list (UB8); the list row carries the same status pill.
  await expect(editorPage.getByTestId('detail-panel').getByText(vi.status.partial, { exact: true })).toBeVisible({ timeout: 30_000 });
  const download = editorPage.waitForEvent('download');
  await editorPage.getByRole('button', { name: vi.batch.rejected }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`rejected-${batchId}.csv`);
  const rejected = readFileSync((await file.path())!, 'utf8');
  expect(rejected).toContain(`real-${id}-bad`);
  expect(rejected).not.toContain(`real-${id}-ok`);

  await editorPage.getByRole('button', { name: vi.batch.publish }).click();
  await expect(editorPage).toHaveURL(/\/publish-jobs\/[0-9a-f-]{36}$/);
  const jobId = editorPage.url().split('/').pop()!;
  await expect(editorPage.getByTestId('detail-panel').getByText(vi.status.succeeded, { exact: true })).toBeVisible({ timeout: 30_000 });
  await editorPage.goto('/publish-jobs');
  await expect(editorPage.getByText(`#${jobId.slice(0, 6)}`).first()).toBeVisible();

  await editorPage.goto(`/uploads/${batchId}`);
  await editorPage.getByRole('button', { name: vi.batch.revert }).click();
  await confirmDialog(editorPage, vi.batch.revert);
  await expect(editorPage.getByText(vi.batch.revertedNotice)).toBeVisible();
});

test('B25#4: reloading keeps the editor signed in (the Secure refresh cookie works on http://localhost: B25E2)', async () => {
  await editorPage.goto('/uploads');
  await editorPage.reload();
  await expect(editorPage).toHaveURL(/\/uploads$/);
  await expect(editorPage.getByRole('heading', { level: 1, name: vi.nav.uploads })).toBeVisible();
});

test('RKC3: leaving the page while its refresh is in flight keeps the session when the editor comes back 12 s later', async () => {
  await editorPage.goto('/uploads');
  await expect(editorPage.getByRole('heading', { level: 1, name: vi.nav.uploads })).toBeVisible();
  const refresh = editorPage.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/v1/auth/refresh'));
  await editorPage.reload({ waitUntil: 'commit' });
  await refresh;
  await editorPage.goto('about:blank'); // RK7: the page unloads while its refresh is on the wire
  await editorPage.waitForTimeout(12_000); // longer than the 10 s refresh grace (Bước 1, B1#16)
  await editorPage.goto('/uploads');
  await expect(editorPage).toHaveURL(/\/uploads$/);
  await expect(editorPage.getByRole('heading', { level: 1, name: vi.nav.uploads })).toBeVisible();
});

test('B25#6: the admin removes the editor role while the editor page is open; the editor\'s next action ends at /login with "no access"', async () => {
  await adminPage.goto('/staff');
  await findStaff(adminPage, editorEmail);
  await adminPage.getByRole('button', { name: vi.staff.card.remove }).click();
  await confirmDialog(adminPage, vi.staff.card.remove);
  await expect(adminPage.getByRole('region', { name: editorEmail }).getByText(vi.staff.card.noRole)).toBeVisible();

  await editorPage.getByRole('navigation').getByRole('link', { name: vi.nav.export }).click();
  await expect(editorPage).toHaveURL(/\/login$/);
  await expect(editorPage.getByText(vi.errors.noAccess)).toBeVisible();
});

test('B25#6a: the admin password is changed through the API; the admin tab\'s next action ends at /login with "session expired"', async () => {
  const next = adminPassword === NEW_ADMIN_PASSWORD ? OTHER_ADMIN_PASSWORD : NEW_ADMIN_PASSWORD;
  const token = await loginToken(state.admin.email, adminPassword);
  await changePasswordViaApi(token, adminPassword, next);
  adminPassword = next;
  writeFileSync(STATE_FILE, JSON.stringify({ ...state, admin: { ...state.admin, password: next } }, null, 2)); // so a reused state still logs in

  await adminPage.getByRole('navigation').getByRole('link', { name: vi.nav.sources }).click();
  await expect(adminPage).toHaveURL(/\/login$/);
  await expect(adminPage.getByText(vi.notice.expired)).toBeVisible();
});

test('B25#8 + B25E1 + flow 4: two pages reload at the same moment and both stay signed in; logging out in page A sends page B to /login with no action in B', async () => {
  await signIn(adminPage, state.admin.email, adminPassword);
  await expect(adminPage).toHaveURL(/\/sources$/); // Review Focus 4: back to the page the expired session left
  await adminPage.goto('/uploads');
  await expect(adminPage).toHaveURL(/\/uploads$/);
  const second = await adminContext.newPage();
  await second.goto('/uploads');
  await expect(second).toHaveURL(/\/uploads$/);

  await Promise.all([adminPage.reload(), second.reload()]); // B25E1: both refresh at once
  await expect(adminPage).toHaveURL(/\/uploads$/);
  await expect(second).toHaveURL(/\/uploads$/);
  await expect(adminPage.getByRole('heading', { level: 1, name: vi.nav.uploads })).toBeVisible();
  await expect(second.getByRole('heading', { level: 1, name: vi.nav.uploads })).toBeVisible();

  await adminPage.getByRole('button', { name: new RegExp(`${vi.shell.account}:`) }).click();
  await adminPage.getByRole('menuitem', { name: vi.shell.logout }).click();
  await expect(adminPage).toHaveURL(/\/login$/);
  await expect(second).toHaveURL(/\/login$/); // no action in page B
});
