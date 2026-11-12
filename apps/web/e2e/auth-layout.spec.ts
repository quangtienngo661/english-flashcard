import { expect, test, type Locator } from '@playwright/test';

// Plan part 2, M2.5 (design §5.4, Figma 35:308 / 35:405): from 1280 px sign-in and sign-up sit beside the brand panel again (this
// replaces LR43 of 03/11/2026); narrower screens get the centred card with no panel.
test.describe('M2.5 the sign-in pages: brand panel from 1280 px, centred card below', () => {
  for (const path of ['/vi/app/login', '/vi/app/register']) {
    test(`at 1440 x 900 ${path} shows the brand panel and the form in the left half`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await expect(page.getByText('mitigate').first()).toBeVisible();
      const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
      expect(heading!.x + heading!.width, 'the title ends in the left half').toBeLessThanOrEqual(720);
    });

    // P.14 (chỗ 20): the faint background chips sit under the panel's cards, never on the word card. Reduced motion keeps the word card on
    // "mitigate"; its position does not depend on motion. The card is the definition's grandparent (card > swapped content > line).
    test(`at 1440 x 900 ${path} the "negotiate" chip does not overlap the word card`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      const chip = await page.getByText('negotiate', { exact: true }).boundingBox();
      const card = await page.getByText('to make something bad less serious', { exact: true }).locator('xpath=../..').boundingBox();
      expect(chip, 'the negotiate chip is drawn').not.toBeNull();
      expect(card, 'the word card is drawn').not.toBeNull();
      const apart =
        chip!.x >= card!.x + card!.width || card!.x >= chip!.x + chip!.width || chip!.y >= card!.y + card!.height || card!.y >= chip!.y + chip!.height;
      expect(apart, `chip ${JSON.stringify(chip)} and word card ${JSON.stringify(card)} do not intersect`).toBe(true);
    });

    // F.17: nothing on the panel covers the memory path. Points every 8 px along the path, each grown to a travelling chip (46 x 16),
    // and every node dot and label are keep-out areas for the three cards, the three ghost chips and the caption.
    test(`at 1440 x 900 ${path} no card, ghost chip or caption covers the path, a node dot or a node label`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await expect(page.getByText('mitigate').first()).toBeVisible();
      type Box = { x: number; y: number; width: number; height: number };
      const keepOut = await page.evaluate(() => {
        const path = document.querySelector('svg path[stroke-dasharray]') as SVGPathElement;
        const m = path.getScreenCTM()!;
        const points: Array<{ x: number; y: number }> = [];
        for (let d = 0; d <= path.getTotalLength(); d += 8) {
          const p = path.getPointAtLength(d);
          points.push({ x: p.x * m.a + m.e, y: p.y * m.d + m.f });
        }
        const nodes = Array.from(document.querySelectorAll('svg foreignObject')).filter((f) => /Mới|Bậc/.test(f.textContent ?? ''));
        const rect = (e: Element) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        const nodeBoxes = nodes.flatMap((f) => {
          const row = f.firstElementChild!;
          return [rect(row.children[0]), rect(row.children[1])];
        });
        return { points, nodes: nodes.length, nodeBoxes };
      });
      expect(keepOut.nodes, 'the six level nodes are drawn').toBe(6);
      expect(keepOut.points.length, 'the path is sampled').toBeGreaterThanOrEqual(100);
      const hit = (a: Box, b: Box) => !(a.x >= b.x + b.width || b.x >= a.x + a.width || a.y >= b.y + b.height || b.y >= a.y + a.height);
      const corridor: Box[] = keepOut.points.map((p) => ({ x: p.x - 23, y: p.y - 8, width: 46, height: 16 }));
      const panel: Array<[string, Locator]> = [
        ['word card', page.getByText('to make something bad less serious', { exact: true }).locator('xpath=../..')],
        ['Hôm nay card', page.getByText('Hôm nay', { exact: true }).locator('xpath=..')],
        ['practice card', page.getByText('Điền từ vào câu', { exact: true }).locator('xpath=..')],
        ['ghost chip deadline', page.getByText('deadline', { exact: true })],
        ['ghost chip negotiate', page.getByText('negotiate', { exact: true })],
        ['ghost chip commute', page.getByText('commute', { exact: true })],
        ['caption', page.getByText('Đường nhớ của mỗi từ.', { exact: true }).locator('xpath=../..')],
      ];
      for (const [name, locator] of panel) {
        const box = await locator.boundingBox();
        expect(box, `${name} is drawn`).not.toBeNull();
        expect(corridor.some((c) => hit(box!, c)), `${name} ${JSON.stringify(box)} stays off the path`).toBe(false);
        expect(keepOut.nodeBoxes.some((n) => hit(box!, n)), `${name} ${JSON.stringify(box)} stays off the node dots and labels`).toBe(false);
      }
      await page.screenshot({ path: '../../.superpowers/sdd/2026-11-10-giao-dien-moi/shots/F17-showcase-1440.png' });
    });

    for (const width of [1024, 390]) {
      test(`at ${width} px ${path} has no panel and its card is centred`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const card = page.getByRole('heading', { level: 1 }).locator('xpath=ancestor::section[1]');
        await expect(card).toBeVisible();
        await expect(page.getByText('mitigate').first()).toBeHidden();
        const box = await card.boundingBox();
        expect(Math.abs(box!.x + box!.width / 2 - width / 2), 'distance of the card centre from the page centre').toBeLessThanOrEqual(2);
      });
    }
  }
});
