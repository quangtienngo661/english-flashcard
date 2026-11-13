import { expect, test, type Page } from '@playwright/test';
import { signedInAs, type MockHandler } from '../support/mock-api';

// Polish fix F.3 (owner f13): the pages fit by height as well as by width. 844 x 390 is a phone on its side, 768 x 1024 and 1024 x 768
// an iPad (its top bar must fit too), 1280 x 800 a small laptop, 390 x 844 a phone upright (the calendar button sat on the Ôn button there).
const SIZES = [
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 667, height: 375 }, // a small phone on its side, narrower than 48rem: the phone arc, shrunk
] as const;

const NOW = new Date('2026-11-08T03:00:00Z');
const GROUPS = ['Công nghệ', 'Du lịch', 'Đời sống', 'Kinh doanh', 'Y tế'];
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const cells = (due: number[]) => [3, 4, 2, 1, 0, 0].map((total, level) => ({ level, total, due: due[level] }));
const summaries = GROUPS.map((name, i) => ({
  id: uuid(900 + i), name, version: 1, total: 10, today: { priority: 1, due: 2, new: 1 }, cells: cells([1, 1, 1, 0, 0, 0]), backlog: 0, available: { due: 2, new: 1 },
}));
const detail = (g: (typeof summaries)[number]) => ({ id: g.id, name: g.name, version: 1, item_count: g.total, removable_items: 0, created_at: '2026-10-01T03:00:00Z', updated_at: '2026-10-01T03:00:00Z' });

const api: Record<string, MockHandler> = {
  'GET /v1/groups': () => ({ json: { items: summaries } }),
  'GET /v1/me/streak': () => ({ json: { days: 6, studied_today: true } }),
  'GET /v1/me/calendar': (req) => ({ json: { month: req.query.get('month') ?? '2026-11', days: [], totals: { study_days: 0, learned: 0, reviewed: 0, practice_sessions: 0 } } }),
  'GET /v1/words': () => ({ json: { items: [], next_page_token: null, total: 0 } }),
  'GET /v1/items': () => ({ json: { items: [] } }),
  'GET /v1/practice/weak-words/groups': () => ({ json: { total: 0, items: [] } }),
  'GET /v1/practice/weak-words': () => ({ json: { items: [], next_page_token: null } }),
};
for (const g of summaries) {
  api[`GET /v1/groups/${g.id}`] = () => ({ json: detail(g) });
  api[`GET /v1/groups/${g.id}/queue`] = () => ({ json: { cards: [] } });
  api[`GET /v1/groups/${g.id}/items`] = () => ({ json: { items: [], next_page_token: null } });
  api[`GET /v1/groups/${g.id}/backlog`] = () => ({ json: { items: [], next_page_token: null } });
}

async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const size of SIZES) {
  test.describe(`${size.width} x ${size.height}`, () => {
    test.use({ viewport: size });
    // The viewport is set here, so one project is enough.
    test.beforeEach(async ({}, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sizes are set by the spec itself');
    });

    test('no horizontal scroll on the learner pages', async ({ page }) => {
      test.setTimeout(120_000); // eight pages, each compiled on first visit when the app runs in dev
      await page.clock.setFixedTime(NOW);
      await signedInAs(page, 'pro', api);
      for (const path of ['', '/groups', `/group?id=${summaries[0].id}`, '/lookup', '/practice', '/practice/weak', '/settings']) {
        await page.goto(`/vi/app${path}`);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
        await noSideScroll(page);
      }
      await page.goto('/vi/app');
      await page.getByRole('button', { name: 'Lịch học' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await noSideScroll(page);
    });

    test('the top bar: every tab, Thêm từ and the search box fit side by side', async ({ page }) => {
      test.skip(size.width < 768 || size.width > 1280, 'the top bar shows from 768 px');
      await page.clock.setFixedTime(NOW);
      await signedInAs(page, 'pro', api);
      await page.goto('/vi/app');
      const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
      const links = nav.getByRole('link');
      await expect(links).toHaveCount(4);
      // Audit C1 (QA2): below 1280 px the box shrank to 23 px, so there it is a round link to Tra từ; from 1280 px the box has room to type.
      const wide = size.width >= 1280;
      const searchItem = wide ? page.getByRole('search') : page.getByRole('link', { name: 'Tìm từ' });
      await expect(searchItem).toBeVisible();
      if (wide) {
        expect((await page.getByRole('searchbox', { name: 'Tìm từ' }).boundingBox())!.width, 'the search box is wide enough to type in').toBeGreaterThanOrEqual(160);
      } else {
        await expect(page.getByRole('search')).toHaveCount(0);
      }
      const search = (await searchItem.boundingBox())!;
      const add = (await page.getByRole('button', { name: /Thêm từ/ }).boundingBox())!;
      const boxes = await links.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, clipped: el.scrollWidth > el.clientWidth }; }));
      for (const box of boxes) {
        expect(box.clipped).toBe(false);
        expect(meets(box, search), 'a tab under the search box').toBe(false);
        expect(meets(box, add), 'a tab under Thêm từ').toBe(false);
      }
      expect(boxes[3].x + boxes[3].width, 'last tab ends before the search box').toBeLessThanOrEqual(search.x);
      expect(add.x + add.width).toBeLessThanOrEqual(size.width);
      await noSideScroll(page);
    });

    test('Nhóm: Học and Ôn are on the first screen and the calendar button covers no card', async ({ page }) => {
      await page.clock.setFixedTime(NOW);
      await signedInAs(page, 'pro', api);
      await page.goto('/vi/app/groups');
      // Control: the carousel and its centre stack are rendered, so a zero overlap means "no overlap".
      const carousel = page.getByRole('region', { name: 'Các nhóm của bạn' });
      await expect(carousel).toBeVisible();
      await expect(page.locator('.gcar-slot .gstack').first()).toBeVisible();
      const calendar = page.getByRole('button', { name: 'Lịch học' });
      await expect(calendar).toBeVisible();

      const cal = (await calendar.boundingBox())!;
      for (const name of ['Học', 'Ôn']) {
        const link = page.getByRole('link', { name, exact: true });
        await expect(link).toBeVisible();
        const box = (await link.boundingBox())!;
        expect(box.y, `${name} top`).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height, `${name} bottom`).toBeLessThanOrEqual(size.height);
        expect(box.x + box.width, `${name} right`).toBeLessThanOrEqual(size.width);
        // Nothing sits on top of it either (the phone tab bar covered the second row of buttons on a short screen).
        const topmost = await link.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return hit !== null && el.contains(hit);
        });
        expect(topmost, `${name} is the topmost element at its centre`).toBe(true);
        // Nothing but the page's own scroll box is needed: it must not scroll to reach it.
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        // The floating calendar button does not sit on the buttons either (owner saw it on Ôn at 390 px).
        expect(meets(cal, box), `${name} under the calendar button`).toBe(false);
      }

      const cards = await page.locator('.gcar-slot').evaluateAll((slots) =>
        slots
          .filter((slot) => Number(getComputedStyle(slot).opacity) > 0.05)
          .map((slot) => {
            const r = slot.querySelector('.gstack-face')!.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          }));
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.filter((card) => meets(cal, card))).toEqual([]);
    });

    test('Nhóm: pressing the visible card on the right brings it to the centre', async ({ page }) => {
      await page.clock.setFixedTime(NOW);
      await signedInAs(page, 'pro', api);
      await page.goto('/vi/app/groups');
      const right = page.locator('.gcar-slot[data-k="1"]');
      await expect(right).toBeVisible(); // control: the neighbour exists and is shown
      const text = await right.innerText();
      const name = GROUPS.find((g) => text.includes(g))!;
      const face = (await right.locator('.gstack-face').boundingBox())!;
      // A press on the card's own face lands on the track (the side stacks are inert); the hit-test must find k = 1 from where it fell.
      await page.mouse.click(face.x + face.width / 2, face.y + face.height / 2);
      await expect(page.locator('.gcar-slot[data-abs="0"]').filter({ hasText: name })).toHaveCount(1);
    });
  });
}
