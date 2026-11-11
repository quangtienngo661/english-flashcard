import { expect, test } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { problem, requests, signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const t = vi.faq;
const PATH = '/v1/admin/faq';
const ID1 = '00000000-0000-4000-8000-000000000001';
const ID2 = '00000000-0000-4000-8000-000000000002';
const item = (over: Record<string, unknown> = {}) => ({
  id: ID1, position: 10, question: 'Wordmet có miễn phí không?', answer: 'Có.\nGói Free dùng mãi.', published: true, row_version: 3,
  updated_at: '2026-11-11T03:00:00.000Z', updated_by: { id: 'u1', email: 'admin@wordmet.com' }, ...over,
});
const items = [item(), item({ id: ID2, position: 20, question: 'Học trên điện thoại được không?', answer: 'Được.', published: false, row_version: 1 })];
const uploads = { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) };

test.describe('Hỏi đáp trang chủ (M8.2)', () => {
  test('the list shows rows, badges and the deploy banner; axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', { ...uploads, [`GET ${PATH}`]: () => ({ json: { items } }) });
    await page.goto('/faq');
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.faq })).toBeVisible();
    await expect(page.getByText(t.banner)).toBeVisible();
    await expect(page.getByText('Học trên điện thoại được không?').filter({ visible: true })).toBeVisible();
    await expect(page.getByText(t.status.draft, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(t.status.published, { exact: true }).filter({ visible: true })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('add: POST carries the exact body and an Idempotency-Key; the dialog is axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...uploads,
      [`GET ${PATH}`]: () => ({ json: { items } }),
      [`POST ${PATH}`]: () => ({ status: 201, json: item({ id: 'new', position: 30, question: 'Có quảng cáo không?' }) }),
    });
    await page.goto('/faq');
    await page.getByRole('button', { name: t.add }).filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog', { name: t.newTitle });
    await expect(dialog.getByLabel(t.form.position)).toHaveValue('30');
    await dialog.getByLabel(t.form.question).fill('Có quảng cáo không?');
    await dialog.getByLabel(t.form.answer).fill('Gói Free có quảng cáo.\nGói Pro thì không.');
    expect(await seriousViolations(page)).toEqual([]);
    await dialog.getByRole('button', { name: t.form.save }).click();
    await expect(dialog).toBeHidden();
    const post = requests(page, 'POST', PATH);
    expect(post).toHaveLength(1);
    expect(post[0]!.body).toEqual({ question: 'Có quảng cáo không?', answer: 'Gói Free có quảng cáo.\nGói Pro thì không.', position: 30, published: false });
    expect(post[0]!.headers['idempotency-key']).toBeTruthy();
    await expect(page).toHaveURL(/\/faq$/);
  });

  test('edit + publish: PATCH carries expected_version; a 409 shows the conflict text', async ({ page }) => {
    let conflict = false;
    await signedInAs(page, 'admin', {
      ...uploads,
      [`GET ${PATH}`]: () => ({ json: { items } }),
      [`PATCH ${PATH}/${ID2}`]: () => (conflict ? problem(409, 'faq-version-conflict') : { json: item({ id: ID2, published: true, row_version: 2 }) }),
    });
    await page.goto('/faq');
    conflict = true;
    await page.getByRole('button', { name: t.editFor.replace('{question}', 'Học trên điện thoại được không?') }).filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog', { name: t.editTitle });
    await dialog.getByRole('checkbox', { name: t.form.published }).check({ force: true });
    await dialog.getByRole('button', { name: t.form.save }).click();
    await expect(dialog.getByText(vi.errors['faq-version-conflict'])).toBeVisible();
    const patch = requests(page, 'PATCH', `${PATH}/${ID2}`);
    expect(patch[0]!.body).toEqual({ expected_version: 1, question: 'Học trên điện thoại được không?', answer: 'Được.', position: 20, published: true });
    expect(patch[0]!.headers['idempotency-key']).toBeTruthy();
  });

  test('delete asks first, then sends DELETE', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...uploads,
      [`GET ${PATH}`]: () => ({ json: { items } }),
      [`DELETE ${PATH}/${ID1}`]: () => ({ status: 204 }),
    });
    await page.goto('/faq');
    await page.getByRole('button', { name: t.deleteFor.replace('{question}', 'Wordmet có miễn phí không?') }).filter({ visible: true }).first().click();
    const confirm = page.getByRole('dialog', { name: t.deleteDialog.title });
    await expect(confirm).toBeVisible();
    expect(requests(page, 'DELETE', `${PATH}/${ID1}`)).toHaveLength(0);
    expect(await seriousViolations(page)).toEqual([]);
    await confirm.getByRole('button', { name: t.deleteDialog.confirm }).click();
    await expect(confirm).toBeHidden();
    expect(requests(page, 'DELETE', `${PATH}/${ID1}`)).toHaveLength(1);
  });
});
