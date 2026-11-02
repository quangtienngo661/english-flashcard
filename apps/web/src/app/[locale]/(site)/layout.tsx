import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { ThemeProvider } from '@/app-shell/theme/ThemeProvider';
import { THEME_SCRIPT } from '@/app-shell/theme/theme-script';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SkipLink } from '@/components/layout/SkipLink';
import { getLandingCopy } from '@/components/landing/copy';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { JsonLd } from '@/components/seo/JsonLd';
import type { AppLocale } from '@/i18n/routing';

// Landing chrome (header, footer, JSON-LD); the learner app under /app has its own layout.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('Nav');
  const meta = await getTranslations('Metadata');
  const copy = await getLandingCopy();
  const footer = await getTranslations('Footer');

  return (
    <>
      {/* Sets data-theme on <html> before the landing paints, like the learner app (design landing-redesign §5). */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ThemeProvider>
        <JsonLd locale={locale} description={meta('description')} />
        <SkipLink label={t('skipToContent')} />
        <LandingHeader copy={copy.nav} locale={locale} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter copy={{ ...copy.footer, contact: footer('contact'), copyright: footer('copyright', { year: new Date().getFullYear() }) }} />
      </ThemeProvider>
    </>
  );
}
