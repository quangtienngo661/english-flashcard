import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { expectNoHorizontalScroll } from './support/overflow';
import { problem, requestCount, requests, signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const t = vi.entitlements;
const LIST = '/v1/admin/entitlements/grants';
const USAGE = '/v1/admin/entitlements/ai-usage';
const G1 = '9a000000-0000-4000-8000-000000000001';
const LAN_ID = '6b1f0000-0000-4000-8000-00000000e42a';
const grant = (over: Record<string, unknown> = {}) => ({
  id: G1, user_id: LAN_ID, kind: 'plan', plan: 'pro', limits: null,
  starts_at: '2026-10-21T17:00:00.000Z', ends_at: '2026-11-21T17:00:00.000Z', reason: 'Giải IELTS tháng 10',
  granted_by: 'a1', granted_by_role: 'admin', revoked_at: null, revoked_by: null, revoke_reason: null, paid_renewal_action: null,
  created_at: '2026-10-21T10:00:00.000Z', user: { id: LAN_ID, email: 'lan@example.com' }, granted_by_user: { id: 'a1', email: 'an.admin@wordmet.com' },
  revoked_by_user: null, status: 'active', last_change: null, ...over,
});
const base = { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) };
const usage = { json: { date: '2026-10-27', used: 812, confirmed: 800, reserved: 12, cap: 1000, alert_percent: 80, alert_reached: false, enabled: true } };

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Cấp gói và lượt (A/78)', () => {
  test('admin: menu → list with the AI block → filter → revoke → edit dates; axe clean', async ({ page }) => {
    let account = grant();
    await signedInAs(page, 'admin', {
      ...base,
      [`GET ${USAGE}`]: () => usage,
      [`GET ${LIST}`]: () => ({ json: { items: [account], next_page_token: null } }),
      [`PATCH ${LIST}/${G1}`]: (req) => {
        account = grant({ ends_at: '2027-01-01T00:00:00+07:00', last_change: {
          id: 'c1', grant_id: G1, changed_by: 'a1', changed_by_role: 'admin', changed_by_user: { id: 'a1', email: 'an.admin@wordmet.com' },
          old_starts_at: account.starts_at, new_starts_at: account.starts_at, old_ends_at: account.ends_at, new_ends_at: '2026-12-31T17:00:00.000Z',
          reason: (req.body as { reason: string }).reason, created_at: '2026-10-27T03:00:00.000Z',
        } });
        return { json: account };
      },
      [`POST ${LIST}/${G1}/revoke`]: () => {
        account = grant({ status: 'revoked', revoked_at: '2026-10-27T04:00:00.000Z', revoke_reason: 'Nhầm người' });
        return { json: account };
      },
    });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.entitlements }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.entitlements })).toBeVisible();
    await expect(page.getByText('Lượt AI hôm nay: 812/1.000')).toBeVisible();
    await expect(page.getByText('lan@example.com').filter({ visible: true }).first()).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await expectNoHorizontalScroll(page);

    await page.getByLabel(t.filters.learner).fill('lan@example.com');
    await page.getByLabel(t.filters.expiring).fill('7');
    await page.getByRole('button', { name: t.filters.apply }).click();
    await expect.poll(() => requests(page, 'GET', LIST).at(-1)?.query.get('expiring_within_days')).toBe('7');
    expect(Object.fromEntries(requests(page, 'GET', LIST).at(-1)!.query)).toEqual({ user_email: 'lan@example.com', expiring_within_days: '7', page_size: '20' });
    await expect(page).toHaveURL(/user_email=lan%40example\.com/);

    await page.getByRole('button', { name: t.actions.editDatesFor.replace('{email}', 'lan@example.com') }).filter({ visible: true }).first().click();
    const edit = page.getByRole('dialog', { name: t.editDates.title.replace('{email}', 'lan@example.com') });
    await expect(edit.getByText(t.editDates.fromLocked)).toBeVisible();
    await edit.getByLabel(t.editDates.to).fill('2026-12-31');
    await edit.getByLabel(t.editDates.reason).fill('Kéo dài thêm');
    expect(await seriousViolations(page)).toEqual([]);
    await edit.getByRole('button', { name: t.editDates.confirm }).click();
    await expect(edit).toBeHidden();
    expect(requests(page, 'PATCH', `${LIST}/${G1}`)[0]!.body).toEqual({ ends_at: '2027-01-01T00:00:00+07:00', reason: 'Kéo dài thêm' });

    await page.getByRole('button', { name: t.actions.editDatesFor.replace('{email}', 'lan@example.com') }).filter({ visible: true }).first().click();
    const again = page.getByRole('dialog', { name: t.editDates.title.replace('{email}', 'lan@example.com') });
    await expect(again.getByText(/Lần sửa trước: 27\/10\/2026 · an\.admin@wordmet\.com · tới 21\/11 → 31\/12 · Kéo dài thêm/)).toBeVisible();
    await again.getByRole('button', { name: t.editDates.keep }).click();

    await page.getByRole('button', { name: t.actions.revokeFor.replace('{email}', 'lan@example.com') }).filter({ visible: true }).first().click();
    const revoke = page.getByRole('dialog', { name: t.revoke.title.replace('{email}', 'lan@example.com') });
    await revoke.getByLabel(t.revoke.reason).fill('Nhầm người');
    await revoke.getByRole('button', { name: t.revoke.confirm }).click();
    await expect(revoke).toBeHidden();
    expect(requests(page, 'POST', `${LIST}/${G1}/revoke`)[0]!.body).toEqual({ reason: 'Nhầm người' });
    await expect(page.getByText(t.statuses.revoked).filter({ visible: true }).first()).toBeVisible();
  });

  test('editor: the entry shows, the list loads, and no ai-usage request is sent; a refusal shows its own sentence', async ({ page }) => {
    await signedInAs(page, 'editor', {
      ...base,
      [`GET ${LIST}`]: () => ({ json: { items: [grant()], next_page_token: null } }),
      [`POST ${LIST}/${G1}/revoke`]: () => problem(409, 'grant-not-allowed', { reason: 'target-is-staff' }),
    });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.entitlements }).click();
    await expect(page.getByText('lan@example.com').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Lượt AI hôm nay/)).toHaveCount(0);
    expect(requestCount(page, 'GET', USAGE)).toBe(0);

    await page.getByRole('button', { name: t.actions.revokeFor.replace('{email}', 'lan@example.com') }).filter({ visible: true }).first().click();
    const revoke = page.getByRole('dialog', { name: t.revoke.title.replace('{email}', 'lan@example.com') });
    await revoke.getByLabel(t.revoke.reason).fill('Thử');
    await revoke.getByRole('button', { name: t.revoke.confirm }).click();
    await expect(revoke.getByText(t.refusal['target-is-staff'])).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
  test('admin: Cấp mới → lookup → 409 asks A/79b → resend with the flag; axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...base,
      [`GET ${USAGE}`]: () => usage,
      [`GET ${LIST}`]: () => ({ json: { items: [], next_page_token: null } }),
      'GET /v1/admin/entitlements/lookup': () => ({ json: { user: { id: LAN_ID, email: 'lan@example.com' }, grantable: true, reason: null } }),
      [`POST ${LIST}`]: (req) =>
        (req.body as { confirm_turn_off_paid_renewal?: boolean }).confirm_turn_off_paid_renewal
          ? { status: 201, json: grant({ paid_renewal_action: 'turned_off' }) }
          : problem(409, 'grant-not-allowed', { reason: 'target-has-paid-subscription' }),
    });
    await page.goto('/entitlements');
    await page.getByRole('button', { name: t.new.open }).first().click();
    const dialog = page.getByRole('dialog', { name: t.new.title });
    await dialog.getByLabel(t.new.email).fill('lan@example.com');
    await dialog.getByRole('button', { name: t.new.check }).click();
    await expect(dialog.getByText(t.new.confirmed.replace('{email}', 'lan@example.com'))).toBeVisible();
    await dialog.getByLabel(t.new.to).fill('2026-12-01');
    await dialog.getByLabel(t.new.reason).fill('Giải IELTS');
    expect(await seriousViolations(page)).toEqual([]);
    await expectNoHorizontalScroll(page);
    await dialog.getByRole('button', { name: t.new.submit }).click();
    const ask = page.getByRole('dialog', { name: t.new.confirm.title.replace('{email}', 'lan@example.com') });
    await expect(ask).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await ask.getByRole('button', { name: t.new.confirm.ok }).click();
    await expect(dialog).toBeHidden();
    const posts = requests(page, 'POST', LIST);
    expect(posts).toHaveLength(2);
    expect(posts[0]!.body).toEqual({ user_id: LAN_ID, kind: 'plan', plan: 'pro', ends_at: '2026-12-02T00:00:00+07:00', reason: 'Giải IELTS' });
    expect((posts[1]!.body as { confirm_turn_off_paid_renewal?: boolean }).confirm_turn_off_paid_renewal).toBe(true);
  });

  test('editor: custom numbers have no AI fields', async ({ page }) => {
    await signedInAs(page, 'editor', { ...base, [`GET ${LIST}`]: () => ({ json: { items: [], next_page_token: null } }) });
    await page.goto('/entitlements/new');
    const dialog = page.getByRole('dialog', { name: t.new.title });
    await dialog.getByText(t.kinds.limits, { exact: true }).click();
    await expect(dialog.getByLabel(t.new.practiceSessions)).toBeVisible();
    await expect(dialog.getByLabel(t.new.aiPractice)).toHaveCount(0);
    await expect(dialog.getByLabel(t.new.aiLookup)).toHaveCount(0);
  });
});
