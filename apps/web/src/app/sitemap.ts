import type { MetadataRoute } from 'next';
import { LANDING_LOCALES } from '@/lib/landing-locale';
import { site } from '@/lib/site';

// Only locales with a landing are listed (design landing-redesign L4): /en redirects to /vi until the English copy exists.
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LANDING_LOCALES.map((l) => [l, new URL(`/${l}`, site.url).toString()]));
  const pages: MetadataRoute.Sitemap = LANDING_LOCALES.map((locale) => ({
    url: new URL(`/${locale}`, site.url).toString(),
    changeFrequency: 'monthly',
    priority: 1,
    alternates: { languages },
  }));
  // Privacy page left out while legal links are hidden until launch (09/10/2026).
  return pages;
}
