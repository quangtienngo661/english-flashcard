import type { MetadataRoute } from 'next';
import { LANDING_LOCALES } from '@/lib/landing-locale';
import { fetchLegal } from '@/lib/legal';
import { site } from '@/lib/site';

const absolute = (path: string) => new URL(path, site.url).toString();

/**
 * Design §11: only indexable pages. The home page lists the locales with a landing (`LANDING_LOCALES`: vi and en). The Privacy Policy joins once the site is indexable, dated by the published text's effective date
 * when the API answers at build; the Terms and the Sources page join only when their `noindex` goes (a launch item, deploy-checklist.md).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const languages = Object.fromEntries(LANDING_LOCALES.map((l) => [l, absolute(`/${l}`)]));
  const pages: MetadataRoute.Sitemap = LANDING_LOCALES.map((locale) => ({
    url: absolute(`/${locale}`),
    changeFrequency: 'monthly',
    priority: 1,
    alternates: { languages },
  }));
  if (!site.indexable) return pages;

  // 'force-cache': read once at build, so the sitemap stays static; no answer only drops the date.
  const effectiveDate = (await fetchLegal('force-cache'))?.effective_date;
  pages.push({
    url: absolute('/vi/privacy'),
    ...(effectiveDate ? { lastModified: effectiveDate } : {}),
    changeFrequency: 'yearly',
    priority: 0.3,
    alternates: { languages: { vi: absolute('/vi/privacy'), en: absolute('/en/privacy') } },
  });
  return pages;
}
