import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, new URL(`/${l}`, site.url).toString()]));
  return routing.locales.map((locale) => ({
    url: new URL(`/${locale}`, site.url).toString(),
    changeFrequency: 'monthly',
    priority: 1,
    alternates: { languages },
  }));
}
