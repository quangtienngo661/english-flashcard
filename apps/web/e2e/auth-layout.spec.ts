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
