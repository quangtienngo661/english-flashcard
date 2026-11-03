import { expect, test, type Page } from '@playwright/test';
import { EXERCISES } from '../src/components/landing/exercises/exercise-set';
import { copy } from './copy';
import { seriousViolations } from './support/axe';

// Criteria LR20-LR30 of docs/superpowers/specs/2026-11-03-landing-redesign-design.md. Every string comes from the message files.
const L = copy.vi.Landing;
const TAB_NAMES = [L.showcase.tabs.review, L.showcase.tabs.groups, L.showcase.tabs.practice, L.showcase.tabs.lookup, L.showcase.tabs.addWord];

declare global {
  interface Window {
    __cspViolations: string[];
    __themes: string[];
    __heroMotion: string[];
  }
}

/** React has attached its handlers to the page: a click before this is lost. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const tab = document.querySelector('[role="tab"]');
    return Boolean(tab) && Object.keys(tab as Element).some((key) => key.startsWith('__reactProps'));
  });

/** No finite animation or transition is still running (a card caught mid-flip would measure narrower than it ends up). */
const settle = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));

const open = async (page: Page, path = '/vi') => {
  await page.goto(path);
  await hydrated(page);
};

const exerciseButtons = (page: Page) => page.getByRole('list', { name: L.exercises.list }).getByRole('button');

/** Answers the open exercise wrongly and returns, so the hint, reveal and field states are on screen. */
const answerWrong = async (page: Page, index: number) => {
  const ex = EXERCISES[index];
  if (ex.mode === 'choice') {
    await page.locator('button[data-option]').nth(ex.right === 0 ? 1 : 0).click();
  } else {
    await page.getByRole('textbox', { name: L.exercises.answerLabel }).fill('zzz');
    await page.keyboard.press('Enter');
  }
};

const answerRight = async (page: Page, index: number) => {
  const ex = EXERCISES[index];
  if (ex.mode === 'choice') {
    await page.locator('button[data-option]').nth(ex.right).click();
  } else {
    await page.getByRole('textbox', { name: L.exercises.answerLabel }).fill(ex.answer);
    await page.keyboard.press('Enter');
  }
};

test.describe('LR20 sign-up', () => {
  test('the Đăng ký button on the first screen goes to the registration page', async ({ page }) => {
    await open(page);
    const signup = page.getByRole('main').getByRole('link', { name: L.hero.signup, exact: true }).first();
    await expect(signup).toHaveAttribute('href', '/vi/app/register');
    await signup.click();
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

test.describe('LR22 nothing sticks out of its box', () => {
  const scan = (page: Page) =>
    page.evaluate(() => {
      const boxes = document.querySelectorAll<HTMLElement>('[data-ui], [role="tabpanel"]:not([hidden]), details[open], #bai-tap section[aria-label]');
      const spill: string[] = [];
      // Whatever sits inside a scroller or a clipping box below the card may be wider than it on purpose.
      const clipped = (el: Element, box: Element) => {
        for (let parent = el.parentElement; parent && parent !== box; parent = parent.parentElement) {
          if (getComputedStyle(parent).overflowX !== 'visible') return true;
        }
        return false;
      };
      for (const box of boxes) {
        const frame = box.getBoundingClientRect();
        if (frame.width === 0) continue;
        for (const el of box.querySelectorAll<HTMLElement>('*')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || clipped(el, box)) continue;
          if (r.left < frame.left - 1.5 || r.right > frame.right + 1.5) {
            const name = box.getAttribute('aria-label') ?? box.getAttribute('role') ?? box.tagName;
            spill.push(`${name} > ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} ${Math.round(r.left)}..${Math.round(r.right)} outside ${Math.round(frame.left)}..${Math.round(frame.right)}`);
          }
        }
      }
      return { spill, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth };
    });

  const expectInside = async (page: Page, where: string) => {
    await settle(page);
    const { spill, scrollWidth, innerWidth } = await scan(page);
    expect(spill, where).toEqual([]);
    expect(scrollWidth, `${where}: page width`).toBeLessThanOrEqual(innerWidth);
  };

  for (const width of [320, 390, 768, 1440]) {
    test(`at ${width}px every tab, the turned card and every exercise stay inside`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport widths');
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      await expectInside(page, 'first screen');

      for (const name of TAB_NAMES) {
        await page.getByRole('tab', { name }).click();
        await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
        await expectInside(page, `tab ${name}`);
      }

      await page.getByRole('tab', { name: L.showcase.tabs.review }).click();
      const flip = page.getByRole('group', { name: L.showcase.review.deck }).getByRole('button', { pressed: false });
      await flip.click();
      await expectInside(page, 'review card turned');
      // Turned: the front face (whose button is pressed) goes inert and out of the accessibility tree, so the back face is the one that reads.
      const deck = page.getByRole('group', { name: L.showcase.review.deck });
      await expect(deck.locator('[inert] button[aria-pressed="true"]')).toHaveCount(1);
      await expect(deck.getByText(L.showcase.review.meaning, { exact: true })).toBeVisible();

      const buttons = exerciseButtons(page);
      await expect(buttons).toHaveCount(EXERCISES.length);
      for (let index = 0; index < EXERCISES.length; index++) {
        await buttons.nth(index).click();
        await expectInside(page, `exercise ${EXERCISES[index].id}`);
        await answerWrong(page, index);
        await expectInside(page, `exercise ${EXERCISES[index].id} answered wrongly`);
      }
      await expectInside(page, 'end of page');
    });
  }
});

test.describe('LR23 the theme follows the visitor into the app', () => {
  test('dark chosen on the landing is still dark after a reload and on the login page', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: L.nav.themeToDark }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('wordmet-web.theme'))).toBe('dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('main').getByRole('link', { name: L.hero.login, exact: true }).first().click();
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

test.describe('LR25 reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('after scrolling the whole page every revealed section is in place and visible', async ({ page }) => {
    await open(page);
    for (let y = 0; y < 12000; y += 500) await page.mouse.wheel(0, 500);
    await page.waitForTimeout(400);
    const { revealed, moved } = await page.evaluate(() => {
      const wrappers = [...document.querySelectorAll('main > div')];
      return {
        revealed: wrappers.length,
        moved: wrappers.flatMap((el) => {
          const style = getComputedStyle(el);
          const placed = style.transform === 'none' && ['none', '0px', '0px 0px'].includes(style.translate);
          return placed && style.opacity === '1' ? [] : [`${el.querySelector('h2')?.textContent ?? el.className}: transform ${style.transform}, translate ${style.translate}, opacity ${style.opacity}`];
        }),
      };
    });
    // The control: the seven Reveal wrappers were found, so an empty `moved` means "in place", not "never looked".
    expect(revealed).toBe(7);
    expect(moved).toEqual([]);
    for (const title of [L.why.title, L.exercises.title, L.review.title, L.metOutside.title, L.plans.title, L.faq.title, L.final.title]) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
  });
});

test.describe('LR26 without JavaScript', () => {
  // Reduced motion too: with scripting off and the FAQ transition running, Playwright's stability check never passes for the second click on
  // a summary, though the page itself settles in about 400 ms (isolated repro: click 1 ok, click 2 times out; with reduced motion both pass).
  // The motion is covered by LR29.
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

  test('the first screen, the first tab, every section title and the FAQ all work', async ({ page }) => {
    await page.goto('/vi');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(L.hero.line1);
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.getByRole('tabpanel').getByRole('heading', { level: 2, name: L.showcase.review.title })).toBeVisible();
    for (const title of [L.why.title, L.exercises.title, L.review.title, L.metOutside.title, L.plans.title, L.faq.title, L.final.title]) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }

    const item = (question: string) => page.locator('details', { hasText: question });
    await expect(item(L.faq.q1)).toHaveJSProperty('open', true);
    await item(L.faq.q2).getByText(L.faq.q2).click();
    await expect(item(L.faq.q2)).toHaveJSProperty('open', true);
    await expect(item(L.faq.q1)).toHaveJSProperty('open', false);
    await item(L.faq.q2).getByText(L.faq.q2).click();
    await expect(item(L.faq.q2)).toHaveJSProperty('open', false);
  });
});

test.describe('LR27 axe in both themes', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`no serious or critical violation in ${scheme}: every tab and every exercise state`, async ({ page }) => {
      // About thirty axe scans of the whole page, each after the animations have settled.
      test.setTimeout(240_000);
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      for (let y = 0; y < 12000; y += 500) await page.mouse.wheel(0, 500);
      await page.waitForTimeout(500);

      const found: string[] = [];
      for (const name of TAB_NAMES) {
        await page.getByRole('tab', { name }).click();
        found.push(...(await seriousViolations(page)).map((v) => `[tab ${name}] ${v}`));
      }
      await page.getByRole('tab', { name: L.showcase.tabs.review }).click();
      await page.getByRole('group', { name: L.showcase.review.deck }).getByRole('button', { pressed: false }).click();
      found.push(...(await seriousViolations(page)).map((v) => `[review card turned] ${v}`));

      const buttons = exerciseButtons(page);
      for (let index = 0; index < EXERCISES.length; index++) {
        const id = EXERCISES[index].id;
        await buttons.nth(index).click();
        found.push(...(await seriousViolations(page)).map((v) => `[${id} fresh] ${v}`));
        await answerWrong(page, index);
        found.push(...(await seriousViolations(page)).map((v) => `[${id} wrong] ${v}`));
        await page.getByRole('button', { name: L.exercises.again }).or(page.getByRole('button', { name: L.exercises.reveal })).first().click();
        if (EXERCISES[index].mode === 'typed') {
          // Revealed answer, then a fresh try answered rightly.
          found.push(...(await seriousViolations(page)).map((v) => `[${id} revealed] ${v}`));
          await page.getByRole('button', { name: L.exercises.again }).click();
        }
        await answerRight(page, index);
        found.push(...(await seriousViolations(page)).map((v) => `[${id} right] ${v}`));
      }
      expect(found).toEqual([]);
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

  test('the whole landing, used in both themes, raises no violation', async ({ page }) => {
    await open(page);
    for (let y = 0; y < 12000; y += 500) await page.mouse.wheel(0, 500);
    for (const name of TAB_NAMES) await page.getByRole('tab', { name }).click();
    await exerciseButtons(page).nth(2).click();
    await answerWrong(page, 2);
    await page.getByRole('button', { name: L.nav.themeToDark }).click();
    await page.getByRole('button', { name: L.nav.themeToLight }).click();
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
  });
});

test.describe('LR29 the FAQ opens with motion', () => {
  test('opening question 2 closes question 1 and grows question 2 gradually', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'timing of one animation, once is enough');
    await open(page);
    const second = page.locator('details', { hasText: L.faq.q2 });
    const first = page.locator('details', { hasText: L.faq.q1 });
    await second.scrollIntoViewIfNeeded();
    const heights = await second.evaluate(async (el) => {
      const details = el as HTMLDetailsElement;
      const closed = details.getBoundingClientRect().height;
      const samples: number[] = [];
      details.querySelector('summary')!.click();
      const started = performance.now();
      while (performance.now() - started < 700) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        samples.push(details.getBoundingClientRect().height);
      }
      return { closed, samples };
    });
    await expect(first).toHaveJSProperty('open', false);
    await expect(second).toHaveJSProperty('open', true);
    const final = heights.samples[heights.samples.length - 1];
    expect(final).toBeGreaterThan(heights.closed);
    // At least one frame was drawn part-way: a jump from closed to final would leave none.
    expect(heights.samples.filter((h) => h > heights.closed + 1 && h < final - 1).length).toBeGreaterThan(2);
  });
});

// Owner 03/11/2026: the white sections run into each other, so a grey band alternates with them. What the visitor sees is that no two
// neighbouring bands, from "why" down to the footer, are painted the same, whichever theme they use.
test.describe('LR31 the sections are told apart', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`no two neighbouring bands share a background in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      const bands = await page.evaluate(() => {
        const paint = (el: Element) => {
          for (let node: Element | null = el; node; node = node.parentElement) {
            const colour = getComputedStyle(node).backgroundColor;
            if (colour !== 'rgba(0, 0, 0, 0)' && colour !== 'transparent') return colour;
          }
          return 'none';
        };
        const found: Array<[string, Element | null]> = [
          ['hero', document.querySelector('section[aria-labelledby="hero-title"]')],
          ...['vi-sao', 'bai-tap', 'on-lai', 'gap-tu', 'goi', 'hoi-dap'].map((id): [string, Element | null] => [id, document.getElementById(id)]),
          ['final', document.querySelector('section[aria-labelledby="final-title"]')],
          ['footer', document.querySelector('footer')],
        ];
        return found.map(([id, el]) => ({ id, paint: el ? paint(el) : 'missing' }));
      });
      // The control: every band was found, so "different from the neighbour" is about colours and not about absent elements.
      expect(bands.filter((band) => band.paint === 'missing')).toEqual([]);
      for (let index = 1; index < bands.length; index++) {
        expect(bands[index].paint, `${bands[index - 1].id} and ${bands[index].id} share a background`).not.toBe(bands[index - 1].paint);
      }
    });
  }
});

// Found in the visual pass of 03/11/2026: at 768 px the window bar cut "Thêm từ mới" off, and at 320 px the header's Đăng ký broke into two lines.
test.describe('LR32 the controls stay whole on small screens', () => {
  test('from tablet width up all five tabs fit in the window bar without scrolling it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport widths');
    await open(page);
    await expect(page.getByRole('tab')).toHaveCount(5);
    for (const width of [768, 820, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.getByRole('tablist').evaluate((tablist) => tablist.parentElement!.scrollWidth - tablist.parentElement!.clientWidth);
      expect(overflow, `${width}px: pixels of the tab bar past its edge`).toBeLessThanOrEqual(0);
    }
  });

  test('at 320 px the Đăng ký button in the header stays on one line', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport widths');
    await page.setViewportSize({ width: 320, height: 700 });
    await open(page);
    const box = await page.getByRole('banner').getByRole('link', { name: L.nav.signup, exact: true }).boundingBox();
    expect(box, 'the header button was found').not.toBeNull();
    // min-h-control is 44 px; a second line of text makes it about 65.
    expect(box!.height).toBeLessThan(50);
  });
});

// Owner 03/11/2026: words and sign-up on the left, the app window on the right, small enough to sit in the first screen, a little motion on
// opening, and the Pro plan made to stand out.
test.describe('LR34 the first screen: words on the left, the app window on the right', () => {
  const windowOf = (page: Page) => page.getByRole('region', { name: L.showcase.label });
  // What shows of the window is the box that holds it: the next section covers the rest (LR37).
  const shownOf = (page: Page) => page.locator('#tinh-nang').locator('xpath=..');

  for (const [width, height] of [
    [1440, 900],
    [1366, 768],
  ]) {
    test(`at ${width} x ${height} the heading and the sign-up button sit left of the window, and every tab of it fits in the screen`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
      await page.setViewportSize({ width, height });
      await open(page);
      const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
      const signup = await page.getByRole('main').getByRole('link', { name: L.hero.signup, exact: true }).first().boundingBox();
      const frame = await windowOf(page).boundingBox();
      expect(heading && signup && frame, 'heading, button and window were found').toBeTruthy();
      expect(heading!.x + heading!.width, 'the heading ends before the window').toBeLessThanOrEqual(frame!.x);
      expect(signup!.x + signup!.width, 'the button ends before the window').toBeLessThanOrEqual(frame!.x);
      for (const name of TAB_NAMES) {
        await page.getByRole('tab', { name }).click();
        const shown = await shownOf(page).boundingBox();
        expect(shown!.y + shown!.height, `tab ${name}: bottom edge of what shows of the window`).toBeLessThanOrEqual(height);
      }
    });
  }

  for (const width of [768, 390]) {
    test(`at ${width} px the window comes under the heading`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
      const frame = await windowOf(page).boundingBox();
      expect(frame!.y).toBeGreaterThanOrEqual(heading!.y + heading!.height);
    });
  }
});

// Owner 03/11/2026: only about three quarters of the window show, as if it sat lower and the next section lay over it.
test.describe('LR37 the window peeks out from under the next section', () => {
  test('at 1440 x 900 about three quarters of the window show and the next section lies over the rest', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await settle(page);
    const { whole, shown, coveredBySection } = await page.evaluate(() => {
      const frame = document.getElementById('tinh-nang')!;
      const box = frame.parentElement!.getBoundingClientRect();
      const full = frame.getBoundingClientRect();
      // A point just under what shows, in the middle of the window: the section below must be the thing found there.
      const hit = document.elementFromPoint(full.left + full.width / 2, box.bottom + 24);
      return { whole: full.height, shown: box.height, coveredBySection: Boolean(hit?.closest('#vi-sao')) };
    });
    expect(shown / whole, `shows ${Math.round(shown)} of ${Math.round(whole)} px`).toBeGreaterThan(0.65);
    expect(shown / whole).toBeLessThan(0.85);
    expect(coveredBySection, 'the next section is what lies under the window').toBe(true);
  });
});

// Owner 03/11/2026, third round: the window grows to the left (the words give up width), its items shrink, and only the main visuals stay: buttons and
// other side items are left out, so that nothing inside is lain over by the next section.
test.describe('LR38 the window is wide and the heading still takes two lines', () => {
  test('at 1440 x 900 the window is at least 600 px wide and the heading takes two lines', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await settle(page);
    const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
    const frame = await page.getByRole('region', { name: L.showcase.label }).boundingBox();
    expect(frame!.width).toBeGreaterThanOrEqual(600);
    expect(heading!.height, 'two lines of the heading are about 85 px, three about 130').toBeLessThan(110);
  });
});

test.describe('LR39 nothing inside the window is under the next section', () => {
  test('at 1440 x 900 every element of every tab ends above the cut', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await settle(page);
    for (const name of TAB_NAMES) {
      await page.getByRole('tab', { name }).click();
      await settle(page);
      const { checked, below } = await page.evaluate(() => {
        const frame = document.getElementById('tinh-nang')!;
        const cut = frame.parentElement!.getBoundingClientRect().bottom;
        const panel = frame.querySelector('[role="tabpanel"]:not([hidden])')!;
        const below: string[] = [];
        let checked = 0;
        for (const el of panel.querySelectorAll('*')) {
          const box = el.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) continue;
          checked++;
          if (box.bottom > cut + 0.5) below.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 24)}" ends ${Math.round(box.bottom - cut)} px below the cut`);
        }
        return { checked, below };
      });
      // The control: the open panel had elements to look at, so an empty list means "all above the cut", not "nothing found".
      expect(checked, `tab ${name}`).toBeGreaterThan(5);
      expect(below, `tab ${name}`).toEqual([]);
    }
  });
});

// Owner 03/11/2026, fourth round: the review tab spaced evenly and without its progress bar, the card higher in the window and the window lower on the
// page (the card still not lain over), a tab bar with less padding, and a narrower plans table on the right.
test.describe('LR40 the review tab is spaced evenly, the card sits high and the window lower', () => {
  test('at 1440 x 900 title, line and card are evenly spaced and share a left edge, there is no progress bar, the bar is slim, the window is lower', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await settle(page);
    const g = await page.evaluate(() => {
      const frame = document.getElementById('tinh-nang')!;
      const panel = frame.querySelector('[role="tabpanel"]:not([hidden])')!;
      const title = panel.querySelector('h2')!.getBoundingClientRect();
      const body = panel.querySelector('h2 + p')!.getBoundingClientRect();
      const card = panel.querySelector('[role="group"]')!.getBoundingClientRect();
      const top = frame.getBoundingClientRect().top;
      return {
        gapUnderTitle: body.top - title.bottom,
        gapUnderLine: card.top - body.bottom,
        leftDelta: card.left - title.left,
        cardFromTop: card.top - top,
        barHeight: frame.querySelector('[role="tablist"]')!.parentElement!.getBoundingClientRect().height,
        windowTop: top,
      };
    });
    expect(Math.abs(g.gapUnderTitle - g.gapUnderLine), `gaps ${g.gapUnderTitle.toFixed(1)} and ${g.gapUnderLine.toFixed(1)} px`).toBeLessThanOrEqual(1.5);
    expect(Math.abs(g.leftDelta), 'the card starts where the title starts').toBeLessThanOrEqual(1);
    expect(g.cardFromTop, 'the card sits high in the window').toBeLessThanOrEqual(150);
    expect(g.barHeight, 'the tab bar').toBeLessThanOrEqual(40);
    expect(g.windowTop, 'the window starts lower on the page').toBeGreaterThanOrEqual(140);
    await expect(page.getByText(/Thẻ 4 trên 29/)).toBeHidden();
  });
});

test.describe('LR42 the plans table is narrow and on the right', () => {
  test('at 1440 x 900 it is 540 to 580 px wide, sits in the right half, and "Miễn phí" fits its column on one line', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const table = await page.getByRole('table', { name: L.plans.title }).boundingBox();
    const free = await page.getByRole('columnheader', { name: L.plans.free, exact: true }).boundingBox();
    expect(table!.width).toBeGreaterThanOrEqual(540);
    expect(table!.width).toBeLessThanOrEqual(580);
    const fits = await page.getByRole('columnheader', { name: L.plans.free, exact: true }).evaluate((th) => th.scrollWidth <= th.clientWidth);
    expect(fits, '"Miễn phí" stays inside its column and clear of the Pro card').toBe(true);
    expect(table!.x, 'the table starts in the right half of the page').toBeGreaterThanOrEqual(715);
    // The way in sits right under the heading, not halfway down beside the table.
    const heading = await page.getByRole('heading', { level: 2, name: L.plans.title }).boundingBox();
    const signup = await page.locator('#goi').getByRole('link', { name: L.plans.signup, exact: true }).boundingBox();
    expect(signup!.y - (heading!.y + heading!.height), 'space between the heading and Đăng ký').toBeLessThanOrEqual(48);
    expect(free!.height, 'one line of the plan name with a slim padding').toBeLessThan(50);
  });
});

// Owner 03/11/2026: the sign-in and sign-up pages drop the navy panel on the left; the form sits in the middle of the screen.
test.describe('LR43 the sign-in pages have the form in the middle', () => {
  for (const path of ['/vi/app/login', '/vi/app/register']) {
    test(`at 1440 x 900 ${path} has no side panel and its card is centred`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      const card = page.getByRole('heading', { level: 1 }).locator('xpath=ancestor::section[1]');
      await expect(card).toBeVisible();
      await expect(page.locator('aside')).toHaveCount(0);
      const box = await card.boundingBox();
      expect(Math.abs(box!.x + box!.width / 2 - 720), 'distance of the card centre from the page centre').toBeLessThanOrEqual(2);
    });
  }
});

test.describe('LR35 the first screen moves in when the page opens', () => {
  const watch = (page: Page) =>
    page.addInitScript(() => {
      window.__heroMotion = [];
      document.addEventListener('animationstart', (event) => window.__heroMotion.push(`${event.animationName}:${(event.target as Element).tagName.toLowerCase()}`), true);
    });
  const started = (page: Page) => page.evaluate(() => window.__heroMotion.filter((entry) => entry.startsWith('hero-')));

  test('the heading, the words under it and the window each start an entrance, and all end in place and visible', async ({ page }) => {
    await watch(page);
    await open(page);
    await page.waitForTimeout(1500);
    const entrances = await started(page);
    expect(entrances.length, entrances.join(', ')).toBeGreaterThanOrEqual(5);
    expect(entrances.some((entry) => entry.startsWith('hero-window-in'))).toBe(true);
    for (const target of [page.getByRole('heading', { level: 1 }), page.getByRole('region', { name: L.showcase.label })]) {
      expect(await target.evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).transform])).toEqual(['1', 'none']);
    }
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('nothing starts, and the first screen is all there at once', async ({ page }) => {
      await watch(page);
      await open(page);
      // The control: the recorder ran (it holds an array) and the page was drawn, so an empty list means "nothing moved".
      expect(await page.evaluate(() => Array.isArray(window.__heroMotion))).toBe(true);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await started(page)).toEqual([]);
    });
  });
});

test.describe('LR36 the plans are a comparison table and the Pro column stands out', () => {
  test('each of the seven lines has a Có or a Không under Free and under Pro, and the two columns are painted differently', async ({ page }) => {
    await open(page);
    const table = page.getByRole('table', { name: L.plans.title });
    const lines: Array<[string, string, string]> = [
      [L.plans.freeP1, L.plans.yes, L.plans.yes],
      [L.plans.freeP2, L.plans.yes, L.plans.yes],
      [L.plans.freeP3, L.plans.yes, L.plans.yes],
      [L.plans.proP1, L.plans.no, L.plans.yes],
      [L.plans.proP2, L.plans.no, L.plans.yes],
      [L.plans.proP3, L.plans.no, L.plans.yes],
      [L.plans.proP4, L.plans.no, L.plans.yes],
    ];
    for (const [label, free, pro] of lines) {
      await expect(table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: label }) }).getByRole('cell'), label).toHaveText([free, pro]);
    }
    const paint = (name: string) =>
      table.getByRole('columnheader', { name, exact: true }).evaluate((header) => {
        for (let node: Element | null = header; node; node = node.parentElement) {
          const colour = getComputedStyle(node).backgroundColor;
          if (colour !== 'rgba(0, 0, 0, 0)' && colour !== 'transparent') return colour;
        }
        return 'none';
      });
    const [free, pro] = [await paint(L.plans.free), await paint(L.plans.pro)];
    expect(free, 'the Free column was found').not.toBe('none');
    expect(pro, 'the Pro column was found').not.toBe('none');
    expect(pro).not.toBe(free);
  });
});

// Final review 03/11/2026: the anchors were bare (`#goi`), so on the legal pages, which share this header and footer, they led nowhere.
test.describe('LR33 the page anchors work from the legal pages', () => {
  for (const path of ['/vi/privacy', '/vi/terms']) {
    test(`the footer link Hỏi đáp on ${path} leads to the questions on the home page`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole('contentinfo').getByRole('link', { name: L.footer.faq }).click();
      await expect(page).toHaveURL(/\/vi#hoi-dap$/);
      await expect(page.locator('#hoi-dap')).toBeVisible();
    });
  }

  test('the header link Gói học on a legal page leads to the plans on the home page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the page anchors are in the header from lg up');
    await page.goto('/vi/terms');
    await page.getByRole('banner').getByRole('link', { name: L.nav.plans }).click();
    await expect(page).toHaveURL(/\/vi#goi$/);
    await expect(page.locator('#goi')).toBeVisible();
  });
});

test.describe('LR30 no waitlist', () => {
  test('/vi has no email field and sends nothing to a waitlist', async ({ page }) => {
    const sent: string[] = [];
    page.on('request', (request) => {
      if (/waitlist/i.test(request.url()) || /waitlist/i.test(request.postData() ?? '')) sent.push(`${request.method()} ${request.url()}`);
    });
    await open(page);
    for (let y = 0; y < 12000; y += 500) await page.mouse.wheel(0, 500);
    for (const name of TAB_NAMES) await page.getByRole('tab', { name }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    expect(await page.locator('form').filter({ has: page.locator('input[type="email"]') }).count()).toBe(0);
    expect(sent).toEqual([]);
  });
});
