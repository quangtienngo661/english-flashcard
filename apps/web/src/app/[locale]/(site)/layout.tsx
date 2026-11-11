import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { ThemeProvider } from '@/app-shell/theme/ThemeProvider';
import { THEME_SCRIPT } from '@/app-shell/theme/theme-script';
import { JsonLd } from '@/components/seo/JsonLd';
import type { AppLocale } from '@/i18n/routing';
import { SkipLink } from '@/site/layout/SkipLink';

// What every public page shares, the 404 included: theme, JSON-LD, the skip link. The header, `main` and the footer are in (pages)/layout.tsx,
// so the 404 (not-found.tsx, here) renders without the header (Figma 16:317); the learner app under /app has its own layout.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('Nav');
  const meta = await getTranslations('Metadata');

  return (
    <>
      {/* Sets data-theme on <html> before the page paints, like the learner app (design landing-redesign §5). */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ThemeProvider>
        <JsonLd locale={locale} description={meta('description')} />
        <SkipLink label={t('skipToContent')} />
        {children}
      </ThemeProvider>
    </>
  );
}
