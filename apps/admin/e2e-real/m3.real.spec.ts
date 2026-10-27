import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';
import { apiCall, loginToken } from './support/api';
import { seedAiReport, type AiReportSeed } from './support/ai-report';

/**
 * M3 (Báo lỗi) on the real stack: Lan reported an AI question (seeded through the API with the fake model), Minh (editor) finds
 * it by its own reason and confirms the error, the admin sees the refund with both emails and manages the reasons, and Minh
 * accepts a form the AI used and undoes it. Needs the API started with `AI_FAKE_ENABLED=true`.
 */
test.describe.configure({ mode: 'serial' });

let state: RealState;
let seed: AiReportSeed;
const reasonCode = `m3_${randomUUID().slice(0, 8)}`;

test.beforeAll(async () => {
  test.setTimeout(180_000);
  // Read late: admin.real.spec.ts rewrites the file when it changes the admin's password.
  state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  seed = await seedAiReport(state);
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(vi.account.login.email).fill(email);
  await page.getByLabel(vi.account.login.password, { exact: true }).fill(password);
  await page.getByRole('button', { name: vi.account.login.submit }).click();
  await expect(page).toHaveURL(/\/uploads$/);
}

/** Lan's AI practice units left, read as Lan (`GET /v1/me/entitlements`). */
async function lanUnits(): Promise<number> {
  const token = await loginToken(state.lan.email, state.lan.password);
  return (await apiCall<{ pools: { ai_practice: { remaining: number } } }>('GET', '/v1/me/entitlements', token)).pools.ai_practice.remaining;
}

test('Minh filters the reports by the reason, opens the AI report and confirms the error: the unit goes back to Lan', async ({ page }) => {
  await signIn(page, state.editor.email, state.editor.password);
  await page.goto('/reports');
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.reports })).toBeVisible();

  await page.getByRole('button', { name: new RegExp(vi.reports.filters.reason) }).click();
  await page.getByRole('option', { name: seed.reasonLabel }).click();
  await expect(page).toHaveURL(new RegExp(`reason=${seed.reason}`));
  const row = page.getByRole('link', { name: seed.lemma }).filter({ visible: true });
  await expect(row).toHaveCount(1);
  await row.click();

  const panel = page.getByTestId('detail-panel');
  await expect(page).toHaveURL(new RegExp(`/reports/${seed.reportId}`));
  await expect(panel.getByText(vi.reports.actions.refundLine)).toBeVisible();
  await expect(panel.getByText('Còn một từ khác cũng điền được vào chỗ trống.')).toBeVisible();
  await expect(panel.getByText(vi.reports.detail.operationId)).toBeVisible();
  const unitsBefore = await lanUnits();
  await panel.getByRole('button', { name: vi.reports.actions.confirmed }).click();

  await expect(panel.getByText(vi.reports.detail.refunded)).toBeVisible();
  await expect(panel.getByRole('button', { name: vi.reports.actions.confirmed })).toHaveCount(0);
  expect(await lanUnits()).toBe(unitsBefore + 1);
  // Resolved reports leave the default "open" list.
  await panel.getByRole('button', { name: vi.common.close }).click();
  await expect(page.getByText(vi.reports.emptyFiltered)).toBeVisible();
});

test('the admin sees the refund with Lan and Minh by email, then adds a reason and turns it off', async ({ page }) => {
  await signIn(page, state.admin.email, state.admin.password);
  await page.goto('/refunds');
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.refunds })).toBeVisible();
  await page.getByLabel(vi.refunds.filters.resolver).fill(state.editor.email);
  await page.getByRole('button', { name: vi.refunds.filters.apply }).click();
  const table = page.getByRole('table');
  // A reused state (E2E_REUSE_STATE) has earlier refunds of Lan and Minh too: pick the row of THIS report.
  const row = table.getByRole('row').filter({ has: page.locator(`a[href^="/reports/${seed.reportId}"]`) });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(state.lan.email);
  await expect(row).toContainText(state.editor.email);
  await expect(row).toContainText(vi.refunds.refunded.true);
  await expect(row).toContainText('editor');
  await row.getByRole('link', { name: vi.refunds.reportLink }).click();
  await expect(page).toHaveURL(new RegExp(`/reports/${seed.reportId}$`));

  await page.goto('/report-reasons');
  await page.getByRole('button', { name: vi.reportReasons.add }).click();
  const dialog = page.getByRole('dialog', { name: vi.reportReasons.newTitle });
  await dialog.getByLabel(vi.reportReasons.form.code).fill(reasonCode);
  await dialog.getByLabel(vi.reportReasons.form.labelVi, { exact: true }).fill('Lý do thử M3');
  await dialog.getByLabel(vi.reportReasons.form.labelEn, { exact: true }).fill('M3 test reason');
  await dialog.getByRole('button', { name: vi.reportReasons.form.save }).click();
  await expect(dialog).toBeHidden();
  const added = page.getByRole('row').filter({ hasText: reasonCode });
  await expect(added).toHaveCount(1);
  await expect(added).toContainText('Lý do thử M3');

  const active = page.getByRole('switch', { name: vi.reportReasons.activeFor.replace('{code}', reasonCode) }).filter({ visible: true });
  await expect(active).toBeChecked();
  await active.click({ force: true });
  await expect(active).not.toBeChecked();
  // The change was saved by the API, not only drawn.
  await page.reload();
  await expect(page.getByRole('switch', { name: vi.reportReasons.activeFor.replace('{code}', reasonCode) }).filter({ visible: true })).not.toBeChecked();
});

test('Minh accepts the form the AI used, sees the toast, and Hoàn tác takes it out of the word forms again', async ({ page }) => {
  await signIn(page, state.editor.email, state.editor.password);
  await page.goto('/unknown-forms');
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.unknownForms })).toBeVisible();
  const accept = page.getByRole('button', {
    name: vi.unknownForms.acceptFor.replace('{form}', seed.unknownForm).replace('{lemma}', seed.unknownLemma),
  }).filter({ visible: true });
  await expect(accept).toHaveCount(1);
  await accept.click();
  await expect(page.getByText(vi.unknownForms.accepted.replace('{form}', seed.unknownForm).replace('{lemma}', seed.unknownLemma))).toBeVisible();
  await expect(accept).toHaveCount(0);

  await page.getByRole('button', { name: vi.unknownForms.undo }).click();
  await expect(page.getByText(vi.unknownForms.undone.replace('{form}', seed.unknownForm).replace('{lemma}', seed.unknownLemma))).toBeVisible();
});
