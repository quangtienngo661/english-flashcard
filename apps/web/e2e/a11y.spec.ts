import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { copy } from './copy';

for (const locale of ['vi', 'en'] as const) {
  test(`LP25 axe has no serious or critical violations on /${locale}`, async ({ page }) => {
    await page.goto(`/${locale}`);
    for (let y = 0; y < 9000; y += 500) await page.mouse.wheel(0, 500);
    await page.waitForTimeout(600);
    await page
      .getByRole('region', { name: copy[locale].Cloze.region })
      .getByRole('button', { name: copy[locale].Cloze.items.deploy.answer, exact: true })
      .click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  });
}
