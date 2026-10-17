import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Serious and critical axe violations of the settled page, as `id: targets` lines. It first waits until no finite
 * animation is running: a dialog or panel caught mid-entrance is still partly transparent and reads as low contrast.
 * Endless animations (loading spinners) are ignored, or the wait would never end.
 */
export async function seriousViolations(page: Page): Promise<string[]> {
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length))
    .toBe(0);
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}
