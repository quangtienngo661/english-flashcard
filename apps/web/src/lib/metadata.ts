import type { Metadata } from 'next';
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
 * Design §11, M8.8: one public page's metadata. A page's `alternates`, `openGraph` and `twitter` replace the root layout's whole objects
 * (Next merges metadata per top-level key), so each page declares its own canonical, hreflang (`/vi` and `/en` both serve the legal and
 * sources pages, D2) and OG url. Indexed only when the page asks for it and the site is indexable.
 */
export function pageMetadata(
  locale: AppLocale,
  { path, title, description, index }: { path: string; title: string; description: string; index: boolean },
): Metadata {
  const url = `/${locale}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: { vi: `/vi${path}`, en: `/en${path}` } },
    openGraph: { type: 'website', siteName: SITE_NAME, url, title, description, locale: OG_LOCALE[locale] },
    twitter: { card: 'summary_large_image', title, description },
    robots: index && site.indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

/**
 * Sign-in pages (design §11): their own title and description so a shared link reads right. No canonical or hreflang (they would point
 * at the home page, the root layout's), no OG url; `robots: noindex` comes from the learner app's layout.
 */
export function authMetadata(locale: AppLocale, { title, description }: { title: string; description: string }): Metadata {
  return {
    title,
    description,
    alternates: {},
    openGraph: { type: 'website', siteName: SITE_NAME, title, description, locale: OG_LOCALE[locale] },
    twitter: { card: 'summary_large_image', title, description },
  };
}
