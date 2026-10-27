import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { problem, requestCount, requests, signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const t = vi.users;
const LIST = '/v1/admin/users';
const ID = '6b1f0000-0000-4000-8000-00000000e42a';
const user = (over: Record<string, unknown> = {}) => ({
  id: ID, email: 'lan@example.com', given_name: 'Lan', family_name: 'Nguyễn', email_verified: true, staff_role: null, status: 'active',
  created_at: '2026-10-10T03:00:00.000Z', last_seen_at: '2026-10-20T08:15:00.000Z', ...over,
});
const detail = (over: Record<string, unknown> = {}) => ({
  ...user(), birth_date: '2008-05-14', terms_accepted_at: '2026-10-18T02:00:00.000Z', terms_version: '2026-10-01',
  locked_at: null, locked_by: null, lock_reason: null, ...over,
});
const base = { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) };

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Người dùng (A/71, A/72, A/72b)', () => {
  test('admin: menu → list → search needs 2 characters → detail → lock; axe clean', async ({ page }) => {
    let account = detail();
    await signedInAs(page, 'admin', {
      ...base,
      [`GET ${LIST}`]: () => ({ json: { items: [user()], next_page_token: null } }),
      [`GET ${LIST}/${ID}`]: () => ({ json: account }),
      [`POST ${LIST}/${ID}/lock`]: (req) => {
        account = detail({
          status: 'locked', locked_at: '2026-10-27T03:20:00.000Z', locked_by: { id: 'a1', email: 'admin@wordmet.com' },
          lock_reason: (req.body as { reason: string }).reason,
        });
        return { json: account };
      },
    });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.users }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.users })).toBeVisible();
    await expect(page.getByText('lan@example.com').filter({ visible: true }).first()).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByLabel(t.search).fill('l');
    await expect(page.getByText(t.searchShort)).toBeVisible();
    await page.getByLabel(t.search).fill('la');
    await expect.poll(() => requests(page, 'GET', LIST).at(-1)?.query.get('q')).toBe('la');
    expect(requests(page, 'GET', LIST).filter((r) => r.query.get('q') === 'l')).toHaveLength(0);

    await page.getByRole('link', { name: 'lan@example.com' }).filter({ visible: true }).first().click();
    const panel = page.getByTestId('detail-panel');
    await expect(panel.getByText('14/5/2008')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await panel.getByRole('button', { name: t.detail.lock }).click();
    const dialog = page.getByRole('dialog', { name: t.lock.title.replace('{email}', 'lan@example.com') });
    await dialog.getByLabel(t.lock.reason).fill('Gửi báo lỗi rác nhiều lần.');
    expect(await seriousViolations(page)).toEqual([]);
    await dialog.getByRole('button', { name: t.lock.confirm }).click();
    await expect(panel.getByText(/Đang khóa từ .* · bởi admin@wordmet\.com/)).toBeVisible();
    await expect(panel.getByText('Lý do: Gửi báo lỗi rác nhiều lần.')).toBeVisible();
    await expect(panel.getByRole('button', { name: t.detail.unlock })).toBeVisible();
  });

  test('409 lock-rule: the dialog shows the rule in words and stays open', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...base,
      [`GET ${LIST}`]: () => ({ json: { items: [user()], next_page_token: null } }),
      [`GET ${LIST}/${ID}`]: () => ({ json: detail() }),
      [`POST ${LIST}/${ID}/lock`]: () => problem(409, 'lock-rule'),
    });
    await page.goto(`/users/${ID}`);
    await page.getByTestId('detail-panel').getByRole('button', { name: t.detail.lock }).click();
    const dialog = page.getByRole('dialog', { name: t.lock.title.replace('{email}', 'lan@example.com') });
    await dialog.getByLabel(t.lock.reason).fill('x');
    await dialog.getByRole('button', { name: t.lock.confirm }).click();
    await expect(dialog.getByText(vi.errors['lock-rule'])).toBeVisible();
  });

  test('editor: no menu entry, and /users shows the no-access view without calling the API', async ({ page }) => {
    await signedInAs(page, 'editor', {
      ...base,
      [`GET ${LIST}`]: () => ({ json: { items: [], next_page_token: null } }),
    });
    await page.goto('/users');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi.nav.users);
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    await openNavIfCollapsed(page);
    await expect(page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.users })).toHaveCount(0);
    expect(requestCount(page, 'GET', LIST)).toBe(0);
  });

  test('an unknown id shows "Không tìm thấy người dùng này."', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...base,
      [`GET ${LIST}`]: () => ({ json: { items: [], next_page_token: null } }),
      [`GET ${LIST}/${ID}`]: () => problem(404, 'not-found'),
    });
    await page.goto(`/users/${ID}`);
    await expect(page.getByTestId('detail-panel').getByText(t.detail.notFound)).toBeVisible();
  });
});
