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
  const ld = attr(html, /<script type="application\/ld\+json">(.+?)<\/script>/s);
  const types = (JSON.parse(ld ?? '[]') as Array<{ '@type': string }>).map((d) => d['@type']);
  expect(types).toEqual(['WebSite', 'SoftwareApplication']);
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
  // Legal pages are hidden until launch (09/10/2026); add them back with the links.
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
