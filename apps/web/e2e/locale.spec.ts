import { expect, test } from '@playwright/test';
import { copy } from './copy';

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

  // The root still picks /en for English signals; /en then goes on to /vi until the English landing exists (design landing-redesign L4).
  test('LP7 Accept-Language en-US without country redirects to /en, which goes on to /vi', async ({ request }) => {
    const res = await root(request, { 'accept-language': 'en-US,en;q=0.9' });
    expect(new URL(res.headers().location, 'http://x').pathname).toBe('/en');
    const next = await request.get('/en', { maxRedirects: 0 });
    expect(next.status()).toBe(307);
    expect(new URL(next.headers().location, 'http://x').pathname).toBe('/vi');
  });

  test('LP8 /vi with an English Accept-Language returns 200 Vietnamese', async ({ request }) => {
    const res = await request.get('/vi', { headers: { 'accept-language': 'en-US', 'x-vercel-ip-country': 'US' }, maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('lang="vi"');
  });

  test('LPE4 /vi/khong-ton-tai returns 404 with Vietnamese not-found copy', async ({ page }) => {
    const res = await page.goto('/vi/khong-ton-tai');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: copy.vi.NotFound.title })).toBeVisible();
  });

  test('LPE5 /fr ends on a 404 page', async ({ page }, testInfo) => {
    const res = await page.goto('/fr');
    const chain: string[] = [];
    for (let r = res?.request() ?? null; r; r = r.redirectedFrom()) chain.unshift(r.url());
    testInfo.annotations.push({ type: 'redirect-chain', description: chain.join(' → ') });
    expect(res?.status()).toBe(404);
  });

  test('LP9 a visitor with English signals who opens / ends on the Vietnamese landing', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/vi$/);
    await expect(page.getByRole('heading', { level: 1, name: `${copy.vi.Landing.hero.line1} ${copy.vi.Landing.hero.line2}` })).toBeVisible();
  });

  test('D2 the English legal pages are not redirected', async ({ request }) => {
    for (const path of ['/en/privacy', '/en/terms', '/en/sources']) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(200);
    }
  });
});
