import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Lexend } from 'next/font/google';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
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

// Matches the `primary` colour token (the header field).
export const viewport: Viewport = { themeColor: '#2445d6' };

export default async function LocaleLayout({ children, params }: LocaleParams & { children: ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Root layout: html, body, font and locale only. The landing chrome lives in (site)/layout.tsx, the learner app in app/layout.app.tsx.
  return (
    <html lang={locale} className={lexend.variable}>
      <body className="min-h-dvh font-sans">
        {/* Locale only: client islands get their copy as props, so no messages are sent to the client. */}
        <NextIntlClientProvider messages={null}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
