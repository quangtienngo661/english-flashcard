import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Lexend } from 'next/font/google';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SkipLink } from '@/components/layout/SkipLink';
import { JsonLd } from '@/components/seo/JsonLd';
import { routing, type AppLocale } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import '../globals.css';

// Variable font (wght 100–900), so no weight list; --font-lexend feeds the shared --font-sans token.
const lexend = Lexend({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-lexend',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return buildMetadata(locale, { title: t('title'), description: t('description') });
}

// Matches the `bg` colour token.
export const viewport: Viewport = { themeColor: '#faf8f5' };

export default async function LocaleLayout({ children, params }: LocaleParams & { children: ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const meta = await getTranslations({ locale, namespace: 'Metadata' });

  return (
    <html lang={locale} className={lexend.variable}>
      <body className="min-h-dvh font-sans">
        <JsonLd locale={locale as AppLocale} description={meta('description')} />
        {/* Locale only: client islands get their copy as props, so no messages are sent to the client. */}
        <NextIntlClientProvider messages={null}>
          <SkipLink label={t('skipToContent')} />
          <SiteHeader />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
