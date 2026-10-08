import { expect, test, type Page } from '@playwright/test';

const activeSlide = (page: Page) => page.locator('[aria-roledescription="slide"][data-active="true"]');

async function expectCenteredSlide(page: Page, index: number) {
  const slide = page.locator('[aria-roledescription="slide"]').nth(index);
  await expect(slide).toHaveAttribute('data-active', 'true');
  await expect.poll(() => slide.evaluate((el) => {
    const card = el.getBoundingClientRect();
    const track = el.parentElement!.getBoundingClientRect();
    return Math.abs(card.left + card.width / 2 - track.left - track.width / 2);
  })).toBeLessThan(2);
}

async function dragActiveCard(page: Page, direction: 'left' | 'right', expectedIndex: number, distance?: number) {
  const slide = activeSlide(page);
  await slide.hover();
  // Coordinate-based gestures need a stationary viewport after hover scrolls the card into view.
  await page.evaluate(() => window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' }));
  const box = (await slide.boundingBox())!;
  const x = box.x + box.width * (direction === 'left' ? 0.8 : 0.2);
  const y = box.y + 80;
  const delta = (distance ?? box.width * 0.75) * (direction === 'left' ? -1 : 1);
  const track = page.locator('.carousel-track');
  const before = await track.evaluate((el) => el.scrollLeft);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + delta, y, { steps: 12 });
  // The card under the pointer becomes full-size before the gesture is released.
  await page.waitForTimeout(200);
  expect(Math.abs(await track.evaluate((el) => el.scrollLeft) - (before - delta))).toBeLessThan(2);
  const highlighted = page.locator('[aria-roledescription="slide"]').nth(expectedIndex);
  expect(await highlighted.getAttribute('data-active')).toBe('true');
  expect(await highlighted.evaluate((el) => parseFloat(getComputedStyle(el).scale))).toBeGreaterThan(0.99);
  await page.mouse.up();
}

async function scrollThrough(page: Page) {
  for (let y = 0; y < 9000; y += 500) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(40);
  }
}

test.describe('cloze carousel', () => {
  test('dragging from an answer button does not pick the answer', async ({ page }) => {
    await page.goto('/en');
    const carousel = page.locator('[aria-roledescription="carousel"]');
    await carousel.getByRole('button', { name: 'Next sentence', exact: true }).click();
    await expectCenteredSlide(page, 1);
    await carousel.getByRole('button', { name: 'Previous sentence', exact: true }).click();
    await expectCenteredSlide(page, 0);
    const answer = activeSlide(page).getByRole('button', { name: 'deploy', exact: true });
    await answer.hover();
    await page.evaluate(() => window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' }));
    const box = (await answer.boundingBox())!;
    const width = (await activeSlide(page).boundingBox())!.width;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - width * 0.75, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await expectCenteredSlide(page, 1);
    await carousel.getByRole('button', { name: 'Previous sentence', exact: true }).click();
    await expectCenteredSlide(page, 0);
    await expect(answer).toBeEnabled();
    await expect(answer).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('cloze-live')).toBeEmpty();
  });

  test('native touch swipes change cards and vertical gestures still scroll the page', async ({ page, hasTouch }) => {
    test.skip(!hasTouch, 'Requires a touch-enabled browser');
    await page.goto('/en');
    const carousel = page.locator('[aria-roledescription="carousel"]');
    const track = carousel.locator('.carousel-track');
    await carousel.getByRole('button', { name: 'Next sentence', exact: true }).click();
    await expectCenteredSlide(page, 1);
    await track.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' }));
    const session = await page.context().newCDPSession(page);

    async function swipe(dx: number, dy: number, expectedIndex?: number) {
      const box = (await track.boundingBox())!;
      const x = Math.round(box.x + box.width * (dx < 0 ? 0.8 : 0.2));
      const y = Math.round(box.y + 120);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 12; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 12, y: y + dy * step / 12 }] });
        await page.waitForTimeout(20);
      }
      await page.waitForTimeout(120);
      if (expectedIndex !== undefined) {
        const highlighted = page.locator('[aria-roledescription="slide"]').nth(expectedIndex);
        expect(await highlighted.getAttribute('data-active')).toBe('true');
        expect(await highlighted.evaluate((el) => parseFloat(getComputedStyle(el).scale))).toBeGreaterThan(0.99);
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }

    const width = (await track.boundingBox())!.width;
    await swipe(-width * 0.65, 0, 2);
    await expectCenteredSlide(page, 2);
    await swipe(width * 0.65, 0, 1);
    await expectCenteredSlide(page, 1);
    const scrollY = await page.evaluate(() => window.scrollY);
    await swipe(0, -100);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollY + 30);
    await session.detach();
  });

  test('mouse dragging changes cards in both directions while short drags and answer clicks remain safe', async ({ page }) => {
    for (const locale of ['vi', 'en']) {
      await page.goto(`/${locale}`);
      const carousel = page.locator('[aria-roledescription="carousel"]');
      await carousel.getByRole('button', { name: locale === 'vi' ? 'Câu sau' : 'Next sentence', exact: true }).click();
      await expectCenteredSlide(page, 1);

      await dragActiveCard(page, 'left', 2);
      await expectCenteredSlide(page, 2);
      await dragActiveCard(page, 'right', 1);
      await expectCenteredSlide(page, 1);
      await dragActiveCard(page, 'right', 0);
      await expectCenteredSlide(page, 0);
      await dragActiveCard(page, 'left', 0, 20);
      await expectCenteredSlide(page, 0);
      await activeSlide(page).getByRole('button', { name: 'deploy', exact: true }).click();
      await expect(activeSlide(page).getByRole('button', { name: 'deploy', exact: true })).toBeDisabled();
      expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('');
    }
  });

  test('arrows advance one card at a time in both directions and center the active card', async ({ page }) => {
    for (const locale of ['vi', 'en']) {
      await page.goto(`/${locale}`);
      const carousel = page.locator('[aria-roledescription="carousel"]');
      const next = carousel.getByRole('button', { name: locale === 'vi' ? 'Câu sau' : 'Next sentence', exact: true });
      const prev = carousel.getByRole('button', { name: locale === 'vi' ? 'Câu trước' : 'Previous sentence', exact: true });

      for (const { index, direction } of [
        { index: 1, direction: 'next' }, { index: 2, direction: 'next' },
        { index: 1, direction: 'prev' }, { index: 0, direction: 'prev' },
      ]) {
        await (direction === 'next' ? next : prev).click();
        await expectCenteredSlide(page, index);
      }
    }
  });

  test('scrolling stays synchronized with keyboard navigation and viewport resizing', async ({ page }) => {
    for (const locale of ['vi', 'en']) {
      await page.goto(`/${locale}`);
      const carousel = page.locator('[aria-roledescription="carousel"]');
      // Establish an interactive carousel before simulating a scroll through the DOM.
      await carousel.getByRole('button', { name: locale === 'vi' ? 'Câu sau' : 'Next sentence', exact: true }).click();
      await expectCenteredSlide(page, 1);
      await carousel.locator('.carousel-track').evaluate((track) => {
        const last = track.lastElementChild as HTMLElement;
        track.scrollTo({ left: last.offsetLeft - (track.clientWidth - last.clientWidth) / 2, behavior: 'instant' });
      });
      await expectCenteredSlide(page, 2);

      await carousel.focus();
      await page.keyboard.press('ArrowLeft');
      await expectCenteredSlide(page, 1);
      await page.keyboard.press('ArrowRight');
      await expectCenteredSlide(page, 2);

      const viewport = page.viewportSize()!;
      await page.setViewportSize({ ...viewport, width: viewport.width < 768 ? 320 : 768 });
      await expectCenteredSlide(page, 2);
      await page.setViewportSize(viewport);
    }
  });

  test('LP20/LP21 wrong then right by mouse, sentences by keyboard', async ({ page }) => {
    await page.goto('/en');
    await activeSlide(page).getByRole('button', { name: 'delay' }).click();
    await expect(page.getByTestId('cloze-live')).toContainText('Not quite');
    await activeSlide(page).getByRole('button', { name: 'deploy', exact: true }).click();
    await expect(page.getByTestId('cloze-live')).toContainText('Correct!');
    const region = page.getByRole('region', { name: 'Practice sample' });
    await region.focus();
    await page.keyboard.press('ArrowRight');
    await expect(activeSlide(page)).toHaveAttribute('aria-label', 'Try it · sentence 2/3');
  });

  test('LP28 correct state grows the carousel; no descendant is clipped', async ({ page }) => {
    await page.goto('/vi');
    const region = page.getByRole('region', { name: 'Bài luyện thử' });
    const before = (await region.boundingBox())!.height;
    await activeSlide(page).getByRole('button', { name: 'deploy', exact: true }).click();
    await expect(activeSlide(page).getByText('deploy = triển khai (phần mềm).')).toBeVisible();
    const after = (await region.boundingBox())!.height;
    expect(after).toBeGreaterThan(before);
    const cardBottom = (await activeSlide(page).boundingBox())!;
    const box = (await region.boundingBox())!;
    expect(cardBottom.y + cardBottom.height).toBeLessThanOrEqual(box.y + box.height + 1);
  });
});

test('LP22 flashcard flips on click', async ({ page }) => {
  await page.goto('/vi');
  const card = page.locator('button[aria-pressed]').filter({ hasText: 'Chạm để lật' });
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
  const email = form.getByRole('textbox', { name: 'Email address' });
  await email.fill('name@gmail');
  await form.getByRole('button', { name: 'Get notified at launch' }).click();
  await expect(form.getByText('Enter a valid email, for example name@gmail.com.')).toBeVisible();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await email.fill(`e2e-${Date.now()}@example.com`);
  await form.getByRole('button', { name: 'Get notified at launch' }).click();
  await expect(form.getByText('Please agree to the Privacy Policy to sign up.')).toBeVisible();
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Get notified at launch' }).click();
  await expect(page.getByRole('status')).toContainText("You're on the list!");
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
      [...document.querySelectorAll('[aria-roledescription="slide"] *, #how-it-works li *, h1, h2, h3, p')]
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
  });
});

test.describe('without JavaScript', () => {
  // Reduced motion also turns off smooth scrolling, which otherwise keeps elements 'unstable' for Playwright.
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  test('LP27 copy is present, FAQ toggles, form submits', async ({ page }) => {
    await page.goto('/vi');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Học những từ');
    const second = page.locator('#faq details').nth(1);
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
    const form = page.locator('#waitlist-cta');
    await form.getByRole('textbox').fill(`nojs-${Date.now()}@example.com`);
    await form.getByRole('checkbox').check();
    await form.getByRole('button').click();
    await expect(page.getByText('Đăng ký thành công! Bạn sẽ nhận thông báo khi Wordmet ra mắt.')).toBeVisible();
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
  expect(seen).toEqual(expect.arrayContaining(['Previous sentence', 'Next sentence', 'delay']));
});
