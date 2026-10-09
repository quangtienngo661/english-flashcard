import { expect, test } from '@playwright/test';
import { queryLocalD1 } from './d1';

test('DE1/DE2 sign-up writes one normalized row; signing up again keeps one row', async ({ page }) => {
  const email = `e2e-${Date.now()}-${test.info().project.name}@example.com`;
  for (const typed of [`  ${email.toUpperCase()} `, email]) {
    await page.goto('/en');
    const form = page.locator('#waitlist-hero');
    await form.getByRole('textbox', { name: 'Email address' }).fill(typed);
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: 'Get notified at launch' }).click();
    await expect(page.getByRole('status')).toContainText('You\'re on the list!');
  }
  expect(queryLocalD1(`SELECT email, locale FROM waitlist WHERE email = '${email}'`)).toEqual([{ email, locale: 'en' }]);
});
