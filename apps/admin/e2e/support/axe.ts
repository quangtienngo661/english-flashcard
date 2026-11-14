import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Serious and critical axe violations of the settled page, as `id: targets` lines. It first waits until no finite
 * animation is running: a dialog or panel caught mid-entrance is still partly transparent and reads as low contrast.
 * Endless animations (loading spinners) are ignored, or the wait would never end.
 * It also waits until every open dialog is fully opaque: on a touch screen (the mobile project) React Aria keeps a new
 * dialog at opacity 0 for two frames before its entrance animation starts, so "no animation running" is briefly true
 * before the dialog has appeared, and the fade-in then overlaps the scan.
 */
export async function seriousViolations(page: Page): Promise<string[]> {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        running: document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length,
        notOpaqueDialogs: [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter((dialog) => {
          for (let el: Element | null = dialog; el; el = el.parentElement) if (getComputedStyle(el).opacity !== '1') return true;
          return false;
        }).length,
      })),
    )
    .toEqual({ running: 0, notOpaqueDialogs: 0 });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}
