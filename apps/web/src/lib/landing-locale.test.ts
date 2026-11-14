import { afterEach, vi } from 'vitest';
import { buildMetadata } from './metadata';
import { LANDING_LOCALES } from './landing-locale';

describe('landing locales (design landing-redesign L4, reversed 14/11/2026)', () => {
  it('both languages have a landing, so /en is served and no longer goes to /vi', () => {
    expect(LANDING_LOCALES).toEqual(['vi', 'en']);
  });
});

describe('landing metadata advertises both landings', () => {
  it('hreflang lists vi, en and x-default', () => {
    const meta = buildMetadata('vi', { title: 'Wordmet', description: 'd' });
    expect(meta.alternates?.languages).toEqual({ vi: '/vi', en: '/en', 'x-default': '/' });
    expect(meta.openGraph).not.toHaveProperty('alternateLocale');
  });

  it('the English landing is its own canonical page with an en_US Open Graph locale', () => {
    const meta = buildMetadata('en', { title: 'Wordmet', description: 'd' });
    expect(meta.alternates?.canonical).toBe('/en');
    expect(meta.openGraph).toMatchObject({ url: '/en', locale: 'en_US' });
  });
});

// Design §11: the sitemap lists only indexable pages. `site.indexable` is read when `lib/site` loads, so each case reloads the modules.
describe('sitemap (design §11)', () => {
  const legal = {
    version: '3',
    effective_date: '2026-11-10',
    privacy: { vi: '# Chính sách', en: null },
    terms: { vi: '# Điều khoản', en: null },
  };

  async function loadSitemap(indexable: boolean) {
    vi.resetModules();
    if (indexable) vi.stubEnv('NEXT_PUBLIC_INDEXABLE', 'true');
    else vi.stubEnv('NEXT_PUBLIC_INDEXABLE', '');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://wordmet.com');
    return (await import('../app/sitemap')).default;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('has the two landings alone and reads no API while the site is not indexable', async () => {
    const fetchMock = vi.fn(async () => Response.json(legal));
    vi.stubGlobal('fetch', fetchMock);
    const sitemap = await loadSitemap(false);
    expect((await sitemap()).map((entry) => new URL(entry.url).pathname)).toEqual(['/vi', '/en']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds /vi/privacy with the effective date of the published text when the site is indexable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(legal)));
    const sitemap = await loadSitemap(true);
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toEqual(['https://wordmet.com/vi', 'https://wordmet.com/en', 'https://wordmet.com/vi/privacy']);
    expect(entries[0]).not.toHaveProperty('lastModified');
    expect(entries[0]?.alternates?.languages).toEqual({ vi: 'https://wordmet.com/vi', en: 'https://wordmet.com/en' });
    expect(entries[2]?.lastModified).toBe('2026-11-10');
    expect(entries[2]?.alternates?.languages).toEqual({ vi: 'https://wordmet.com/vi/privacy', en: 'https://wordmet.com/en/privacy' });
  });

  it('keeps /vi/privacy without a date when the API cannot be read or has no effective date', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    let entries = await (await loadSitemap(true))();
    expect(entries.map((entry) => new URL(entry.url).pathname)).toEqual(['/vi', '/en', '/vi/privacy']);
    expect(entries[2]).not.toHaveProperty('lastModified');

    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ...legal, effective_date: null })));
    entries = await (await loadSitemap(true))();
    expect(entries[2]).not.toHaveProperty('lastModified');
  });

  it('never lists the Terms or the Sources page while they are noindex', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(legal)));
    const paths = (await (await loadSitemap(true))()).map((entry) => new URL(entry.url).pathname);
    expect(paths).not.toContain('/vi/terms');
    expect(paths).not.toContain('/vi/sources');
  });

  it('reads the published text so the build can keep it (a no-store read would render the sitemap per request)', async () => {
    const fetchMock = vi.fn(async () => Response.json(legal));
    vi.stubGlobal('fetch', fetchMock);
    await (await loadSitemap(true))();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/v1\/legal\/current$/);
    expect(init.cache).toBe('force-cache');
  });
});
