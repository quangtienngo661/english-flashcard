import { expect, type Page } from '@playwright/test';

/**
 * Nothing sticks out sideways. The shell's `main` clips (`overflow-clip`), so a too-wide child is cut off instead of
 * making the page scroll: `scrollWidth` alone cannot see it. Check the window, then every element inside `main`.
 */
export async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  const sticking = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return ['no main'];
    const edge = main.getBoundingClientRect().right + 1;
    return [...main.querySelectorAll('*')]
      .filter((el) => !el.closest('[data-testid="hidden-select-container"]')) // React Aria's 1-px clipped native <select>, as wide as its longest option
      .filter((el) => el.getBoundingClientRect().right > edge).map((el) => `${el.tagName}.${el.className}`.slice(0, 80));
  });
  expect(sticking).toEqual([]);
}
