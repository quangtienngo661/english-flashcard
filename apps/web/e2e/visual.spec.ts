import { test } from '@playwright/test';

// Evidence for the manual comparison with Figma (Task 11); no assertions.
for (const locale of ['vi', 'en']) {
  test(`visual ${locale}`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}`);
    for (let y = 0; y < 9000; y += 500) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/visual/${locale}-${testInfo.project.name}.png`, fullPage: true });
  });
}
