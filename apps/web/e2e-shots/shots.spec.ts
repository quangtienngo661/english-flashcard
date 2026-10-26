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

/** A page is shot full length; a page with a dialog open only as the window shows it (a full-length shot redraws the dialog half see-through). */
async function shoot(page: Page, name: string, fullPage = true) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    // A dialog switches between sheet and centred box at 768 px and animates in again; shoot it once it has settled.
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length))
      .toBe(0);
    await page.screenshot({ path: `test-results/shots/${MILESTONE}/${name}-${width}.png`, fullPage });
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
  await page.goto('/vi/app/login');
  await settle(page);
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 60_000 });
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
  await page.getByRole('button', { name: /^Thêm cả \d+ từ$/ }).click();
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
      ['practice/history', 'history'],
      ['practice/history?tab=reports', 'reports'],
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
    await settle(page, page.getByRole('list').getByRole('button').first());
    await shoot(page, name('transactions'));
    await page.getByRole('list').getByRole('button').nth(2).click();
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
    await page.getByRole('button', { name: /^(Trình độ|Level)/ }).click();
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
