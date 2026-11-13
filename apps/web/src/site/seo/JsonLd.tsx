import type { AppLocale } from '@/i18n/routing';
import type { Prices } from '@/lib/period-offer';
import { site } from '@/lib/site';

const PRO_OFFERS = [
  ['1', 'Pro 1 tháng'],
  ['3', 'Pro 3 tháng'],
  ['12', 'Pro 12 tháng'],
] as const;

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
        { '@type': 'Offer', name: 'Miễn phí', price: 0, priceCurrency: 'VND' },
        ...PRO_OFFERS.map(([months, name]) => ({ '@type': 'Offer', name, price: prices[months], priceCurrency: 'VND' })),
      ],
    },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Wordmet', url: site.url, logo: `${site.url}/icon.svg` },
  ];
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
  );
}
