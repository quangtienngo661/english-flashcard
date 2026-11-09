import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Bricolage_Grotesque, JetBrains_Mono, Noto_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import '../globals.css';

// Fonts of the new UI (design giao diện mới §5.8), all with Vietnamese glyphs; the variables feed --font-wm-sans/-display/-mono
// (globals.css, @theme inline). Variable fonts, so no weight list; Bricolage keeps only its wght axis (no `axes`: ~41 KB instead of ~131 KB).
// Lexend stays only in the OG image until M8.
const notoSans = Noto_Sans({ subsets: ['latin', 'vietnamese'], display: 'swap', variable: '--font-noto-sans' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin', 'vietnamese'], display: 'swap', variable: '--font-bricolage' });
// Small labels only: not preloaded, so public pages do not fetch it up front.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  preload: false,
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
    <html
      lang={locale}
      className={`${notoSans.variable} ${bricolage.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-wm-sans">
        {/* Locale only: client islands get their copy as props, so no messages are sent to the client. */}
        <NextIntlClientProvider messages={null}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
