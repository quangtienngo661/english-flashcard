import { expect, test } from '@playwright/test';

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
    // and every node dot and label are keep-out areas for the three cards, the three ghost chips (the caption went, owner 13/11/2026).
    test(`at 1440 x 900 ${path} no card or ghost chip covers the path, a node dot or a node label`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await expect(page.getByText('mitigate').first()).toBeVisible();
      type Box = { x: number; y: number; width: number; height: number };
      // One evaluate for every box: the register page can shift the panel between two separate reads, which made the first attempt flaky.
      const measured = await page.evaluate(() => {
        const path = document.querySelector('svg path[stroke-dasharray]') as SVGPathElement;
        const m = path.getScreenCTM()!;
        const points: Array<{ x: number; y: number }> = [];
        for (let d = 0; d <= path.getTotalLength(); d += 8) {
          const p = path.getPointAtLength(d);
          points.push({ x: p.x * m.a + m.e, y: p.y * m.d + m.f });
        }
        const rect = (e: Element) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        const byText = (text: string, up: number) => {
          let e = Array.from(document.querySelectorAll('div, p, span, b')).find((n) => n.children.length === 0 && n.textContent === text) ?? null;
          for (let i = 0; e && i < up; i++) e = e.parentElement;
          return e ? rect(e) : null;
        };
        const nodes = Array.from(document.querySelectorAll('svg foreignObject')).filter((f) => /Mới|Bậc/.test(f.textContent ?? ''));
        const nodeBoxes = nodes.flatMap((f) => {
          const row = f.firstElementChild!;
          return [rect(row.children[0]), rect(row.children[1])];
        });
        return {
          points,
          nodes: nodes.length,
          nodeBoxes,
          panel: {
            'word card': byText('to make something bad less serious', 2),
            'Hôm nay card': byText('Hôm nay', 1),
            'practice card': byText('Điền từ vào câu', 1),
            'ghost chip deadline': byText('deadline', 0),
            'ghost chip negotiate': byText('negotiate', 0),
            'ghost chip commute': byText('commute', 0),
          } as Record<string, Box | null>,
        };
      });
      expect(measured.nodes, 'the six level nodes are drawn').toBe(6);
      expect(measured.points.length, 'the path is sampled').toBeGreaterThanOrEqual(100);
      const hit = (a: Box, b: Box) => !(a.x >= b.x + b.width || b.x >= a.x + a.width || a.y >= b.y + b.height || b.y >= a.y + a.height);
      const corridor: Box[] = measured.points.map((p) => ({ x: p.x - 23, y: p.y - 8, width: 46, height: 16 }));
      for (const [name, box] of Object.entries(measured.panel)) {
        expect(box, `${name} is drawn`).not.toBeNull();
        expect(corridor.some((c) => hit(box!, c)), `${name} ${JSON.stringify(box)} stays off the path`).toBe(false);
        expect(measured.nodeBoxes.some((n) => hit(box!, n)), `${name} ${JSON.stringify(box)} stays off the node dots and labels`).toBe(false);
      }
    });

    // F.17 fix round 1: the three cards keep at least 4 px from each other (real boxes, rotation included).
    test(`at 1440 x 900 ${path} each card keeps 4 px from the other cards`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport size');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await expect(page.getByText('mitigate').first()).toBeVisible();
      type Box = { x: number; y: number; width: number; height: number };
      const boxes = await page.evaluate(() => {
        const byText = (text: string, up: number) => {
          let e = Array.from(document.querySelectorAll('div, p, span, b')).find((n) => n.children.length === 0 && n.textContent === text) ?? null;
          for (let i = 0; e && i < up; i++) e = e.parentElement;
          if (!e) return null;
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        return {
          'word card': byText('to make something bad less serious', 2),
          'Hôm nay card': byText('Hôm nay', 1),
          'practice card': byText('Điền từ vào câu', 1),
        } as Record<string, Box | null>;
      });
      // Distance between two boxes along the axis where they are apart; negative when they overlap.
      const gap = (a: Box, b: Box) => Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), a.y - (b.y + b.height), b.y - (a.y + a.height));
      for (const [name, box] of Object.entries(boxes)) expect(box, `${name} is drawn`).not.toBeNull();
      const pairs: Array<[string, string]> = [
        ['word card', 'Hôm nay card'], ['word card', 'practice card'], ['Hôm nay card', 'practice card']
      ];
      const gaps = pairs.map(([a, b]) => `${a} / ${b}: ${gap(boxes[a]!, boxes[b]!).toFixed(1)} px`);
      console.log(`F17 gaps (${path}): ${gaps.join('; ')}`);
      for (const [a, b] of pairs) {
        expect(gap(boxes[a]!, boxes[b]!), `${a} ${JSON.stringify(boxes[a])} and ${b} ${JSON.stringify(boxes[b])} keep 4 px apart`).toBeGreaterThanOrEqual(4);
      }
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
