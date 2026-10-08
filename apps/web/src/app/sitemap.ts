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
  const privacyLanguages = Object.fromEntries(routing.locales.map((l) => [l, new URL(`/${l}/privacy`, site.url).toString()]));
  const privacyPages: MetadataRoute.Sitemap = routing.locales.map((locale) => ({
    url: new URL(`/${locale}/privacy`, site.url).toString(),
    changeFrequency: 'yearly',
    priority: 0.3,
    alternates: { languages: privacyLanguages },
  }));
  return [...pages, ...privacyPages];
}
