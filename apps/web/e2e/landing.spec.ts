import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { FALLBACK_LANDING_DATA } from '../src/site/landing/landing-data.fallback';
import { copy } from './copy';
import { seriousViolations } from './support/axe';
import { PUBLISHED } from './support/published';

// The public pages rebuilt from Figma in M8b (plan 2026-11-10 Part 8, Task M8.9): criteria LR20–LR30, LR50 and the M8 checks. Every string
// comes from the message files or the fallback FAQ (the e2e build reads no API for the landing, LANDING_DATA_SOURCE=fallback).
const L = copy.vi.Landing;
const N = copy.vi.Nav;
const BRAND = copy.vi.App.chrome.brand;
const HERO_TITLE = `${L.hero.line1} ${L.hero.line2}`;
const SECTION_TITLES = [L.groups.title, L.learn.title, L.plans.title, L.faq.title, L.final.title];
const PAGES = ['/vi', '/vi/privacy', '/vi/terms', '/vi/sources', '/vi/khong-ton-tai'];
// The same pages with a published legal text and data sources behind the server reads (support/public-api.mjs).
const PUBLISHED_PAGES = ['/vi/privacy', '/vi/terms', '/vi/sources'].map((path) => `${PUBLISHED}${path}`);
// The Intl call of the home page and Gói học (R202): "79.000 ₫" with a no-break space.
const vnd = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

declare global {
  interface Window {
    __cspViolations: string[];
    __themes: string[];
  }
}

const desktopOnly = (testInfo: TestInfo) => test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport widths');

/** React has attached its handlers to the theme controls: a click before this is lost. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const group = document.querySelector('footer [role="radiogroup"]');
    return Boolean(group) && Object.keys(group as Element).some((key) => key.startsWith('__reactProps'));
  });

const open = async (page: Page, path = '/vi') => {
  await page.goto(path);
  await hydrated(page);
};

/** Scrolls to the end and back, so every section that comes in on scroll has come in, then waits for the finite animations to end. */
const scrollThrough = async (page: Page) => {
  for (let y = 0; y < 14000; y += 500) await page.mouse.wheel(0, 500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));
};

/** Picks dark the way the screen offers it: the header button from md, the footer's "Giao diện" control below. */
const chooseDark = async (page: Page) => {
  const button = page.getByRole('banner').getByRole('button', { name: N.themeToDark });
  if (await button.isVisible()) await button.click();
  else await page.getByRole('contentinfo').getByRole('radiogroup', { name: N.theme }).getByText(N.dark, { exact: true }).click();
};

test.describe('LR20 sign-up', () => {
  test('Đăng ký in the header and every sign-up button of the home page go to the registration page', async ({ page }) => {
    await page.goto('/vi');
    await expect(page.getByRole('banner').getByRole('link', { name: N.signup, exact: true })).toHaveAttribute('href', '/vi/app/register');
    const main = page.getByRole('main');
    for (const name of [L.hero.signup, L.plans.freeSignup, L.plans.proSignup, L.final.signup]) {
      await expect(main.getByRole('link', { name, exact: true }).first(), name).toHaveAttribute('href', '/vi/app/register');
    }
    await main.getByRole('region', { name: HERO_TITLE }).getByRole('link', { name: L.hero.signup }).click();
    await expect(page).toHaveURL(/\/vi\/app\/register$/);
  });
});

test.describe('LR21 the English landing', () => {
  test('/en is a 307 to /vi, and /vi offers no English link', async ({ page, request }) => {
    const res = await request.get('/en', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(new URL(res.headers().location, 'http://x').pathname).toBe('/vi');
    await page.goto('/vi');
    await expect(page.getByRole('link', { name: /english/i })).toHaveCount(0);
  });

  test('the query string survives the redirect', async ({ request }) => {
    const res = await request.get('/en?ref=x', { maxRedirects: 0 });
    expect(new URL(res.headers().location, 'http://x').search).toBe('?ref=x');
  });
});

test.describe('LR22 no sideways scroll', () => {
  for (const width of [320, 390, 768, 1440]) {
    test(`at ${width} px no public page is wider than the window`, async ({ page }, testInfo) => {
      desktopOnly(testInfo);
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      for (const path of [...PAGES, ...PUBLISHED_PAGES]) {
        await page.goto(path);
        await scrollThrough(page);
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
        expect(scrollWidth, `${path}: page width`).toBeLessThanOrEqual(innerWidth);
      }
    });
  }
});

test.describe('LR23 the theme follows the visitor into the app', () => {
  test('dark chosen on the home page is still dark after a reload and on the login page', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await chooseDark(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('wordmet-web.theme'))).toBe('dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('banner').getByRole('link', { name: N.login, exact: true }).click();
    await expect(page).toHaveURL(/\/vi\/app\/login$/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('LR24 a dark system gets a dark first paint', () => {
  test.use({ colorScheme: 'dark' });

  test('no light value is ever set on <html> when nothing was chosen', async ({ page }) => {
    await page.addInitScript(() => {
      window.__themes = [];
      new MutationObserver(() => {
        window.__themes.push(document.documentElement.getAttribute('data-theme') ?? '');
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
    });
    await open(page);
    const themes = await page.evaluate(() => window.__themes);
    expect(themes.length).toBeGreaterThan(0);
    expect(themes.filter((theme) => theme !== 'dark')).toEqual([]);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgb(255, 255, 255)');
  });
});

/** Text of `main` that is drawn see-through, or whose box sits under a see-through ancestor (an entrance that never ended). */
const faded = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    let checked = 0;
    for (const el of document.querySelectorAll<HTMLElement>('main h1, main h2, main h3, main p, main a, main details')) {
      const box = el.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1 || el.closest('[aria-hidden="true"]')) continue;
      checked++;
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        // An entrance that ended may leave `blur(0px)` behind: that draws nothing.
        if (style.opacity !== '1' || !['none', 'blur(0px)'].includes(style.filter)) {
          out.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}": opacity ${style.opacity}, filter ${style.filter} on ${node.tagName.toLowerCase()}`);
          break;
        }
      }
    }
    return { checked, out };
  });

test.describe('LR25 reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const path of PAGES) {
    test(`${path}: nothing animates after load, and every text is in place at full opacity`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      for (let y = 0; y < 14000; y += 500) await page.mouse.wheel(0, 500);
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => document.getAnimations().map((a) => (a as CSSAnimation).animationName ?? a.id ?? 'animation'))).toEqual([]);
      const { checked, out } = await faded(page);
      // The control: the page had text to look at, so an empty list means "all in place", not "nothing found".
      expect(checked).toBeGreaterThanOrEqual(3);
      expect(out).toEqual([]);
    });
  }

  test('the home page shows every section heading', async ({ page }) => {
    await page.goto('/vi');
    await expect(page.getByRole('heading', { level: 1, name: HERO_TITLE })).toBeVisible();
    for (const title of SECTION_TITLES) await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
  });
});

test.describe('LR35 the page moves when motion is allowed', () => {
  // The control of LR25: the same instrument finds animations here, so its empty list there means "none ran".
  test('the home page starts animations on load, and the entrances end with the hero in place', async ({ page }) => {
    await page.goto('/vi');
    expect(await page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));
    const hero = await faded(page);
    expect(hero.out.filter((line) => line.startsWith('h1') || line.includes(L.hero.lead.slice(0, 20)))).toEqual([]);
  });
  // The 404's entrance is not checked: a directly loaded 404 is drawn on the client, without the head script's `js` class (R239).
});

test.describe('LR26 without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the home page shows every section heading, the three prices and a FAQ that opens natively', async ({ page }) => {
    await page.goto('/vi');
    await expect(page.getByRole('heading', { level: 1, name: HERO_TITLE })).toBeVisible();
    for (const title of SECTION_TITLES) await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();

    const plans = page.getByRole('region', { name: L.plans.title });
    for (const amount of Object.values(FALLBACK_LANDING_DATA.prices)) await expect(plans.getByText(vnd(amount), { exact: true })).toBeVisible();

    const item = (question: string) => page.getByRole('region', { name: L.faq.title }).locator('details', { hasText: question });
    const [first, second] = FALLBACK_LANDING_DATA.faq;
    await expect(item(first!.question)).toHaveJSProperty('open', true);
    await expect(item(first!.question).getByText(first!.answer)).toBeVisible();
    await item(second!.question).getByText(second!.question).click();
    await expect(item(second!.question)).toHaveJSProperty('open', true);
    await expect(item(first!.question)).toHaveJSProperty('open', false);
    await expect(item(second!.question).getByText(second!.answer)).toBeVisible();
  });

  test('a published legal page lists its contents as plain links that work', async ({ page }) => {
    await page.goto(`${PUBLISHED}/vi/privacy`);
    const contents = page.getByRole('navigation', { name: copy.vi.Legal.contents });
    await expect(contents.getByRole('link')).toHaveText([
      '1. Dữ liệu Wordmet thu thập',
      '2. Wordmet dùng dữ liệu vào việc gì',
      '3. Chia sẻ dữ liệu với ai',
      '4. Quyền của bạn',
      '5. Liên hệ',
    ]);
    await expect(contents.getByRole('button', { name: copy.vi.Legal.contentsOpen })).toBeHidden();
    await contents.getByRole('link', { name: '4. Quyền của bạn' }).click();
    await expect(page).toHaveURL(/#4-quyen-cua-ban$/);
    await expect(page.getByRole('heading', { level: 2, name: '4. Quyền của bạn' })).toBeInViewport();
  });

  // The 404 is left out: without JavaScript its body is empty (Next renders notFound() of the catch-all on the client; R239).
  test('the draft legal page shows its notice', async ({ page }) => {
    await page.goto('/vi/terms');
    await expect(page.getByRole('heading', { level: 1, name: copy.vi.Legal.termsTitle })).toBeVisible();
    await expect(page.getByRole('main')).toContainText(copy.vi.Legal.draftNotice);
  });
});

test.describe('LR27 axe on the states a visitor opens', () => {
  // LP25 in a11y.spec.ts scans every public page as it loads; these are the states behind a click.
  for (const scheme of ['light', 'dark'] as const) {
    test(`no serious or critical violation in ${scheme}: the second FAQ answer open, and the phone contents list open`, async ({ page }) => {
      // Two whole-page axe scans after the home page is scrolled through.
      test.setTimeout(90_000);
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      await scrollThrough(page);
      const faq = page.getByRole('region', { name: L.faq.title });
      await faq.getByText(FALLBACK_LANDING_DATA.faq[1]!.question).click();
      await expect(faq.locator('details[open]')).toHaveCount(1);
      expect(await seriousViolations(page)).toEqual([]);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${PUBLISHED}/vi/terms`);
      await page.getByRole('button', { name: copy.vi.Legal.contentsOpen }).click();
      await expect(page.getByRole('button', { name: copy.vi.Legal.contentsOpen })).toHaveAttribute('aria-expanded', 'true');
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});

test.describe('LR28 content security policy', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        window.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI} ${e.sample}`);
      });
    });
  });

  test('the home page, used in both themes, and a published legal page raise no violation', async ({ page }) => {
    test.setTimeout(60_000);
    await open(page);
    await scrollThrough(page);
    await page.getByRole('region', { name: L.faq.title }).getByText(FALLBACK_LANDING_DATA.faq[2]!.question).click();
    await chooseDark(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);

    await page.goto(`${PUBLISHED}/vi/privacy`);
    // Below lg the contents open from the pill first.
    const pill = page.getByRole('button', { name: copy.vi.Legal.contentsOpen });
    if (await pill.isVisible()) await pill.click();
    await page.getByRole('navigation', { name: copy.vi.Legal.contents }).getByRole('link', { name: '3. Chia sẻ dữ liệu với ai' }).click();
    await expect(page).toHaveURL(/#3-chia-se-du-lieu-voi-ai$/);
    await page.mouse.wheel(0, 1500);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
  });
});

test.describe('LR33 the page anchors work from the legal pages', () => {
  test('the header link Giá on a legal page leads to the prices on the home page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the page anchors are in the header from md up');
    await page.goto('/vi/terms');
    await page.getByRole('banner').getByRole('link', { name: N.pricing }).click();
    await expect(page).toHaveURL(/\/vi#gia$/);
    await expect(page.getByRole('region', { name: L.plans.title })).toBeInViewport();
  });
});

test.describe('LR50 touch targets on phones', () => {
  /**
   * Visible controls lower than 44 px. Left out: links inside running text (WCAG 2.5.8's inline exception) and anything clipped out of
   * sight (the skip link until it is focused: `sr-only` with its own padding, so a 32 × 24 box drawn as nothing).
   */
  const small = (page: Page) =>
    page.evaluate(() => {
      const out: string[] = [];
      let checked = 0;
      for (const el of document.querySelectorAll<HTMLElement>('a[href], button, summary, label:has(input[type="radio"])')) {
        const box = el.getBoundingClientRect();
        if (box.width <= 1 || box.height <= 1 || el.closest('[aria-hidden="true"]')) continue;
        const style = getComputedStyle(el);
        if ((el.tagName === 'A' && style.display === 'inline') || style.clipPath === 'inset(50%)') continue;
        checked++;
        if (box.height < 44) out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(box.height)} px high`);
      }
      return { checked, out };
    });

  test('on a 390 px phone every control of every public page is at least 44 px high', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the phone project (390 px, touch)');
    for (const path of [...PAGES, ...PUBLISHED_PAGES]) {
      await page.goto(path);
      // Measured once the entrances have ended (a button caught mid-entrance is scaled down).
      await scrollThrough(page);
      const { checked, out } = await small(page);
      expect(checked, `${path}: controls found`).toBeGreaterThan(5);
      expect(out, path).toEqual([]);
    }
    // The phone contents list, opened.
    await page.goto(`${PUBLISHED}/vi/privacy`);
    await page.getByRole('button', { name: copy.vi.Legal.contentsOpen }).click();
    expect((await small(page)).out, 'contents open').toEqual([]);
    await page.goto('/vi/app/login');
    const forgot = await page.getByRole('link', { name: copy.vi.App.auth.login.forgot }).boundingBox();
    expect(forgot!.height, 'Quên mật khẩu?').toBeGreaterThanOrEqual(44);
  });
});

test.describe('M8 the header on a phone', () => {
  // The phone project at its own 390 px; the desktop project narrows to 320.
  test('the bar holds the logo, Đăng nhập and Đăng ký, each 44 px high, and nothing spills', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'desktop') await page.setViewportSize({ width: 320, height: 844 });
    const width = page.viewportSize()!.width;
    await page.goto('/vi');
    const banner = page.getByRole('banner');
    const bar = (await banner.boundingBox())!;
    for (const link of [banner.getByRole('link', { name: BRAND }), banner.getByRole('link', { name: N.login, exact: true }), banner.getByRole('link', { name: N.signup, exact: true })]) {
      const box = (await link.boundingBox())!;
      expect(box.height, `${await link.textContent()}: height`).toBeGreaterThanOrEqual(44);
      expect(box.x, 'left edge').toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, 'right edge').toBeLessThanOrEqual(width);
      expect(box.y + box.height, 'inside the bar').toBeLessThanOrEqual(bar.y + bar.height);
    }
    for (const name of [N.groups, N.howTo, N.pricing]) await expect(banner.getByRole('link', { name })).toBeHidden();
    await expect(banner.getByRole('button', { name: N.themeToDark })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
});

test.describe('M8 the theme switch moves to the footer below 768 px', () => {
  // The phone project checks its own 390 px; the desktop project sweeps across the 768 px edge.
  test('the footer "Giao diện" control shows only below 768 px, the header button from 768 px', async ({ page }, testInfo) => {
    await page.goto('/vi');
    const footerSwitch = page.getByRole('contentinfo').getByRole('radiogroup', { name: N.theme });
    const headerButton = page.getByRole('banner').getByRole('button', { name: N.themeToDark });
    const widths = testInfo.project.name === 'mobile' ? ([[390, true]] as const) : ([[767, true], [768, false], [1440, false]] as const);
    for (const [width, below] of widths) {
      await page.setViewportSize({ width, height: 900 });
      if (below) {
        await expect(footerSwitch, `${width} px`).toBeVisible();
        await expect(headerButton, `${width} px`).toBeHidden();
      } else {
        await expect(footerSwitch, `${width} px`).toBeHidden();
        await expect(headerButton, `${width} px`).toBeVisible();
      }
    }
  });
});

test.describe('M8 pricing and FAQ on the fallback build', () => {
  test('the 3 and 12 month rows show −16% and −37%, the 1 month row no saving, and 12 months is the best', async ({ page }) => {
    await page.goto('/vi');
    const periods = page.getByRole('region', { name: L.plans.title }).getByRole('listitem').filter({ hasText: /tháng/ }).filter({ hasText: '₫' });
    await expect(periods).toHaveCount(3);
    await expect(periods.nth(0)).not.toContainText('−');
    await expect(periods.nth(1).getByText('−16%', { exact: true })).toBeVisible();
    await expect(periods.nth(2).getByText('−37%', { exact: true })).toBeVisible();
    await expect(periods.nth(2).getByText(L.plans.best, { exact: true })).toBeVisible();
    await expect(page.getByText(L.plans.best, { exact: true })).toHaveCount(1);
  });

  test('the FAQ has the six fallback questions in order, the first open', async ({ page }) => {
    await page.goto('/vi');
    const items = page.getByRole('region', { name: L.faq.title }).locator('details');
    await expect(items).toHaveCount(6);
    await expect(items.locator('summary')).toHaveText(FALLBACK_LANDING_DATA.faq.map((item) => item.question));
    await expect(items.first()).toHaveJSProperty('open', true);
  });
});

test.describe('M8 the 404 has no header', () => {
  test('/vi/khong-ton-tai has a main and a footer but no banner landmark', async ({ page }) => {
    await page.goto('/vi/khong-ton-tai');
    await expect(page.getByRole('heading', { level: 1, name: copy.vi.NotFound.title })).toBeVisible();
    // The control: the other landmarks are found, so the missing banner is absent and not unreadable.
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(0);
    await page.goto('/vi/terms');
    await expect(page.getByRole('banner')).toHaveCount(1);
  });
});

test.describe('LR30 no waitlist', () => {
  test('/vi has no email field and sends nothing to a waitlist', async ({ page }) => {
    const sent: string[] = [];
    page.on('request', (request) => {
      if (/waitlist/i.test(request.url()) || /waitlist/i.test(request.postData() ?? '')) sent.push(`${request.method()} ${request.url()}`);
    });
    await open(page);
    await scrollThrough(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    expect(sent).toEqual([]);
  });
});

// Found in M8.9: a server component that imports BUTTON_BASE from the 'use client' Button module gets a client reference, not the string,
// so every ButtonLink of the public pages (all server-rendered) lost its button classes and showed as plain text (R240).
test.describe('M8 the public pages draw their button links as buttons', () => {
  const expectButton = async (link: import('@playwright/test').Locator, variant: 'primary' | 'secondary') => {
    // inline-flex, or flex where a flex container blockifies it (the header row).
    await expect(link).toHaveCSS('display', /^(inline-)?flex$/);
    await expect(link).toHaveCSS('min-height', '44px');
    // Primary is filled with the accent; secondary with the surface: neither is transparent.
    await expect(link).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(link).toHaveAttribute('data-variant', variant);
  };

  test('the header, hero, plans, final card, 404 and legal help box', async ({ page }) => {
    await page.goto('/vi');
    await expectButton(page.getByRole('banner').getByRole('link', { name: N.login, exact: true }), 'secondary');
    await expectButton(page.getByRole('banner').getByRole('link', { name: N.signup, exact: true }), 'primary');
    const main = page.getByRole('main');
    await expectButton(main.getByRole('region', { name: HERO_TITLE }).getByRole('link', { name: L.hero.signup }), 'primary');
    await expectButton(main.getByRole('link', { name: L.hero.howTo }), 'secondary');
    await expectButton(main.getByRole('link', { name: L.plans.proSignup, exact: true }), 'primary');
    await expectButton(main.getByRole('region', { name: L.final.title }).getByRole('link', { name: L.final.signup }), 'primary');
    await page.goto('/vi/khong-ton-tai');
    await expectButton(page.getByRole('link', { name: copy.vi.NotFound.home }), 'primary');
    await page.goto(`${PUBLISHED}/vi/privacy`);
    await expectButton(page.getByRole('region', { name: copy.vi.Legal.privacyHelpTitle }).getByRole('link'), 'primary');
  });
});

// Found in the M8.9 shots: the public pages showed the body's old `--color-surface` (white; #242b3d in dark) instead of Figma's `--bg` ground
// (R244). Read from an empty corner of each page, so the colour is the ground and not a card.
test.describe('M8 the public pages stand on --bg', () => {
  const ground = { light: 'rgb(246, 247, 250)', dark: 'rgb(15, 18, 32)' } as const;
  for (const scheme of ['light', 'dark'] as const) {
    test(`every public page is painted ${ground[scheme]} in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of [...PAGES, `${PUBLISHED}/vi/privacy`]) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        const paint = await page.evaluate(() => {
          // The first painted background under the bottom-left corner of the window, through the stack of boxes there.
          for (const el of document.elementsFromPoint(4, window.innerHeight - 4)) {
            const colour = getComputedStyle(el).backgroundColor;
            if (colour !== 'rgba(0, 0, 0, 0)' && colour !== 'transparent') return colour;
          }
          return 'none';
        });
        expect(paint, path).toBe(ground[scheme]);
      }
    });
  }
});

// Found in the M8.9 shots: at 390 px the review boxes sat in three columns, so "14 ngày" and "30 ngày" broke onto two lines; Figma's phone
// frame (`9:291`) wraps them as pills, 3 + 2 (R245).
test.describe('M8 the review boxes on a phone', () => {
  test('no review box value breaks onto a second line', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the phone project (390 px)');
    await page.goto('/vi');
    const learn = page.getByRole('region', { name: L.learn.title });
    for (const { value } of L.learn.review.bins) {
      const lines = await learn.getByText(value, { exact: true }).evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      });
      expect(lines, value).toBe(1);
    }
  });
});

// Found in the M8.9 shots: at 1024 px the Free (360) and Pro (620) cards side by side are 1004 px wide in 944 px of content, so the row
// stuck out 30 px on each side into the gutters (the section clips it, so the page did not scroll; R248).
test.describe('M8 the plan cards stay inside the page', () => {
  test('from 768 to 1440 px both plan cards keep the page gutters', async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    for (const width of [768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/vi');
      const cards = page.getByRole('region', { name: L.plans.title }).getByRole('article');
      await expect(cards).toHaveCount(2);
      for (const box of [(await cards.nth(0).boundingBox())!, (await cards.nth(1).boundingBox())!]) {
        expect(box.x, `${width} px: left edge`).toBeGreaterThanOrEqual(40);
        expect(box.x + box.width, `${width} px: right edge`).toBeLessThanOrEqual(width - 40);
      }
    }
  });
});
