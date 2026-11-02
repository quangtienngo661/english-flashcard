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
