import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { LANDING_LOCALES } from './landing-locale';
import { site } from './site';

const OG_LOCALE = { vi: 'vi_VN', en: 'en_US' } satisfies Record<AppLocale, string>;

// Spec §7: canonical per locale, hreflang, OG/Twitter, robots from NEXT_PUBLIC_INDEXABLE. hreflang lists only the locales
// that have a landing (design landing-redesign L4).
export function buildMetadata(locale: AppLocale, copy: { title: string; description: string }): Metadata {
  return {
    metadataBase: new URL(site.url),
    title: { default: copy.title, template: '%s · Wordmet' },
    description: copy.description,
    applicationName: 'Wordmet',
    alternates: {
      canonical: `/${locale}`,
      languages: { ...Object.fromEntries(LANDING_LOCALES.map((l) => [l, `/${l}`])), 'x-default': '/' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Wordmet',
      url: `/${locale}`,
      title: copy.title,
      description: copy.description,
      locale: OG_LOCALE[locale],
    },
    twitter: { card: 'summary_large_image', title: copy.title, description: copy.description },
    robots: site.indexable ? { index: true, follow: true } : { index: false, follow: false },
    formatDetection: { telephone: false },
  };
}

const SITE_NAME = 'Wordmet';

/**
 * The `[locale]/opengraph-image.tsx` image, named again by every page that sets its own `openGraph` / `twitter`: Next adds the file's
 * image only at the segment that holds it, and a child's object replaces the parent's whole (M1 of the M8b review). The URL is the one
 * Next 16.4.3 builds (next-metadata-image-loader: segment, file name, `generateImageMetadata` id `default`), without its content hash
 * query; the size is that file's `size`, and the alt its `Metadata.ogAlt`. e2e seo.spec.ts checks it against what /vi carries.
 */
async function ogImages(locale: AppLocale) {
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return [{ url: `/${locale}/opengraph-image/default`, width: 1200, height: 630, alt: t('ogAlt'), type: 'image/png' }];
}

/**
 * Design §11, M8.8: one public page's metadata. A page's `alternates`, `openGraph` and `twitter` replace the root layout's whole objects
 * (Next merges metadata per top-level key), so each page declares its own canonical, hreflang (`/vi` and `/en` both serve the legal and
 * sources pages, D2) and OG url. Indexed only when the page asks for it and the site is indexable.
 */
export async function pageMetadata(
  locale: AppLocale,
  { path, title, description, index }: { path: string; title: string; description: string; index: boolean },
): Promise<Metadata> {
  const url = `/${locale}${path}`;
  const images = await ogImages(locale);
  return {
    title,
    description,
    alternates: { canonical: url, languages: { vi: `/vi${path}`, en: `/en${path}` } },
    openGraph: { type: 'website', siteName: SITE_NAME, url, title, description, locale: OG_LOCALE[locale], images },
    twitter: { card: 'summary_large_image', title, description, images },
    robots: index && site.indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

/**
 * Sign-in pages (design §11): their own title and description so a shared link reads right. No canonical or hreflang (they would point
 * at the home page, the root layout's), no OG url; `robots: noindex` comes from the learner app's layout.
 */
export async function authMetadata(
  locale: AppLocale,
  { title, description }: { title: string; description: string },
): Promise<Metadata> {
  const images = await ogImages(locale);
  return {
    title,
    description,
    alternates: {},
    openGraph: { type: 'website', siteName: SITE_NAME, title, description, locale: OG_LOCALE[locale], images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}
