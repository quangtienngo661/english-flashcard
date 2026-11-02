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

// Matches the `navy` token (the top bar) in the light theme and `navy-card` in the dark one.
export const viewport: Viewport = { themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#121833' }, { color: '#1b2444' }] };

export default async function LocaleLayout({ children, params }: LocaleParams & { children: ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Root layout: html, body, font and locale only. The landing chrome lives in (site)/layout.tsx, the learner app in app/layout.app.tsx.
  return (
    // The learner app's theme script sets data-theme on <html> before React hydrates (design §4.4).
    <html lang={locale} className={lexend.variable} suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        {/* Locale only: client islands get their copy as props, so no messages are sent to the client. */}
        <NextIntlClientProvider messages={null}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
