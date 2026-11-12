import { expect, test } from '@playwright/test';
import { copy } from '../copy';
import { problem, requests, signedInAs, tokenBody } from '../support/mock-api';

const vi = copy.vi.App;

// LA2#12 (B8-4): a learner who signs in with Google only has no password. Settings offers "Đặt mật khẩu", which is the forgot-password
// flow; the page must stay open for a signed-in learner (it used to bounce to /app), mail a code, take the code and a new password,
// and end on the sign-in page with the "password changed" line (the API signs every session out on a password reset).
test('LA2#12: a Google-only learner sets a password from Settings, through the forgot-password and reset pages', async ({ page }) => {
  let reset = false;
  await signedInAs(page, 'free', {
    // A password reset revokes the sessions: after it, the refresh cookie no longer works.
    'POST /v1/auth/refresh': () => (reset ? problem(401, 'invalid-token') : tokenBody()),
    'POST /v1/auth/otp': () => ({ status: 202, json: {} }),
    'POST /v1/auth/password/reset': () => {
      reset = true;
      return { status: 204 };
    },
  }, { auth_method: 'google', sign_in_methods: ['google'] });

  await page.goto('/vi/app/settings');
  await page.getByRole('link', { name: new RegExp(vi.settings.setPassword) }).click();
  await expect(page).toHaveURL(/\/vi\/app\/forgot-password$/);
  await expect(page.getByRole('heading', { name: vi.auth.forgot.title })).toBeVisible();

  await page.getByRole('textbox', { name: vi.auth.email }).fill('lan@example.com');
  await page.getByRole('button', { name: vi.auth.forgot.submit }).click();
  await expect(page).toHaveURL(/\/vi\/app\/reset-password$/);
  expect(requests(page, 'POST', '/v1/auth/otp')[0]?.body).toMatchObject({ purpose: 'reset_password', email: 'lan@example.com' });

  // The page was loaded by a full navigation: text typed before React has hydrated is thrown away, so type again until the button wakes up.
  const submit = page.getByRole('button', { name: vi.auth.reset.submit });
  await expect(async () => {
    await page.getByRole('textbox', { name: vi.auth.reset.code }).fill('482913');
    await page.getByLabel(vi.auth.reset.newPassword).fill('Aa1!aaaa');
    await expect(submit).toBeEnabled({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await submit.click();

  await expect(page).toHaveURL(/\/vi\/app\/login\?reset=1$/);
  await expect(page.getByText(vi.auth.login.passwordReset)).toBeVisible();
  expect(requests(page, 'POST', '/v1/auth/password/reset')[0]?.body).toEqual({ email: 'lan@example.com', code: '482913', new_password: 'Aa1!aaaa', turnstile_token: 'e2e-turnstile-token' });
});
