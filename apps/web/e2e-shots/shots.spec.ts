import { expect, test, type Page } from '@playwright/test';

// Owner review set (D1, D4): every page of the milestone × vi/en × light/dark × 390/1024/1440 px.
// Needs SHOTS_EMAIL and SHOTS_PASSWORD of a learner made by `pnpm --filter api learner:setup`.
const MILESTONE = process.env.SHOTS_MILESTONE ?? 'm1';
const WIDTHS = [390, 1024, 1440];
const SIGNED_OUT = ['login', 'register', 'forgot-password'];
const MEMBER = ['', 'settings', 'settings/account'];

const email = process.env.SHOTS_EMAIL ?? '';
const password = process.env.SHOTS_PASSWORD ?? '';

async function settle(page: Page, ready = page.getByRole('heading', { level: 1 }).first()) {
  // Dev mode compiles a page on its first visit; give it time.
  await expect(ready).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
}

/** M9.6: where a shot goes. `dir/<name>-<scheme>-<width>.png` for the gm-m9 set; the older sets pass their widths and keep `<milestone>/<name>-<width>.png`. */
type ShotOpts = { dir: string; widths: number[]; scheme: 'light' | 'dark' };
type Where = ShotOpts | number[];
const widthsOf = (where: Where) => (Array.isArray(where) ? where : where.widths);
const only = (where: Where, width: number): Where => (Array.isArray(where) ? [width] : { ...where, widths: [width] });
const shotPath = (where: Where, name: string, width: number) =>
  Array.isArray(where) ? `test-results/shots/${MILESTONE}/${name}-${width}.png` : `test-results/shots/${where.dir}/${name}-${where.scheme}-${width}.png`;

/** A page is shot full length; a page with a dialog open only as the window shows it (a full-length shot redraws the dialog half see-through). */
async function shoot(page: Page, name: string, fullPage = true, where: Where = WIDTHS) {
  for (const width of widthsOf(where)) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    // A dialog switches between sheet and centred box at 768 px and animates in again; shoot it once it has settled.
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length))
      .toBe(0);
    await page.screenshot({ path: shotPath(where, name, width), fullPage });
  }
}

/** A frame or set the run could not shoot: printed, and listed in the test's annotations so the report shows what is missing. */
function missed(what: string, why: string) {
  const line = `chưa chụp: ${what} — ${why.split('\n').slice(0, 5).join(' | ')}`;
  console.log(line);
  test.info().annotations.push({ type: 'chưa chụp', description: line });
}

const signedIn = new WeakSet<Page>();
/** Signs the learner in once per page; true when it did so now. */
async function signIn(page: Page) {
  if (signedIn.has(page)) return false;
  await page.goto('/vi/app/login');
  await settle(page);
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 60_000 });
  signedIn.add(page);
  // A learner made for the shots answers the welcome question first (Vietnamese).
  const welcome = page.getByRole('heading', { name: 'Bạn đọc nghĩa của từ bằng ngôn ngữ nào?' });
  if (await welcome.waitFor({ timeout: 15_000 }).then(() => true, () => false)) {
    // "Tiếng Việt" is already chosen.
    await page.getByRole('button', { name: 'Tiếp tục' }).click();
    await expect(welcome).toBeHidden({ timeout: 30_000 });
  }
  return true;
}

/** The set runs in two phases in gm-m9: the pages that need no account first, then (after one sign-in) the rest. Alone it runs both. */
type Phase = 'all' | 'out' | 'in';

async function setLanguage(page: Page, locale: 'vi' | 'en') {
  await page.goto(`/vi/app/settings`);
  await settle(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  // M7.3: "Ngôn ngữ" is a select on Cài đặt (its name is "Language" once the app is in English).
  await page.getByRole('button', { name: /Ngôn ngữ|Language/ }).click();
  await page.getByRole('option', { name: locale === 'vi' ? 'Tiếng Việt' : 'English', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/app/settings`));
}

test('milestone screenshots', async ({ page }) => {
  // M8b: the public pages need no account.
  if (MILESTONE === 'gm-m8') {
    await gmM8(page);
    return;
  }
  if (MILESTONE === 'gm-m9') {
    test.skip(!email || !password, 'SHOTS_EMAIL / SHOTS_PASSWORD not set');
    await gmM9(page);
    return;
  }
  test.skip(!email || !password, 'SHOTS_EMAIL / SHOTS_PASSWORD not set');
  // Signed-out pages first (a signed-in visit to them redirects into the app), then sign in once.
  if (MILESTONE === 'gm-m1') {
    await gmM1(page);
    return;
  }
  if (MILESTONE === 'gm-m2') {
    await gmM2(page);
    return;
  }
  if (MILESTONE === 'gm-m3') {
    await gmM3(page);
    return;
  }
  if (MILESTONE === 'gm-m5') {
    await gmM5(page);
    return;
  }
  if (MILESTONE === 'gm-m6') {
    await gmM6(page);
    return;
  }
  if (MILESTONE === 'gm-m4') {
    await gmM4(page);
    return;
  }
  if (MILESTONE === 'gm-m7a') {
    await gmM7a(page);
    return;
  }
  if (MILESTONE === 'gm-m7b') {
    await gmM7b(page);
    return;
  }
  for (const scheme of MILESTONE === 'm1' ? (['light', 'dark'] as const) : []) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const locale of ['vi', 'en'] as const) {
      for (const path of SIGNED_OUT) {
        await page.goto(`/${locale}/app/${path}`);
        await settle(page);
        await shoot(page, `${locale}-${scheme}-${path}`);
      }
    }
  }
  await signIn(page);
  if (MILESTONE === 'm2') {
    await m2(page);
    return;
  }
  if (MILESTONE === 'm3') {
    await m3(page);
    return;
  }
  if (MILESTONE === 'm4') {
    await m4(page);
    return;
  }
  if (MILESTONE === 'm4b') {
    await m4b(page);
    return;
  }
  if (MILESTONE === 'm5a') {
    await m5a(page);
    return;
  }
  if (MILESTONE === 'm5b') {
    await m5b(page);
    return;
  }
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

/**
 * Giao diện mới M1 (plan 2026-11-10, Task M1.13): the new chrome on old screens. Login signed out, then Today, Groups, a group and
 * Settings signed in; vi, light and dark, 390 and 1440 px. A learner with no group gets one from the Kinh doanh · B1 suggestion.
 */
async function gmM1(page: Page, opts?: ShotOpts, phase: Phase = 'all') {
  const out: Where = opts ?? [390, 1440];
  const schemes = opts ? [opts.scheme] : (['light', 'dark'] as const);
  const name = (scheme: string, n: string) => (opts ? n : `vi-${scheme}-${n}`);
  if (phase !== 'in') {
    for (const scheme of schemes) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/vi/app/login');
      await settle(page);
      await shoot(page, name(scheme, 'login'), true, out);
    }
  }
  if (phase === 'out') return;
  if (!opts) await page.emulateMedia({ colorScheme: 'light' });
  await signIn(page);
  await setLanguage(page, 'vi');
  await page.goto('/vi/app/groups');
  await settle(page);
  let link = page.getByRole('link', { name: /Kinh doanh/ }).first();
  if (!(await link.count())) {
    await page.goto(`/vi/app/${TOPIC}`);
    await settle(page, page.getByRole('list').first());
    await page.getByRole('button', { name: /^Thêm tất cả từ chưa học/ }).click();
    await expect(page.getByText(/^Đã thêm \d+ từ vào nhóm/)).toBeVisible({ timeout: 30_000 });
    await page.goto('/vi/app/groups');
    await settle(page);
    link = page.getByRole('link', { name: /Kinh doanh/ }).first();
  }
  const id = new URL((await link.getAttribute('href'))!, 'http://x').searchParams.get('id')!;
  for (const scheme of schemes) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const [path, n] of [['', 'today'], ['groups', 'groups'], [`group?id=${id}`, 'group'], ['settings', 'settings']] as const) {
      await page.goto(`/vi/app${path ? `/${path}` : ''}`);
      await settle(page);
      await shoot(page, name(scheme, n), true, out);
    }
  }
}

// Plan part 2, M2.10: the nine sign-in and account pages at 390 and 1440, light. Signed-out pages first (a signed-in visit redirects
// into the app); google/complete without a Google ticket shows its "expired" state.
async function gmM2(page: Page, opts?: ShotOpts, phase: Phase = 'all') {
  const out: Where = opts ?? [390, 1440];
  const name = (n: string) => (opts ? n : `vi-light-${n}`);
  await page.emulateMedia({ colorScheme: opts?.scheme ?? 'light' });
  if (phase !== 'in') {
    for (const path of ['login', 'register', 'verify-email', 'forgot-password', 'reset-password', 'google/complete', 'account-deleted']) {
      await page.goto(`/vi/app/${path}`);
      await settle(page);
      await shoot(page, name(path.replace('/', '-')), true, out);
    }
  }
  if (phase === 'out') return;
  await signIn(page);
  for (const path of ['complete-profile', 'welcome']) {
    await page.goto(`/vi/app/${path}`);
    await settle(page);
    await shoot(page, name(path), true, out);
  }
}

/**
 * Giao diện mới M3 (design §9 M3): Hôm nay, Nhóm with and without the picker, Một nhóm, Từ lâu chưa ôn, Chủ đề and the five group
 * dialogs, 390 and 1440 px, light. Needs a learner with at least one deck (made from the Kinh doanh · B1 topic when missing).
 * The remove-word dialog only opens for a word in one deck, and the forget dialog only when the deck has long-overdue words.
 */
async function gmM3(page: Page, opts?: ShotOpts) {
  const out: Where = opts ?? [390, 1440];
  const widths = widthsOf(out);
  // The shots learner signs up in Vietnamese; the old Settings language switch is rebuilt in M7.
  await signIn(page);
  // The first topic Hôm nay suggests (the local content decides which), opened from its card.
  await page.goto('/vi/app');
  await settle(page);
  const topicHref = await page.getByRole('region', { name: 'Tạo nhóm nhanh theo chủ đề' }).getByRole('link').nth(1).getAttribute('href');
  const topic = topicHref!.replace(/^\/vi\/app\//, '');
  await page.goto('/vi/app/groups');
  await settle(page);
  if (!(await page.getByRole('region', { name: 'Các nhóm của bạn' }).count())) {
    await page.goto(`/vi/app/${topic}`);
    await settle(page);
    await page.getByRole('button', { name: /^Thêm tất cả từ chưa học/ }).click();
    await expect(page.getByText(/^Đã thêm \d+ từ vào nhóm/)).toBeVisible({ timeout: 30_000 });
    await page.goto('/vi/app/groups');
    await settle(page);
  }
  const centre = page.getByRole('region', { name: 'Các nhóm của bạn' }).getByRole('link');
  const id = new URL((await centre.getAttribute('href'))!, 'http://x').searchParams.get('id')!;
  for (const [path, name] of [['', 'today'], ['groups', 'groups'], [`group?id=${id}`, 'group'], [`group/backlog?id=${id}`, 'backlog'], [topic, 'topic']] as const) {
    await page.goto(`/vi/app${path ? `/${path}` : ''}`);
    await settle(page);
    await shoot(page, name, true, out);
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/vi/app/groups');
    await settle(page);
    await page.keyboard.press('f');
    await expect(page.getByRole('listbox')).toBeVisible();
    await shoot(page, 'groups-picker', false, only(out, width));
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Tạo nhóm', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await shoot(page, 'dialog-create', false, only(out, width));
    await page.keyboard.press('Escape');
    await page.goto(`/vi/app/group?id=${id}`);
    await settle(page);
    for (const [item, name] of [['Đổi tên nhóm', 'dialog-rename'], ['Xóa nhóm', 'dialog-delete']] as const) {
      await page.getByRole('button', { name: 'Tùy chọn nhóm', exact: true }).click();
      await page.getByRole('menuitem', { name: item }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await shoot(page, name, false, only(out, width));
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    }
    const remove = page.getByRole('button', { name: /^Bỏ .+ khỏi nhóm$/ }).first();
    if ((await remove.count()) && width === widths[0]) {
      await remove.click();
      if (await page.getByRole('dialog').isVisible()) {
        await shoot(page, 'dialog-remove', false, out);
        await page.getByRole('button', { name: 'Giữ lại' }).click();
      }
    }
    await page.goto(`/vi/app/group/backlog?id=${id}`);
    await settle(page);
    const first = page.getByRole('checkbox', { name: /^Chọn / }).first();
    if (await first.count()) {
      await first.check({ force: true });
      await page.getByRole('button', { name: 'Bỏ khỏi việc học' }).click();
      await shoot(page, 'dialog-forget', false, only(out, width));
      await page.keyboard.press('Escape');
    }
  }
}

/**
 * Giao diện mới M4 (design §9 M4): Tra từ, a catalog word page, the learner's own word page, the five add-word overlays and the
 * three word dialogs, 390 and 1440 px, light. Needs a learner with at least one deck (gm-m3 makes one). Overlay 4 needs an AI
 * lookup that answers (a model chosen for `lookup_word`, or `AI_FAKE_ENABLED=true`); it is skipped when the lookup fails.
 */
/**
 * M6 (Figma 95:343 button, 102:3278 / 102:3948 Lịch, 103:3820 / 103:4248 Ngày, 211:5827 / 211:6061 reports, 120:4295 Settings): Hôm nay with the
 * calendar button, Lịch, Ngày of the newest studied day of this month, Ngày of an empty day, "Báo lỗi của tôi", Settings with its row.
 * The learner needs some study this month for a full Ngày (a wrong answer and two sessions show best).
 */
async function gmM6(page: Page, opts?: ShotOpts) {
  const out: Where = opts ?? [390, 1440];
  const widths = widthsOf(out);
  await signIn(page);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/vi/app');
    await settle(page, page.getByRole('button', { name: 'Lịch học' }));
    await shoot(page, 'today-calendar-button', false, only(out, width));
    await page.getByRole('button', { name: 'Lịch học' }).click();
    const month = page.getByRole('dialog');
    await expect(month.getByRole('list')).toHaveCount(2, { timeout: 30_000 });
    await shoot(page, 'month', false, only(out, width));
    const studied = month.getByRole('button', { name: /: (học|ôn|luyện)/ });
    if (await studied.count()) {
      await studied.last().click();
      await expect(page.getByRole('dialog').getByRole('group')).toBeVisible({ timeout: 30_000 });
      await shoot(page, 'day', false, only(out, width));
    }
    await page.keyboard.press('Escape');
    const quiet = month.getByRole('button', { name: /: không học$/ });
    if (await quiet.count()) {
      await quiet.first().click();
      await shoot(page, 'day-empty', false, only(out, width));
    }
  }
  for (const [path, name] of [['settings/reports', 'reports'], ['settings', 'settings-row']] as const) {
    await page.goto(`/vi/app/${path}`);
    await settle(page);
    await shoot(page, name, true, out);
  }
}

/**
 * M7a (Figma 120:4295 / 120:4559 Cài đặt, 181:5456 / 181:5748 avatar menu, 121:4297 / 121:4404 Tài khoản, 121:4503 / 121:4634 Xóa tài khoản,
 * 122:4203 / 122:4354 Lịch sử giao dịch, 122:4484 / 182:5856 its detail) on a learner made with `learner:setup --plan pro --transactions`.
 */
async function gmM7a(page: Page, opts?: ShotOpts) {
  const out: Where = opts ?? [390, 1440];
  const widths = widthsOf(out);
  await signIn(page);
  for (const [path, name] of [['settings', 'settings'], ['settings/account', 'account'], ['settings/delete-account', 'delete-account']] as const) {
    await page.goto(`/vi/app/${path}`);
    await settle(page);
    await shoot(page, name, true, out);
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/vi/app/settings');
    await settle(page);
    await page.getByRole('button', { name: 'Tài khoản của bạn' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await shoot(page, 'settings-menu', false, only(out, width));
    await page.keyboard.press('Escape');
  }
  await page.goto('/vi/app/settings/transactions');
  const rows = page.getByRole('button', { name: /Xem chi tiết$/ });
  await settle(page, rows.first());
  await shoot(page, 'transactions', true, out);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await rows.first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await shoot(page, 'transaction-detail', false, only(out, width));
    await page.keyboard.press('Escape');
  }
}

/**
 * M7b (Figma 123:4196 / 123:4401 Gói học, 123:4598 / 123:4690 Đơn hàng paid, 123:4774 its other states, 75:2094 / 75:2373 Giới thiệu Pro) on a
 * learner made with `learner:setup --plan trial` (a fake subscription that renews, so Gói học has its Hủy gói row; the dialog has no frame).
 * No seed makes a payOS order or turns ads on, so `/v1/me/orders/*` is answered here and `/v1/me/entitlements` is the API's own answer with
 * `plan`, `pro_until`, `sources` or `ads` changed (`page.route`).
 */
async function gmM7b(page: Page, opts?: ShotOpts) {
  const out: Where = opts ?? [390, 1440];
  const widths = widthsOf(out);
  const api = process.env.SHOTS_API_URL ?? 'http://localhost:3000';
  const cors = { 'access-control-allow-origin': new URL(process.env.SHOTS_BASE_URL ?? 'http://localhost:3001').origin, 'access-control-allow-credentials': 'true' };
  let patch: Record<string, unknown> = {};
  await page.route(`${api}/v1/me/entitlements`, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), ...patch } });
  });
  const ORDER = '7b3c9e1a-4d2f-4c8b-9a6e-2f1d0c5b8a73';
  let status = 'paid';
  const order = () => ({
    id: ORDER, status, period_months: 3, amount: 199000, description: 'WM 3T 8F2C41D9', expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    period: status === 'paid' ? { starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 92 * 86_400_000).toISOString() } : null,
  });
  await page.route(`${api}/v1/me/orders/**`, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET,POST', 'access-control-allow-headers': 'authorization,content-type,x-csrf-protection' } })
      : route.fulfill({ headers: cors, json: order() }));

  await signIn(page);

  patch = { plan: 'free', sources: [], pro_until: null, upcoming_periods: [] };
  await page.goto('/vi/app/plans');
  await settle(page);
  await shoot(page, 'plans-free', true, out);
  patch = {};
  await page.goto('/vi/app/plans');
  await settle(page);
  await shoot(page, 'plans-pro', true, out);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Hủy gói' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await shoot(page, 'plans-cancel-dialog', false, only(out, width));
    await page.keyboard.press('Escape');
  }
  for (const [state, title] of [['paid', 'Thanh toán thành công'], ['pending', 'Đang chờ xác nhận thanh toán']] as const) {
    status = state;
    await page.goto(`/vi/app/plans/order?order=${ORDER}`);
    await settle(page, page.getByRole('heading', { level: 1, name: title }));
    await shoot(page, `order-${state}`, true, out);
  }
  patch = { plan: 'free', sources: [], pro_until: null, ads: { show: true, interstitial_per_day: 100, min_interval_minutes: 0 } };
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/vi/app');
    await settle(page, page.getByRole('navigation', { name: 'Điều hướng chính' }));
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Nhóm' }).click();
    await expect(page.getByRole('dialog', { name: 'Học nhiều hơn với Pro' })).toBeVisible();
    await shoot(page, 'pro-dialog', false, only(out, width));
  }
}

async function gmM4(page: Page, opts?: ShotOpts) {
  const out: Where = opts ?? [390, 1440];
  const widths = widthsOf(out);
  const OWN = 'wmshotword';
  await signIn(page);
  const dialog = page.getByRole('dialog');
  const closeDialog = async () => {
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  };
  // Tra từ with a level filter: the dictionary page, the lifted card and the stacks; the first entry is the catalog word page.
  await page.goto('/vi/app/lookup?level=B1');
  await settle(page, page.getByRole('region', { name: 'Thẻ của từ đang chọn' }));
  await shoot(page, 'lookup', true, out);
  const lemma = (await page.getByRole('region', { name: 'Thẻ của từ đang chọn' }).getByRole('heading').textContent())!.trim();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/vi/app/lookup?level=B1');
    await settle(page, page.getByRole('region', { name: 'Thẻ của từ đang chọn' }));
    await page.getByRole('button', { name: 'Thêm cả loạt vào nhóm' }).click();
    await shoot(page, 'overlay-3-bulk', false, only(out, width));
    await closeDialog();
    await page.getByRole('button', { name: 'Nhóm khác hoặc tạo nhóm mới' }).click();
    await shoot(page, 'overlay-5-group', false, only(out, width));
    await closeDialog();
    // Overlay 1: a form Wordmet knows ("went → go").
    await page.keyboard.press('n');
    await dialog.getByRole('textbox', { name: 'Từ' }).fill('went');
    await expect(dialog.getByText('quá khứ của go', { exact: false })).toBeVisible({ timeout: 30_000 });
    await shoot(page, 'overlay-1-add-word', false, only(out, width));
    // Overlay 4: a word Wordmet lacks, looked up with AI.
    await dialog.getByRole('textbox', { name: 'Từ' }).fill('rizzed');
    const ai = dialog.getByRole('button', { name: 'Tra bằng AI' });
    if (await ai.waitFor({ timeout: 15_000 }).then(() => true, () => false)) {
      await ai.click();
      if (await dialog.getByRole('region', { name: 'thẻ sẽ lưu · xem trước' }).waitFor({ timeout: 30_000 }).then(() => true, () => false)) {
        await shoot(page, 'overlay-4-ai', false, only(out, width));
      }
    }
    await closeDialog();
  }
  // The learner's own word, made once by hand.
  await page.goto(`/vi/app/word?w=${OWN}`);
  // The "not found" state has its heading at level 2, so wait for any heading in the page.
  await settle(page, page.getByRole('main').getByRole('heading').first());
  if (await page.getByText(`Không tìm thấy từ “${OWN}”`).isVisible()) {
    await page.getByRole('button', { name: 'Thêm từ này' }).click();
    await dialog.getByRole('button', { name: 'Tự nhập nghĩa' }).click();
    await dialog.getByRole('textbox', { name: 'Nghĩa' }).fill('từ thử cho bộ ảnh');
    // The save needs a group: open the picker, take the first one and confirm it.
    await dialog.getByRole('button', { name: /^Lưu vào nhóm: / }).click();
    const picker = page.getByRole('dialog', { name: 'Lưu vào nhóm', exact: true });
    await picker.getByRole('radio').first().check({ force: true });
    await picker.getByRole('button', { name: /^Chọn / }).click();
    await dialog.getByRole('button', { name: 'Lưu từ' }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
  }
  for (const [word, name] of [[lemma, 'word'], [OWN, 'word-own']] as const) {
    await page.goto(`/vi/app/word?w=${encodeURIComponent(word)}`);
    await settle(page);
    await shoot(page, name, true, out);
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/vi/app/word?w=${OWN}`);
    await settle(page);
    for (const [button, name] of [['Sửa từ', 'dialog-edit-word'], ['Xóa từ', 'dialog-delete-word']] as const) {
      await page.getByRole('button', { name: button, exact: true }).first().click();
      await shoot(page, name, false, only(out, width));
      await closeDialog();
    }
    const addSentence = page.getByRole('button', { name: 'Thêm câu đã gặp' }).first();
    if (await addSentence.count()) {
      await addSentence.click();
      await dialog.getByRole('textbox').first().fill(`I met ${OWN} in a book yesterday.`);
      await shoot(page, 'overlay-2-sentence', false, only(out, width));
      await closeDialog();
    }
    const seen = page.getByRole('button', { name: /^\d+ câu đã gặp$/ }).first();
    if (await seen.count()) {
      await seen.click();
      await shoot(page, 'dialog-sentences', false, only(out, width));
      await closeDialog();
    }
  }
}

const COMBOS = (['vi', 'en'] as const).flatMap((locale) => (['light', 'dark'] as const).map((scheme) => ({ locale, scheme })));
const TOPIC = 'topic?code=business&level=B1';

/**
 * M2 on a learner with no decks yet: Today and the topic picker while empty, then one deck made from the Kinh doanh · B1
 * suggestion (every word), then every M2 page. Each locale × scheme answers one card, so the summary has a count.
 */
async function m2(page: Page) {
  for (const { locale, scheme } of COMBOS) {
    await setLanguage(page, locale);
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`/${locale}/app`);
    await settle(page);
    await shoot(page, `${locale}-${scheme}-today-empty`);
    await page.goto(`/${locale}/app/${TOPIC}`);
    await settle(page, page.getByRole('list').first());
    await shoot(page, `${locale}-${scheme}-topic`);
  }
  await setLanguage(page, 'vi');
  await page.goto(`/vi/app/${TOPIC}`);
  await settle(page, page.getByRole('list').first());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: /^Thêm tất cả từ chưa học/ }).click();
  await expect(page.getByText(/^Đã thêm \d+ từ vào nhóm/)).toBeVisible({ timeout: 30_000 });
  await page.goto('/vi/app/groups');
  await settle(page);
  const href = await page.getByRole('link', { name: 'Kinh doanh · B1' }).first().getAttribute('href');
  const id = new URL(href!, 'http://x').searchParams.get('id')!;

  for (const { locale, scheme } of COMBOS) {
    await setLanguage(page, locale);
    await page.emulateMedia({ colorScheme: scheme });
    const at = (path: string) => `/${locale}/app/${path}`;
    const name = (n: string) => `${locale}-${scheme}-${n}`;
    for (const [path, n] of [['', 'today'], ['groups', 'groups'], [`group?id=${id}`, 'group'], [`group/backlog?id=${id}`, 'backlog'], [TOPIC, 'topic-learning']] as const) {
      await page.goto(at(path));
      await settle(page, n.startsWith('topic') ? page.getByRole('list').first() : undefined);
      await shoot(page, name(n));
    }
    // K/17 create dialog and K/10b deck menu, on the deck list.
    await page.goto(at('groups'));
    await settle(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: locale === 'vi' ? 'Tạo nhóm' : 'Create deck', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await shoot(page, name('create-dialog'), false);
    await page.keyboard.press('Escape');
    // K/20–K/22: front, back, then one answer and Esc for the summary.
    await page.goto(at(`review?group=${id}`));
    await settle(page, page.getByRole('group').first());
    await shoot(page, name('review-front'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press('Space');
    await page.waitForLoadState('networkidle');
    await shoot(page, name('review-back'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press('2');
    await expect(page.getByRole('group').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await settle(page);
    await shoot(page, name('review-summary'));
  }
  await setLanguage(page, 'vi');
}

/** M3 on a learner who already has the Kinh doanh · B1 deck (the M2 run): lookup, word pages and every add sheet. */
async function m3(page: Page) {
  for (const { locale, scheme } of COMBOS) {
    await setLanguage(page, locale);
    await page.emulateMedia({ colorScheme: scheme });
    const at = (path: string) => `/${locale}/app/${path}`;
    const name = (n: string) => `${locale}-${scheme}-${n}`;
    const pages: Array<[string, string, () => ReturnType<Page['getByRole']>]> = [
      ['lookup?level=B1&topic=business', 'lookup', () => page.getByRole('listitem').first()],
      ['lookup?q=zzzz', 'lookup-empty', () => page.getByRole('heading', { level: 2 }).first()],
      ['word?w=left', 'word-left', () => page.getByRole('article').first()],
      ['word?w=go', 'word-go', () => page.getByRole('article').first()],
      ['word?w=profit', 'word-learning', () => page.getByRole('article').first()],
    ];
    for (const [path, n, ready] of pages) {
      await page.goto(at(path));
      await settle(page, ready());
      await shoot(page, name(n));
    }
    const dialogShot = async (n: string, open: () => Promise<void>) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForLoadState('networkidle');
      await shoot(page, name(n), false);
      await page.keyboard.press('Escape');
    };
    await page.goto(at('word?w=left'));
    await settle(page, page.getByRole('article').first());
    await dialogShot('deck-picker', () => page.getByRole('article').first().getByRole('button').last().click());
    await page.goto(at('word?w=profit'));
    await settle(page, page.getByRole('article').first());
    await dialogShot('sentence', () => page.getByRole('region').first().getByRole('button').last().click());
    await page.goto(at(''));
    await settle(page);
    await dialogShot('add-went', async () => {
      await page.keyboard.press('n');
      await page.getByRole('dialog').getByRole('textbox').first().fill('went');
      await page.waitForTimeout(800);
    });
    await page.goto(at('lookup?level=B1&topic=business'));
    await settle(page, page.getByRole('listitem').first());
    await dialogShot('bulk', () => page.getByRole('button', { name: locale === 'vi' ? 'Thêm cả loạt vào nhóm' : 'Add them all to a deck' }).click());
  }
  await setLanguage(page, 'vi');
}

/**
 * M4: Practice, the customise dialog, Weak words, History, My reports, Plans with sessions left; then one session (the learner's
 * last Free session today) shot question by question, the summary, and Practice with no session left (K/55).
 */
async function m4(page: Page) {
  const dialogShot = async (name: string, open: () => Promise<void>) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await shoot(page, name, false);
    await page.keyboard.press('Escape');
  };
  for (const { locale, scheme } of COMBOS) {
    await setLanguage(page, locale);
    await page.emulateMedia({ colorScheme: scheme });
    const at = (path: string) => `/${locale}/app/${path}`;
    const name = (n: string) => `${locale}-${scheme}-${n}`;
    for (const [path, n] of [
      ['practice', 'practice'],
      ['practice/weak', 'weak'],
      ['plans', 'plans'],
    ] as const) {
      await page.goto(at(path));
      await settle(page);
      await shoot(page, name(n));
    }
    await page.goto(at('practice'));
    await settle(page);
    await dialogShot(name('customize'), () => page.getByRole('button', { name: /^(Tùy chỉnh|Customize): / }).first().click());
  }
  await setLanguage(page, 'vi');
  await page.goto('/vi/app/practice');
  await settle(page);
  await page.getByRole('button', { name: /^Bắt đầu/ }).first().click();
  await expect(page).toHaveURL(/practice\/session/, { timeout: 60_000 });
  for (const { locale, scheme } of COMBOS) {
    await setLanguage(page, locale);
    await page.emulateMedia({ colorScheme: scheme });
    const name = (n: string) => `${locale}-${scheme}-${n}`;
    await page.goto(`/${locale}/app/practice/session`);
    await settle(page, page.getByRole('progressbar').first());
    await shoot(page, name('session-question'), false);
    const box = page.getByRole('textbox');
    if (await box.count()) {
      await box.fill('zzzq');
      await box.press('Enter');
    } else await page.keyboard.press('1');
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');
    await shoot(page, name('session-answered'), false);
    await page.goto(`/${locale}/app/practice`);
    await settle(page);
    await shoot(page, name('practice-out'));
  }
  await setLanguage(page, 'vi');
  await page.goto('/vi/app/practice/session');
  await settle(page, page.getByRole('progressbar').first());
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  await shoot(page, 'vi-light-summary');
}

/** M4b on a learner made with `learner:setup --plan pro --transactions`: the history and one row's detail. */
async function m4b(page: Page) {
  for (const { locale, scheme } of COMBOS) {
    await setLanguage(page, locale);
    await page.emulateMedia({ colorScheme: scheme });
    const name = (n: string) => `${locale}-${scheme}-${n}`;
    await page.goto(`/${locale}/app/settings/transactions`);
    // One list per month since M7.6: a row is a button whose name ends with "Xem chi tiết" / "See details".
    const rows = page.getByRole('button', { name: /(Xem chi tiết|See details)$/ });
    await settle(page, rows.first());
    await shoot(page, name('transactions'));
    await rows.nth(2).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await shoot(page, name('transaction-detail'), false);
    await page.keyboard.press('Escape');
  }
  await setLanguage(page, 'vi');
}

/** M5a on a Pro learner with a deck (learner:setup --plan pro, fake AI): the setup with AI on, an AI question, its hint and result. */
async function m5a(page: Page) {
  await page.addInitScript(() => localStorage.setItem('wordmet-web.ai-types', 'on'));
  for (const { locale, scheme } of COMBOS) {
    await setLanguage(page, locale);
    await page.emulateMedia({ colorScheme: scheme });
    const name = (n: string) => `${locale}-${scheme}-${n}`;
    await page.goto(`/${locale}/app/practice`);
    await settle(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: /^(Tùy chỉnh|Customize): / }).last().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await shoot(page, name('customize-ai'), false);
    await page.getByRole('dialog').getByRole('button', { name: /^(Bắt đầu|Start)/ }).click();
    await expect(page).toHaveURL(/practice\/session/, { timeout: 60_000 });
    await settle(page, page.getByRole('progressbar').first());
    await shoot(page, name('ai-question'), false);
    const hint = page.getByRole('button', { name: /^(Gợi ý|Hint)/ });
    if (await hint.count()) {
      await hint.first().click();
      await page.waitForLoadState('networkidle');
    }
    const box = page.getByRole('textbox');
    if (await box.count()) {
      await box.fill('deploy');
      await box.press('Enter');
    } else await page.keyboard.press('1');
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');
    await shoot(page, name('ai-answered'), false);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForLoadState('networkidle');
  }
  await setLanguage(page, 'vi');
}

/**
 * K/85–K/88: the AI lookup panel, its result, edit before saving, then the saved word's page; the word is deleted at the end so the
 * run can be repeated (one made-up word per combination: the fake AI suggests the word it was asked).
 */
async function m5b(page: Page) {
  for (const [i, { locale, scheme }] of COMBOS.entries()) {
    await setLanguage(page, locale);
    await page.emulateMedia({ colorScheme: scheme });
    const name = (n: string) => `${locale}-${scheme}-${n}`;
    const word = `rizz${'abcd'[i]}`;
    await page.goto(`/${locale}/app`);
    await settle(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press('n');
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('textbox', { name: locale === 'vi' ? 'Từ' : 'Word', exact: true }).fill(word);
    await sheet.getByRole('textbox', { name: /^(Câu bạn gặp|Sentence you saw)/ }).fill(`That guy has so much ${word}.`);
    const ai = sheet.getByRole('button', { name: /^(Tra bằng AI|Look up with AI)$/ });
    await expect(ai).toBeVisible();
    await page.waitForLoadState('networkidle');
    await shoot(page, name('ai-lookup'), false);
    await ai.click();
    await expect(sheet.getByRole('heading', { level: 3 })).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState('networkidle');
    await shoot(page, name('ai-result'), false);
    await sheet.getByRole('button', { name: /^(Sửa rồi lưu|Edit and save)$/ }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('dialog').getByRole('button', { name: /(Trình độ|Level)/ }).click();
    await page.getByRole('option', { name: 'B2' }).click();
    if (await page.getByText(/^(Chọn nhóm|Choose a deck)$/).count()) {
      await page.getByRole('button', { name: /^(Lưu vào nhóm|Save to deck)/ }).click();
      await page.getByRole('radio').first().click({ force: true });
      await page.getByRole('button', { name: /^(Chọn|Choose) / }).click();
    }
    await shoot(page, name('ai-edit'), false);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('dialog').getByRole('button', { name: /^(Lưu từ|Save word)$/ }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 30_000 });
    await page.goto(`/${locale}/app/word?w=${word}`);
    await settle(page);
    await shoot(page, name('my-word'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: /^(Xóa từ|Delete word)$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^(Xóa từ|Delete word)$/ }).click();
    await expect(page).toHaveURL(/\/app\/lookup$/, { timeout: 30_000 });
  }
  await setLanguage(page, 'vi');
}

/**
 * Giao diện mới M8b (plan Part 8, Task M8.9): the public pages, signed out, vi, light and dark, 390 / 1024 / 1440 px. Each page is loaded at
 * its width and scrolled through first, so every section that comes in on scroll has come in; the shot waits for the entrances to end
 * (the endless loops keep running). With the real API the legal pages show the published text and Nguồn dữ liệu its sources.
 */
async function gmM8(page: Page, opts?: ShotOpts) {
  const pages = [['/vi', 'home'], ['/vi/privacy', 'privacy'], ['/vi/terms', 'terms'], ['/vi/sources', 'sources'], ['/vi/khong-ton-tai', '404']] as const;
  const out: Where = opts ?? WIDTHS;
  for (const scheme of opts ? [opts.scheme] : (['light', 'dark'] as const)) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const [path, name] of pages) {
      for (const width of widthsOf(out)) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await settle(page);
        // Slowly, so each section is on screen for a frame and its observer sees it (a fast fling skips some).
        for (let y = 0; y < 14000; y += 400) {
          await page.mouse.wheel(0, 400);
          await page.waitForTimeout(120);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect
          .poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length))
          .toBe(0);
        // `animations: 'disabled'` stops the endless loops for the capture: with them running, a full-page capture drew the "Nghe và đọc
        // phiên âm" card blurred although the page had it in place (R247).
        await page.screenshot({ path: shotPath(out, opts ? name : `vi-${scheme}-${name}`, width), fullPage: true, animations: 'disabled' });
      }
    }
  }
}

/**
 * M9.6 (design §9 M5, Figma 131:3890 / 140:4049 / 141:4147 Tùy chỉnh phiên): the practice screens. The Figma ids only name the frames here; every
 * wait is by role and text read from the screens. Needs a learner with a deck that has words (gm-m3 makes one) and practice sessions left for
 * the day (a Free learner has 3; the run opens one Luyện session per scheme). A locked AI row is shot as it shows.
 * Frames: Luyện tập; Tùy chỉnh phiên three times (default, AI questions added, one group with its stage menu open); a session of typed-word
 * questions (question, hint panel, "Chưa đúng", the round prompt when the deck has fewer words than questions, summary); Từ hay sai; Ôn
 * (question, answer, result, summary); Học (front, back, summary).
 */
async function gmM5(page: Page, opts?: ShotOpts) {
  const out: Where = opts ?? [390, 1440];
  const widths = widthsOf(out);
  await signIn(page);
  const dialog = page.getByRole('dialog', { name: /Tùy chỉnh phiên/ });
  const customize = async (width: number, source: 'Luyện tất cả' | 'Theo nhóm') => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/vi/app/practice');
    await settle(page);
    await page.getByRole('button', { name: new RegExp(`^Tùy chỉnh: ${source}`) }).click();
    await expect(dialog).toBeVisible();
    await page.waitForLoadState('networkidle');
  };

  await page.goto('/vi/app/practice');
  await settle(page);
  // A session left open by an earlier pass (or a failed one) would keep "Bắt đầu" from opening a new one: end it first.
  const resume = page.getByRole('region', { name: 'Phiên đang dở' }).getByRole('link');
  if (await resume.count()) {
    await resume.click();
    await page.getByRole('button', { name: 'Dừng phiên, xem tổng kết' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /^Xong \d+ câu\.$/ })).toBeVisible({ timeout: 30_000 });
    await page.goto('/vi/app/practice');
    await settle(page);
  }
  await shoot(page, 'practice', true, out);
  for (const width of widths) {
    // 131:3890: the setup as it opens.
    await customize(width, 'Luyện tất cả');
    await shoot(page, 'customize-default', false, only(out, width));
    // 140:4049: AI-written questions added (the plus is locked when the plan has no AI questions left; the frame is shot as it is).
    const plus = dialog.getByRole('button', { name: 'Câu AI viết: thêm 1' });
    for (let i = 0; i < 3 && (await plus.isEnabled()); i++) await plus.click();
    await shoot(page, 'customize-ai', false, only(out, width));
    await page.keyboard.press('Escape');
    // 141:4147: one group, with the stage menu open.
    await customize(width, 'Theo nhóm');
    await dialog.getByRole('button', { name: /Chỉ một ngăn/ }).click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await shoot(page, 'customize-group-stage', false, only(out, width));
    await page.keyboard.press('Escape');
  }

  // A session of typed-word questions only (a field, hint and "Xem đáp án"), as many questions as the setup allows.
  await customize(widths[widths.length - 1], 'Luyện tất cả');
  for (const type of ['Trắc nghiệm', 'Đúng/sai']) await dialog.getByRole('checkbox', { name: type, exact: true }).setChecked(false, { force: true });
  const more = dialog.getByRole('button', { name: 'Số câu: thêm 1' });
  while (await more.isEnabled()) await more.click();
  await dialog.getByRole('button', { name: /^Bắt đầu/ }).click();
  await expect(page).toHaveURL(/practice\/session$/, { timeout: 60_000 });
  const field = page.getByRole('textbox', { name: 'Câu trả lời' });
  await expect(field).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
  await shoot(page, 'session-question', false, out);
  const hint = page.getByRole('button', { name: /^Gợi ý/ }).first();
  if (await hint.count()) {
    await hint.click();
    await expect(page.getByRole('heading', { level: 3, name: /^Gợi ý \d+\/\d+/ })).toBeVisible();
    await shoot(page, 'session-hint', false, out);
  } else missed('gm-m5 session-hint', 'the question has no Gợi ý button');
  const wrong = async () => {
    await field.fill('zzzqx');
    await field.press('Enter');
    await page.getByRole('button', { name: 'Xem đáp án' }).click();
    await expect(page.getByText('Chưa đúng').first()).toBeVisible();
  };
  await wrong();
  await shoot(page, 'session-wrong', false, out);
  const summary = page.getByRole('heading', { level: 1, name: /^Xong \d+ câu\.$/ });
  // Stop the session here: stepping through every question clicked "Câu tiếp" while it re-rendered and hung the set, and a session
  // left open stops the next pass from starting its own. The round prompt ("Bạn đã làm hết N từ") is shot only when it is already up.
  const round = page.getByRole('heading', { level: 1, name: /^Bạn đã làm hết \d+ từ$/ });
  if (await round.isVisible()) await shoot(page, 'session-round', false, out);
  else missed('gm-m5 session-round', 'the session was stopped after the first wrong answer, before the round prompt');
  await page.getByRole('button', { name: 'Dừng phiên, xem tổng kết' }).click();
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await shoot(page, 'session-summary', true, out);

  await page.goto('/vi/app/practice/weak');
  await settle(page);
  await shoot(page, 'weak', true, out);

  // Ôn and Học of the first deck.
  await page.goto('/vi/app/groups');
  await settle(page);
  const deck = new URL((await page.getByRole('region', { name: 'Các nhóm của bạn' }).getByRole('link').first().getAttribute('href'))!, 'http://x').searchParams.get('id')!;
  await page.goto(`/vi/app/recall?group=${deck}`);
  await expect(page.getByText(/^Ôn · /)).toBeVisible({ timeout: 60_000 });
  const typed = page.getByRole('textbox', { name: 'Câu trả lời' });
  await expect(typed.or(page.getByRole('button', { name: 'Dừng phiên, xem tổng kết' }))).toBeVisible();
  await page.waitForLoadState('networkidle');
  await shoot(page, 'recall-question', false, out);
  if (await typed.isVisible()) {
    await typed.fill('zzzqx');
    await shoot(page, 'recall-answer', false, out);
    await typed.press('Enter');
    await page.getByRole('button', { name: 'Xem đáp án' }).click();
  } else await page.keyboard.press('1');
  await expect(page.getByRole('button', { name: /^(Câu tiếp|Cần ôn lại|Đã biết)/ }).first()).toBeVisible({ timeout: 30_000 });
  await shoot(page, 'recall-result', false, out);
  await page.getByRole('button', { name: 'Dừng phiên, xem tổng kết' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Xong \d+ từ\.$/ })).toBeVisible({ timeout: 30_000 });
  await shoot(page, 'recall-summary', true, out);

  await page.goto(`/vi/app/review?group=${deck}&mode=all`);
  await expect(page.getByRole('group', { name: /^Thẻ 1 trên \d+$/ })).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
  await shoot(page, 'learn-front', false, out);
  await page.keyboard.press(' ');
  await expect(page.getByRole('button', { name: /Đã biết/ })).toBeVisible();
  await shoot(page, 'learn-back', false, out);
  await page.keyboard.press('2');
  await page.getByRole('button', { name: 'Đóng phiên ôn' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Xong \d+ thẻ\.$/ })).toBeVisible({ timeout: 30_000 });
  await shoot(page, 'learn-summary', true, out);
}

/**
 * M9.6 (QM9-5): every screen of the new UI, light and dark, at 390 / 768 / 1024 / 1440 px, to `test-results/shots/gm-m9/<set>/`. Per scheme: the
 * pages that need no account (public pages, sign-in and account pages), then one sign-in and the signed-in sets. The session cookie is cleared
 * between schemes so the second pass starts signed out too. gm-m7a wants a learner on Pro with transactions and gm-m7b a trial learner; one
 * account cannot be both, so the other one is listed as `chưa chụp` in the annotations and the run goes on.
 */
async function gmM9(page: Page) {
  const widths = [390, 768, 1024, 1440];
  let shot = 0;
  // Each set runs on its own: a set the learner cannot reach (gm-m7a and gm-m7b want different plans) is listed as missed and the run goes on.
  // The test fails at the end only when no set was shot at all, so one run gives the most shots and the annotations show what is missing.
  // `counts` is false for the sign-in: it shoots nothing, so it must not make "nothing was shot" pass.
  const attempt = async (label: string, run: () => Promise<void>, counts = true) => {
    // SHOTS_ONLY=gm-m5 re-runs just the sets whose label contains it (and always the sign-in).
    if (process.env.SHOTS_ONLY && !label.includes(process.env.SHOTS_ONLY) && !label.includes('sign-in')) return;
    try {
      await run();
      if (counts) shot++;
    } catch (error) {
      missed(label, error instanceof Error ? error.message : String(error));
      // Leave nothing open for the next set: a dialog or a desktop-sized viewport would break its first step.
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.setViewportSize({ width: 1440, height: 900 }).catch(() => undefined);
    } finally {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  };
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    // Signed out for real: the session cookie and anything the app keeps in the browser, then the login page must show.
    await page.context().clearCookies();
    signedIn.delete(page);
    await page.goto('/vi/app/login');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/vi/app/login');
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({ timeout: 60_000 });
    const of = (set: string): ShotOpts => ({ dir: `gm-m9/${set}`, widths, scheme });
    await attempt(`${scheme} gm-m8`, () => gmM8(page, of('gm-m8')));
    await attempt(`${scheme} gm-m1 signed out`, () => gmM1(page, of('gm-m1'), 'out'));
    await attempt(`${scheme} gm-m2 signed out`, () => gmM2(page, of('gm-m2'), 'out'));
    await attempt(
      `${scheme} sign-in`,
      async () => {
        await signIn(page);
      },
      false,
    );
    await attempt(`${scheme} gm-m1`, () => gmM1(page, of('gm-m1'), 'in'));
    await attempt(`${scheme} gm-m2`, () => gmM2(page, of('gm-m2'), 'in'));
    await attempt(`${scheme} gm-m3`, () => gmM3(page, of('gm-m3')));
    await attempt(`${scheme} gm-m4`, () => gmM4(page, of('gm-m4')));
    await attempt(`${scheme} gm-m5`, () => gmM5(page, of('gm-m5')));
    await attempt(`${scheme} gm-m6`, () => gmM6(page, of('gm-m6')));
    await attempt(`${scheme} gm-m7a`, () => gmM7a(page, of('gm-m7a')));
    await attempt(`${scheme} gm-m7b`, () => gmM7b(page, of('gm-m7b')));
  }
  expect(shot, 'no set could be shot').toBeGreaterThan(0);
}
