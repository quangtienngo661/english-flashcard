import { expect, test } from '@playwright/test';
import { copy } from './copy';

const attr = (html: string, pattern: RegExp) => html.match(pattern)?.[1] ?? null;

// Only the Vietnamese landing exists (design landing-redesign L4), so hreflang lists vi and x-default and no English alternate.
test('LP10 /vi carries complete metadata', async ({ request }) => {
  const html = await (await request.get('/vi')).text();
  expect(attr(html, /<html[^>]*lang="([^"]+)"/)).toBe('vi');
  expect(attr(html, /<title>([^<]+)<\/title>/)).toContain('Wordmet');
  expect(attr(html, /<meta name="description" content="([^"]+)"/)).toBeTruthy();
  expect(attr(html, /<link rel="canonical" href="([^"]+)"/)).toMatch(/\/vi$/);
  for (const hreflang of ['vi', 'x-default']) {
    expect(html, `hreflang ${hreflang}`).toMatch(new RegExp(`<link rel="alternate" hrefLang="${hreflang}" href="[^"]+"`, 'i'));
  }
  expect(html, 'no English alternate').not.toMatch(/<link rel="alternate" hrefLang="en"/i);
  for (const prop of ['og:title', 'og:description', 'og:image']) expect(html).toContain(`property="${prop}"`);
  expect(attr(html, /<meta property="og:locale" content="([^"]+)"/)).toBe('vi_VN');
  expect(html).not.toContain('og:locale:alternate');
  expect(attr(html, /<meta name="twitter:card" content="([^"]+)"/)).toBe('summary_large_image');
  // Design §11, M8.8: offers in VND with the prices the build read; e2e builds have no API, so these are the fallback prices.
  const ld = attr(html, /<script type="application\/ld\+json">(.+?)<\/script>/s);
  const data = JSON.parse(ld ?? '[]') as Array<{ '@type': string; offers?: Array<{ price: number; priceCurrency: string }> }>;
  expect(data.map((d) => d['@type'])).toEqual(['WebSite', 'SoftwareApplication', 'Organization']);
  const offers = data[1]?.offers ?? [];
  expect(offers.map((offer) => offer.priceCurrency)).toEqual(['VND', 'VND', 'VND', 'VND']);
  expect(offers.map((offer) => offer.price)).toEqual([0, 79000, 199000, 599000]);
});

// Design §11: a page's `alternates` and `openGraph` replace the root layout's, so the Privacy page declares its own.
test('the Privacy page has its own canonical, hreflang vi and en, and og:url', async ({ request }) => {
  const html = await (await request.get('/vi/privacy')).text();
  expect(attr(html, /<link rel="canonical" href="([^"]+)"/)).toMatch(/\/vi\/privacy$/);
  expect(attr(html, /<link rel="alternate" hrefLang="vi" href="([^"]+)"/i)).toMatch(/\/vi\/privacy$/);
  expect(attr(html, /<link rel="alternate" hrefLang="en" href="([^"]+)"/i)).toMatch(/\/en\/privacy$/);
  expect(attr(html, /<meta property="og:url" content="([^"]+)"/)).toMatch(/\/vi\/privacy$/);
  expect(attr(html, /<meta name="description" content="([^"]+)"/)).toBeTruthy();
});

// Design §11: sign-in pages stay noindex but carry their own title, so a shared link does not show the home page's.
test('/vi/app/login has its own title, noindex and no canonical to the home page', async ({ request }) => {
  const html = await (await request.get('/vi/app/login')).text();
  const title = attr(html, /<title>([^<]+)<\/title>/);
  expect(title).toBe(`${copy.vi.App.auth.login.title} · Wordmet`);
  expect(title).not.toBe(copy.vi.Metadata.title);
  expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  expect(html).not.toMatch(/<link rel="canonical"/);
});

test('LP11 without NEXT_PUBLIC_INDEXABLE robots.txt disallows / and pages carry noindex', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \/\s/);
  expect(robots).toContain('Sitemap: ');
  const html = await (await request.get('/vi')).text();
  expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
});

test('sitemap lists /vi alone', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).toMatch(/<loc>[^<]+\/vi<\/loc>/);
  expect(xml).not.toMatch(/<loc>[^<]+\/en<\/loc>/);
  // Design §11: /vi/privacy joins only when NEXT_PUBLIC_INDEXABLE is on, and e2e builds are not indexable.
  expect(xml).not.toContain('/privacy');
  expect(xml).not.toMatch(/hreflang="en"/);
});

test('opengraph-image returns image/png 1200x630', async ({ request }) => {
  const html = await (await request.get('/vi')).text();
  const ogUrl = attr(html, /<meta property="og:image" content="([^"]+)"/);
  expect(ogUrl).toBeTruthy();
  const res = await request.get(new URL(ogUrl!).pathname + new URL(ogUrl!).search);
  expect(res.headers()['content-type']).toBe('image/png');
  const png = await res.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  expect(attr(html, /<meta property="og:image:alt" content="([^"]+)"/)).toBe(copy.vi.Metadata.ogAlt);
});
