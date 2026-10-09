import type { AppLocale } from '@/i18n/routing';
import { site } from '@/lib/site';

// Server-rendered JSON-LD; `<` is escaped so the payload cannot close the script tag (Next.js JSON-LD guide).
export function JsonLd({ locale, description }: { locale: AppLocale; description: string }) {
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
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ];
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
  );
}
