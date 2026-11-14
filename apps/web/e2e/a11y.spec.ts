import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PUBLISHED } from './support/published';

// LP25 / LR27: every public page as it loads, in both themes, scrolled through so the sections that come in on scroll are drawn. The legal
// and sources pages twice: with no API (draft, "no sources") and with a published text (support/public-api.mjs). /en is the English
// landing (design landing-redesign L4, reversed 14/11/2026). The states behind a click (an open FAQ answer, the phone contents list) are LR27 in landing.spec.ts.
const PATHS = ['/vi', '/en', '/vi/privacy', '/vi/terms', '/vi/sources', '/vi/khong-ton-tai', `${PUBLISHED}/vi/privacy`, `${PUBLISHED}/vi/terms`, `${PUBLISHED}/vi/sources`];

for (const scheme of ['light', 'dark'] as const) {
  for (const path of PATHS) {
    test(`LP25 axe has no serious or critical violations on ${path} in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      for (let y = 0; y < 14000; y += 500) await page.mouse.wheel(0, 500);
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    });
  }
}
