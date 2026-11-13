import type { ReactNode } from 'react';
import { getLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { SiteFooter } from '@/site/layout/SiteFooter';
import { SiteHeader } from '@/site/layout/SiteHeader';

// The home page and the legal and sources pages: header, `main` and footer. The route group leaves the URLs as they were.
export default async function PagesLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as AppLocale;
  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
