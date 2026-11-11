import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { ThemeProvider } from '@/app-shell/theme/ThemeProvider';
import type { AppLocale } from '@/i18n/routing';
import { landingData } from '@/site/landing/landing-data';
import { SITE_HEAD_SCRIPT } from '@/site/layout/site-head-script';
import { SkipLink } from '@/site/layout/SkipLink';
import { JsonLd } from '@/site/seo/JsonLd';

// What every public page shares, the 404 included: theme, JSON-LD, the skip link. The header, `main` and the footer are in (pages)/layout.tsx,
// so the 404 (not-found.tsx, here) renders without the header (Figma 16:317); the learner app under /app has its own layout.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('Nav');
  const meta = await getTranslations('Metadata');

  return (
    <>
      {/* Sets data-theme on <html> before the page paints, like the learner app (design landing-redesign §5), and the `js` class the site
          motion CSS waits for (M8.6): without it every element stays at its end state. */}
      <script dangerouslySetInnerHTML={{ __html: SITE_HEAD_SCRIPT }} />
      <ThemeProvider>
        {/* Prices from the build (M8.3), so the force-dynamic legal pages do not read them per request either. */}
        <JsonLd locale={locale} description={meta('description')} prices={landingData().prices} />
        <SkipLink label={t('skipToContent')} />
        {/* Figma's ground is `--bg` (the body keeps the old `--color-surface` the app uses, R244). `isolate`, so the sections' halos at
            z-index −10 paint above this background and not under it. */}
        <div className="isolate min-h-dvh bg-wm-bg">{children}</div>
      </ThemeProvider>
    </>
  );
}
