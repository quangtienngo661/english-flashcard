import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { copy } from './copy';

// The English landing is out of scope for now (design landing-redesign L4): /en redirects to /vi. The deep scan (every tab and every
// exercise state) is LR27 in landing.spec.ts; this one covers the home as it loads and the legal drafts, in both themes.
for (const scheme of ['light', 'dark'] as const) {
  for (const path of ['/vi', '/vi/privacy', '/vi/terms', '/vi/sources']) {
    test(`LP25 axe has no serious or critical violations on ${path} in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      for (let y = 0; y < 12000; y += 500) await page.mouse.wheel(0, 500);
      await page.waitForTimeout(600);
      if (path === '/vi') await page.getByRole('tab', { name: copy.vi.Landing.showcase.tabs.lookup }).click();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    });
  }
}
