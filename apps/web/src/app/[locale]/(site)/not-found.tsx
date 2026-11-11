import { getLocale, getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import type { AppLocale } from '@/i18n/routing';
import { SiteFooter } from '@/site/layout/SiteFooter';

// Outside the (pages) group, so no header (Figma 16:317); it brings its own `main` and footer. The card and its motion come in M8.7.
export default async function NotFound() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('NotFound');
  return (
    <>
      <main id="main" tabIndex={-1}>
        <Container className="flex flex-col items-start gap-4 py-24">
          <h1 className="text-h2 font-extrabold text-ink">{t('title')}</h1>
          <p className="max-w-prose text-subtitle text-muted">{t('body')}</p>
          <ButtonLink href="/">{t('home')}</ButtonLink>
        </Container>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
