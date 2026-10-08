import { expect, test } from '@playwright/test';

const root = async (request: import('@playwright/test').APIRequestContext, headers: Record<string, string>) =>
  request.get('/', { headers, maxRedirects: 0 });

test.describe('locale at the root', () => {
  test('LP4 country VN without cookie redirects to /vi, uncached', async ({ request }) => {
    const res = await root(request, { 'x-vercel-ip-country': 'VN', 'accept-language': 'en-US' });
    expect(res.status()).toBe(307);
    expect(new URL(res.headers().location, 'http://x').pathname).toBe('/vi');
    expect(res.headers()['cache-control']).toBe('private, no-store');
  });

  test('LP5 cookie en beats country VN', async ({ request }) => {
    const res = await root(request, { 'x-vercel-ip-country': 'VN', cookie: 'NEXT_LOCALE=en' });
    expect(res.status()).toBe(307);
    expect(new URL(res.headers().location, 'http://x').pathname).toBe('/en');
  });

  test('LP6 Accept-Language vi-VN without country redirects to /vi', async ({ request }) => {
    const res = await root(request, { 'accept-language': 'vi-VN,vi;q=0.9' });
    expect(new URL(res.headers().location, 'http://x').pathname).toBe('/vi');
  });

  test('LP7 Accept-Language en-US without country redirects to /en', async ({ request }) => {
    const res = await root(request, { 'accept-language': 'en-US,en;q=0.9' });
    expect(new URL(res.headers().location, 'http://x').pathname).toBe('/en');
  });

  test('LP8 /vi with an English Accept-Language returns 200 Vietnamese', async ({ request }) => {
    const res = await request.get('/vi', { headers: { 'accept-language': 'en-US', 'x-vercel-ip-country': 'US' }, maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('lang="vi"');
  });

  test('LPE4 /vi/khong-ton-tai returns 404 with Vietnamese not-found copy', async ({ page }) => {
    const res = await page.goto('/vi/khong-ton-tai');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
  });

  test('LPE5 /fr ends on a 404 page', async ({ page }, testInfo) => {
    const res = await page.goto('/fr');
    const chain: string[] = [];
    for (let r = res?.request() ?? null; r; r = r.redirectedFrom()) chain.unshift(r.url());
    testInfo.annotations.push({ type: 'redirect-chain', description: chain.join(' → ') });
    expect(res?.status()).toBe(404);
  });

  test('LP9 clicking EN on /vi lands on /en, and / then redirects to /en', async ({ page }) => {
    await page.goto('/vi');
    await page.getByRole('group', { name: 'Ngôn ngữ' }).getByRole('link', { name: 'EN' }).click();
    await expect(page).toHaveURL(/\/en$/);
    const res = await page.request.get('/', { headers: { 'x-vercel-ip-country': 'VN' }, maxRedirects: 0 });
    expect(new URL(res.headers().location, 'http://x').pathname).toBe('/en');
  });
});
