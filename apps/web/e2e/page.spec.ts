import { expect, test, type Page } from '@playwright/test';
import { copy, fill, firstLine } from './copy';

async function scrollThrough(page: Page) {
  for (let y = 0; y < 9000; y += 500) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(40);
  }
}

test.describe('cloze practice', () => {
  const card = (page: Page) => page.getByTestId('cloze-card');
  const sticker = (page: Page, name: string) => card(page).getByRole('button', { name, exact: true });

  test('LP20/UBC4 wrong then right, then next to Done and Again', async ({ page }) => {
    await page.goto('/en');
    const live = page.getByTestId('cloze-live');
    await sticker(page, 'delay').click();
    await expect(live).toContainText(copy.en.Cloze.wrongTitle);
    await expect(sticker(page, 'delay')).toHaveAttribute('aria-disabled', 'true');
    await sticker(page, copy.en.Cloze.items.deploy.answer).click();
    await expect(live).toContainText(copy.en.Cloze.correctTitle);
    await expect(page.getByTestId('cloze-gap')).toHaveText(copy.en.Cloze.items.deploy.answer);
    await expect(page.locator('[data-flyer]')).toHaveCount(0);
    const next = card(page).getByRole('button', { name: copy.en.Cloze.nextSentence });
    await expect(next).toBeFocused();
    for (const [current, answer] of [[2, copy.en.Cloze.items.assume.answer], [3, copy.en.Cloze.items.borrow.answer]] as const) {
      await next.click();
      await expect(card(page)).toContainText(fill(copy.en.Cloze.header, { current, total: 3 }));
      await sticker(page, answer).click();
    }
    await next.click();
    await expect(card(page)).toContainText(copy.en.Cloze.doneTitle);
    await expect(card(page).getByRole('link', { name: copy.en.Cloze.doneCta })).toHaveAttribute('href', '#waitlist-hero');
    await card(page).getByRole('button', { name: copy.en.Cloze.replay }).click();
    await expect(card(page)).toContainText(fill(copy.en.Cloze.header, { current: 1, total: 3 }));
  });

  test('RF5 stickers keep a visible border in forced-colors mode', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/vi');
    const border = await sticker(page, copy.vi.Cloze.items.deploy.answer).evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.borderTopStyle, width: parseFloat(s.borderTopWidth) };
    });
    expect(border.style).not.toBe('none');
    expect(border.width).toBeGreaterThanOrEqual(2);
  });

  test.describe('without JavaScript, motion allowed', () => {
    test.use({ javaScriptEnabled: false });
    test('UBE11 the card drops in with CSS only and does not stay transparent', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForTimeout(800);
      expect(await card(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    });
  });
});

test('LP22 flashcard flips on click', async ({ page }) => {
  await page.goto('/vi');
  const card = page.locator('button[aria-pressed]').filter({ hasText: copy.vi.Problem.before.hint });
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
});

test('LP23 opening an FAQ item closes the open one', async ({ page }) => {
  await page.goto('/vi');
  const supported = await page.evaluate(() => 'name' in HTMLDetailsElement.prototype);
  test.skip(!supported, '<details name> not supported');
  const items = page.locator('#faq details');
  await items.nth(1).locator('summary').click();
  await expect(items.nth(1)).toHaveAttribute('open', '');
  await expect(items.nth(0)).not.toHaveAttribute('open', '');
});

test('LP30 FAQ has 4 items with the first open; both forms show the consent checkbox', async ({ page }) => {
  for (const locale of ['vi', 'en']) {
    await page.goto(`/${locale}`);
    await expect(page.locator('#faq details')).toHaveCount(4);
    await expect(page.locator('#faq details').first()).toHaveAttribute('open', '');
    await expect(page.locator('#waitlist-hero input[type=checkbox]')).toHaveCount(1);
    await expect(page.locator('#waitlist-cta input[type=checkbox]')).toHaveCount(1);
  }
});

test('LP14–LP16 form flow in the browser', async ({ page }) => {
  await page.goto('/en');
  const form = page.locator('#waitlist-hero');
  const email = form.getByRole('textbox', { name: copy.en.Waitlist.emailLabel });
  await email.fill('name@gmail');
  await form.getByRole('button', { name: copy.en.Waitlist.submit }).click();
  await expect(form.getByText(copy.en.Waitlist.invalidEmail)).toBeVisible();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await email.fill(`e2e-${Date.now()}@example.com`);
  await form.getByRole('button', { name: copy.en.Waitlist.submit }).click();
  await expect(form.getByText(copy.en.Waitlist.missingConsent)).toBeVisible();
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: copy.en.Waitlist.submit }).click();
  await expect(page.getByRole('status')).toContainText(copy.en.Waitlist.success);
});

test.describe('header (UB16)', () => {
  // Reduced motion turns off smooth scrolling, so positions are read after the jump, not mid-scroll.
  test.use({ reducedMotion: 'reduce' });
  const desktopOnly = () => test.skip(test.info().project.name !== 'desktop', 'run once, sizes set in the test');
  const header = (page: Page) => page.getByRole('banner');
  const cta = (page: Page, locale: 'vi' | 'en') => header(page).getByRole('link', { name: copy[locale].Nav.cta });

  async function expectFormClearsHeader(page: Page) {
    const form = page.locator('#waitlist-hero');
    await expect(form).toBeInViewport();
    const h = (await header(page).boundingBox())!;
    const f = (await form.boundingBox())!;
    expect(f.y).toBeGreaterThanOrEqual(h.y + h.height - 1);
  }

  test('UBC5 at 1440 and 768 the header stays on top and its CTA scrolls to the hero form', async ({ page }) => {
    desktopOnly();
    for (const width of [1440, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const locale of ['vi', 'en'] as const) {
        await page.goto(`/${locale}`);
        await page.locator('#faq').scrollIntoViewIfNeeded();
        expect((await header(page).boundingBox())!.y, `${locale} at ${width}`).toBe(0);
        await cta(page, locale).click();
        await expectFormClearsHeader(page);
      }
    }
  });

  test('UB16 below md the header has no CTA and scrolls away', async ({ page }) => {
    desktopOnly();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/vi');
    await expect(cta(page, 'vi')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(async () => (await header(page).boundingBox())!.y).toBeLessThan(0);
  });

  test('RF1 header CTA from a legal page lands on the home form', async ({ page }) => {
    desktopOnly();
    await page.goto('/vi/privacy');
    await cta(page, 'vi').click();
    await expect(page).toHaveURL(/\/vi#waitlist-hero$/);
    await expectFormClearsHeader(page);
  });

  test('RF4 at 768 with 125% root text the header stays on one row and anchors clear it', async ({ page }) => {
    desktopOnly();
    await page.setViewportSize({ width: 768, height: 1024 });
    for (const locale of ['vi', 'en'] as const) {
      await page.goto(`/${locale}`);
      await page.addStyleTag({ content: 'html { font-size: 125% !important; }' });
      const row = await header(page).locator(':scope > div').evaluate((el) => ({
        // Children are vertically centred in one row: their centres line up unless the row wrapped.
        // Hidden children (the nav below lg) have an empty box and are skipped.
        centres: [...el.children]
          .map((c) => c.getBoundingClientRect())
          .filter((r) => r.width > 0)
          .map((r) => Math.round(r.top + r.height / 2)),
        overflow: el.scrollWidth - el.clientWidth,
      }));
      expect(Math.max(...row.centres) - Math.min(...row.centres), locale).toBeLessThanOrEqual(2);
      expect(row.overflow, locale).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.scrollingElement!.scrollWidth - window.innerWidth), locale).toBeLessThanOrEqual(0);
      await cta(page, locale).click();
      await expectFormClearsHeader(page);
    }
  });
});

test.describe('hero and forms (§5.1, §5.3)', () => {
  test('CPA owner review: from md the hero starts 32px below the header', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'wide layout');
    for (const width of [1440, 2000]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/en');
      const header = (await page.getByRole('banner').boundingBox())!;
      const hero = page.locator('section[aria-labelledby="hero-title"]');
      const first = (await hero.locator(':scope > div > *').first().boundingBox())!;
      expect(Math.round(first.y - (header.y + header.height)), `at ${width}`).toBe(32);
    }
  });

  test('S5.1 at 390 the hero form is inside the first screen', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'phone layout');
    await page.goto('/vi');
    const box = (await page.locator('#waitlist-hero').boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  });

  test('RF5 the consent checkbox keeps a visible border in forced-colors mode', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/vi');
    for (const id of ['#waitlist-hero', '#waitlist-cta']) {
      const border = await page.locator(`${id} input[type=checkbox]`).evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.borderTopStyle, width: parseFloat(s.borderTopWidth) };
      });
      expect(border.style, id).not.toBe('none');
      expect(border.width, id).toBeGreaterThanOrEqual(2);
    }
  });
});

test.describe('plans (UB7)', () => {
  test.use({ reducedMotion: 'reduce' });
  test('UBC6 each plan button scrolls to the hero form', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'run once, sizes set in the test');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/vi');
      const plans = page.locator('section[aria-labelledby="plans-title"]');
      const buttons = plans.getByRole('link', { name: copy.vi.Nav.cta });
      await expect(buttons).toHaveCount(2);
      for (let i = 0; i < 2; i++) {
        await buttons.nth(i).scrollIntoViewIfNeeded();
        await buttons.nth(i).click();
        await expect(page.locator('#waitlist-hero'), `button ${i} at ${width}`).toBeInViewport();
      }
    }
  });
});

test('S5.1 section backgrounds follow the B rhythm', async ({ page }) => {
  await page.goto('/vi');
  const backgrounds = await page.locator('main > section').evaluateAll((sections) =>
    sections.map((s) => getComputedStyle(s).backgroundColor),
  );
  const [blue, white, lilac, yellow] = ['rgb(36, 69, 214)', 'rgb(255, 255, 255)', 'rgb(236, 239, 254)', 'rgb(255, 216, 74)'];
  // Hero, Problem, How it works, AI practice, Plans, FAQ, final CTA (design §5.1).
  expect(backgrounds).toEqual([blue, white, white, lilac, white, white, yellow]);
  await page.goto('/vi/privacy');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(white);
});

test.describe('layout', () => {
  test('LP24 no horizontal scroll at 390 / Review#2 at 320', async ({ page }) => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      for (const locale of ['vi', 'en']) {
        await page.goto(`/${locale}`);
        await scrollThrough(page);
        const sw = await page.evaluate(() => document.scrollingElement!.scrollWidth);
        expect(sw, `${locale} at ${width}`).toBeLessThanOrEqual(width);
      }
    }
  });

  test('LP29 end gap of the steps row equals the start gap (20 px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/vi');
    const row = page.locator('#how-it-works ol');
    await row.scrollIntoViewIfNeeded();
    const gaps = await row.evaluate((ol) => {
      const cards = [...ol.querySelectorAll('li')].filter((li) => li.getAttribute('aria-hidden') !== 'true');
      const start = cards[0].getBoundingClientRect().left - ol.getBoundingClientRect().left;
      ol.scrollLeft = ol.scrollWidth;
      const last = cards[cards.length - 1].getBoundingClientRect();
      return { start, end: ol.getBoundingClientRect().right - last.right };
    });
    expect(Math.round(gaps.start)).toBe(20);
    expect(Math.round(gaps.end)).toBe(20);
  });

  test('steps equal height at 1440: visual, number, title and body tops align', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/en');
    await page.locator('#how-it-works').scrollIntoViewIfNeeded();
    await scrollThrough(page);
    const tops = await page.locator('#how-it-works ol > li').evaluateAll((cards) =>
      cards.filter((c) => c.getAttribute('aria-hidden') !== 'true').map((c) => [...c.children].map((ch) => Math.round(ch.getBoundingClientRect().top))),
    );
    for (let row = 0; row < 4; row++) {
      const values = tops.map((t) => t[row]);
      expect(Math.max(...values) - Math.min(...values), `row ${row}`).toBeLessThanOrEqual(1);
    }
  });

  test('Review#5 no clipped text on /en at 390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en');
    await scrollThrough(page);
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="cloze-card"] *, #how-it-works li *, h1, h2, h3, p')]
        .filter((el) => !el.classList.contains('sr-only') && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible')
        .map((el) => el.textContent?.slice(0, 40)),
    );
    expect(clipped).toEqual([]);
  });

  test('LP32 page holds with a 125% root font size at 390 and 768', async ({ page }) => {
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/vi');
      await page.addStyleTag({ content: 'html { font-size: 125% !important; }' });
      await scrollThrough(page);
      const result = await page.evaluate(() => ({
        body: parseFloat(getComputedStyle(document.querySelector('#faq details p')!).fontSize),
        sw: document.scrollingElement!.scrollWidth,
        iw: window.innerWidth,
      }));
      expect(result.body, `width ${width}`).toBe(20);
      expect(result.sw, `width ${width}`).toBeLessThanOrEqual(result.iw);
    }
  });
});

test.describe('reduced motion', () => {
  test('LP26 control: without reduced motion, content below the fold waits hidden', async ({ page }) => {
    await page.goto('/vi');
    await page.waitForTimeout(500);
    expect(await page.locator('.translate-y-4.opacity-0').count()).toBeGreaterThan(0);
  });

  test.describe('with reduce', () => {
    test.use({ reducedMotion: 'reduce' });
    test('LP26 nothing is hidden on load and no animations run while scrolling', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForTimeout(500);
      expect(await page.locator('.translate-y-4.opacity-0').count()).toBe(0);
      await scrollThrough(page);
      await page.waitForTimeout(400);
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    });

    test('UBE1/UBE2 with reduce a wrong then right pick runs no animation', async ({ page }) => {
      await page.goto('/vi');
      const card = page.getByTestId('cloze-card');
      for (const word of ['delay', copy.vi.Cloze.items.deploy.answer]) {
        await card.getByRole('button', { name: word, exact: true }).click();
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => document.getAnimations().length), word).toBe(0);
      }
      await expect(page.getByTestId('cloze-gap')).toHaveText(copy.vi.Cloze.items.deploy.answer);
    });
  });
});

test.describe('without JavaScript', () => {
  // Reduced motion also turns off smooth scrolling, which otherwise keeps elements 'unstable' for Playwright.
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  test('UBE12 without JavaScript the header CTA still jumps to the form', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'the header CTA shows from md');
    await page.goto('/vi');
    await page.getByRole('banner').getByRole('link', { name: copy.vi.Nav.cta }).click();
    await expect(page).toHaveURL(/#waitlist-hero$/);
    await expect(page.locator('#waitlist-hero')).toBeInViewport();
  });

  test('UBE11 without JavaScript the card shows sentence 1 with ? and four stickers', async ({ page }) => {
    await page.goto('/vi');
    const card = page.getByTestId('cloze-card');
    await expect(card).toBeVisible();
    await expect(page.getByTestId('cloze-gap')).toContainText('?');
    await expect(card.getByRole('button')).toHaveCount(4);
  });

  test('LP27 copy is present, FAQ toggles, form submits', async ({ page }) => {
    await page.goto('/vi');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(firstLine(copy.vi.Hero.title));
    const second = page.locator('#faq details').nth(1);
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
    const form = page.locator('#waitlist-cta');
    await form.getByRole('textbox').fill(`nojs-${Date.now()}@example.com`);
    await form.getByRole('checkbox').check();
    await form.getByRole('button').click();
    await expect(page.getByText(copy.vi.Waitlist.success)).toBeVisible();
  });
});

test('Review#3 keyboard path has visible focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard path checked on desktop');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en');
  const seen: string[] = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return { label: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30) ?? el.tagName, outline: style.outlineStyle };
    });
    expect(info.outline, `focus on ${info.label}`).not.toBe('none');
    seen.push(info.label);
  }
  expect(seen).toEqual(expect.arrayContaining(['delay', copy.en.Nav.cta]));
});
