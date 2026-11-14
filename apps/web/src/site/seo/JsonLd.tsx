import type { AppLocale } from '@/i18n/routing';
import type { Prices } from '@/lib/period-offer';
import { site } from '@/lib/site';

const MONTHS = ['1', '3', '12'] as const;

const OFFER_NAMES: Record<AppLocale, { free: string; pro: (months: (typeof MONTHS)[number]) => string }> = {
  vi: { free: 'Miễn phí', pro: (months) => `Pro ${months} tháng` },
  en: { free: 'Free', pro: (months) => `Pro ${months} ${months === '1' ? 'month' : 'months'}` },
};

/**
 * Server-rendered JSON-LD (design §11, M8.8); `<` is escaped so the payload cannot close the script tag (Next.js JSON-LD guide). `prices`
 * are the ones `next build` read (`landingData()`), the same numbers as the pricing section, never a read per request. Valid markup is the
 * goal, not a rich result: Google's SoftwareApplication result needs a rating or review, which Wordmet does not have.
 */
export function JsonLd({ locale, description, prices }: { locale: AppLocale; description: string; prices: Prices }) {
  const url = new URL(`/${locale}`, site.url).toString();
  const data = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Wordmet', url, inLanguage: locale },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Wordmet',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      description,
      url,
      offers: [
        { '@type': 'Offer', name: OFFER_NAMES[locale].free, price: 0, priceCurrency: 'VND' },
        ...MONTHS.map((months) => ({ '@type': 'Offer', name: OFFER_NAMES[locale].pro(months), price: prices[months], priceCurrency: 'VND' })),
      ],
    },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Wordmet', url: site.url, logo: `${site.url}/icon.svg` },
  ];
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
  );
}
