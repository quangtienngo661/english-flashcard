import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SkipLink } from '@/components/layout/SkipLink';
import { JsonLd } from '@/components/seo/JsonLd';
import type { AppLocale } from '@/i18n/routing';

// Landing chrome (header, footer, JSON-LD); the learner app under /app has its own layout.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('Nav');
  const meta = await getTranslations('Metadata');

  return (
    <>
      <JsonLd locale={locale} description={meta('description')} />
      <SkipLink label={t('skipToContent')} />
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
