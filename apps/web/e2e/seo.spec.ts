import { expect, test } from '@playwright/test';

const attr = (html: string, pattern: RegExp) => html.match(pattern)?.[1] ?? null;

for (const [locale, ogLocale, lang] of [['vi', 'vi_VN', 'vi'], ['en', 'en_US', 'en']] as const) {
  test(`LP10 /${locale} carries complete metadata`, async ({ request }) => {
    const html = await (await request.get(`/${locale}`)).text();
    expect(attr(html, /<html[^>]*lang="([^"]+)"/)).toBe(lang);
    expect(attr(html, /<title>([^<]+)<\/title>/)).toContain('Wordmet');
    expect(attr(html, /<meta name="description" content="([^"]+)"/)).toBeTruthy();
    expect(attr(html, /<link rel="canonical" href="([^"]+)"/)).toMatch(new RegExp(`/${locale}$`));
    for (const hreflang of ['vi', 'en', 'x-default']) {
      expect(html, `hreflang ${hreflang}`).toMatch(new RegExp(`<link rel="alternate" hrefLang="${hreflang}" href="[^"]+"`, 'i'));
    }
    for (const prop of ['og:title', 'og:description', 'og:image']) expect(html).toContain(`property="${prop}"`);
    expect(attr(html, /<meta property="og:locale" content="([^"]+)"/)).toBe(ogLocale);
    expect(attr(html, /<meta name="twitter:card" content="([^"]+)"/)).toBe('summary_large_image');
    const ld = attr(html, /<script type="application\/ld\+json">(.+?)<\/script>/s);
    const types = (JSON.parse(ld ?? '[]') as Array<{ '@type': string }>).map((d) => d['@type']);
    expect(types).toEqual(['WebSite', 'SoftwareApplication']);
  });
}

test('LP11 without NEXT_PUBLIC_INDEXABLE robots.txt disallows / and pages carry noindex', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \/\s/);
  expect(robots).toContain('Sitemap: ');
  const html = await (await request.get('/vi')).text();
  expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
});

test('sitemap lists /vi and /en with alternates', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).toMatch(/<loc>[^<]+\/vi<\/loc>/);
  expect(xml).toMatch(/<loc>[^<]+\/en<\/loc>/);
  expect(xml).toMatch(/<loc>[^<]+\/vi\/privacy<\/loc>/);
  expect(xml).toMatch(/hreflang="en"/);
});

test('opengraph-image returns image/png 1200x630', async ({ request }) => {
  const html = await (await request.get('/vi')).text();
  const ogUrl = attr(html, /<meta property="og:image" content="([^"]+)"/);
  expect(ogUrl).toBeTruthy();
  const res = await request.get(new URL(ogUrl!).pathname + new URL(ogUrl!).search);
  expect(res.headers()['content-type']).toBe('image/png');
  const png = await res.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  expect(attr(html, /<meta property="og:image:alt" content="([^"]+)"/)).toBe('Wordmet: học từ vựng tiếng Anh từ những câu bạn đã đọc');
});
