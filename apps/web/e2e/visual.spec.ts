import { test } from '@playwright/test';

// Evidence for the manual look at the landing (design landing-redesign §11, Task 14); no assertions.
for (const scheme of ['light', 'dark'] as const) {
  test(`visual vi ${scheme}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/vi');
    for (let y = 0; y < 12000; y += 500) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/visual/vi-${scheme}-${testInfo.project.name}.png`, fullPage: true });
  });
}
