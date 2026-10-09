import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, new URL(`/${l}`, site.url).toString()]));
  const pages: MetadataRoute.Sitemap = routing.locales.map((locale) => ({
    url: new URL(`/${locale}`, site.url).toString(),
    changeFrequency: 'monthly',
    priority: 1,
    alternates: { languages },
  }));
  // Privacy page left out while legal links are hidden until launch (09/10/2026).
  return pages;
}
