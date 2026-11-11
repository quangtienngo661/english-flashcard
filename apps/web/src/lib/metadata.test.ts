import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../messages/en.json';
import vi_ from '../../messages/vi.json';

// The OG image alt is the message the image route reads (`Metadata.ogAlt`, [locale]/opengraph-image.tsx).
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale, namespace }: { locale: 'vi' | 'en'; namespace: 'Metadata' }) => (key: 'ogAlt') =>
    ({ vi: vi_, en })[locale][namespace][key],
}));

// Design §11, M8.8: each public page declares its own canonical, hreflang and OG url, because a page's `alternates` and `openGraph` replace
// the root layout's whole objects. `site.indexable` is read when `lib/site` loads, so each case reloads the modules.
async function load(indexable: boolean) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_INDEXABLE', indexable ? 'true' : '');
  return import('./metadata');
}

afterEach(() => vi.unstubAllEnvs());

const PRIVACY = { path: '/privacy', title: 'Chính sách bảo mật', description: 'Dữ liệu Wordmet thu thập.' };

/**
 * M1 of the M8b review: a page's `openGraph` and `twitter` replace the layout's, and the image file sits in `[locale]`, so each page names
 * it again. The URL Next builds for it (next-metadata-image-loader, generateImageMetadata id `default`), without the content hash query.
 */
const ogImage = (locale: 'vi' | 'en') => [
  { url: `/${locale}/opengraph-image/default`, width: 1200, height: 630, alt: { vi: vi_, en }[locale].Metadata.ogAlt, type: 'image/png' },
];

describe('pageMetadata', () => {
  it('gives the page its canonical, hreflang vi and en, its OG url and Twitter text', async () => {
    const { pageMetadata } = await load(true);
    expect(await pageMetadata('vi', { ...PRIVACY, index: true })).toEqual({
      title: 'Chính sách bảo mật',
      description: 'Dữ liệu Wordmet thu thập.',
      alternates: { canonical: '/vi/privacy', languages: { vi: '/vi/privacy', en: '/en/privacy' } },
      openGraph: {
        type: 'website',
        siteName: 'Wordmet',
        url: '/vi/privacy',
        title: 'Chính sách bảo mật',
        description: 'Dữ liệu Wordmet thu thập.',
        locale: 'vi_VN',
        images: ogImage('vi'),
      },
      twitter: { card: 'summary_large_image', title: 'Chính sách bảo mật', description: 'Dữ liệu Wordmet thu thập.', images: ogImage('vi') },
      robots: { index: true, follow: true },
    });
  });

  it('the English page points its canonical and OG url at /en and keeps both hreflang entries', async () => {
    const { pageMetadata } = await load(true);
    const meta = await pageMetadata('en', { ...PRIVACY, index: true });
    expect(meta.alternates).toEqual({ canonical: '/en/privacy', languages: { vi: '/vi/privacy', en: '/en/privacy' } });
    expect(meta.openGraph).toMatchObject({ url: '/en/privacy', locale: 'en_US', images: ogImage('en') });
    expect(meta.twitter).toMatchObject({ images: ogImage('en') });
  });

  it.each([
    [true, false],
    [false, true],
    [false, false],
  ])('indexable site %s, page index %s: noindex', async (indexable, index) => {
    const { pageMetadata } = await load(indexable);
    expect((await pageMetadata('vi', { ...PRIVACY, index })).robots).toEqual({ index: false, follow: false });
  });
});

describe('authMetadata (sign-in pages: title and description, no canonical to the home page)', () => {
  it('sets the title, description, OG and Twitter text, and drops the home canonical and hreflang', async () => {
    const { authMetadata } = await load(true);
    expect(await authMetadata('vi', { title: 'Đăng nhập', description: 'd' })).toEqual({
      title: 'Đăng nhập',
      description: 'd',
      alternates: {},
      openGraph: { type: 'website', siteName: 'Wordmet', title: 'Đăng nhập', description: 'd', locale: 'vi_VN', images: ogImage('vi') },
      twitter: { card: 'summary_large_image', title: 'Đăng nhập', description: 'd', images: ogImage('vi') },
    });
  });
});
