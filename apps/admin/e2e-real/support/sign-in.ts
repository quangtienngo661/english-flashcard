import { expect, test, type Page } from '@playwright/test';
import vi from '../../messages/vi.json' with { type: 'json' };
import { retryAfterSeconds } from './api';

/**
 * Signs in through the login page and lands on `/uploads`. The suite as a whole signs in more often than `auth.login.ip`
 * allows in one minute (20), so a 429 waits out its `Retry-After` (the test's time limit grows by the same amount) and tries once more.
 */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(vi.account.login.email).fill(email);
  await page.getByLabel(vi.account.login.password, { exact: true }).fill(password);
  const submit = async () => {
    const answer = page.waitForResponse((res) => res.url().endsWith('/v1/auth/login') && res.request().method() === 'POST');
    await page.getByRole('button', { name: vi.account.login.submit }).click();
    return answer;
  };
  const res = await submit();
  if (res.status() === 429) {
    const seconds = retryAfterSeconds(res.headers()['retry-after']) + 1;
    test.info().setTimeout(test.info().timeout + seconds * 1000);
    await page.waitForTimeout(seconds * 1000);
    await submit();
  }
  await expect(page).toHaveURL(/\/uploads$/);
}
