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
