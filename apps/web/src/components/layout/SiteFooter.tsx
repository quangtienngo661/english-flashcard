import { getLocale, getTranslations } from 'next-intl/server';
import { routing, type AppLocale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Link } from '@/i18n/navigation';
import { site } from '@/lib/site';

export async function SiteFooter() {
  const locale = (await getLocale()) as AppLocale;
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  const t = await getTranslations('Footer');
  const item = 'inline-flex min-h-11 items-center text-small font-medium text-muted';
  const link = `${item} transition-colors duration-fast hover:text-ink`;

  return (
    <footer className="border-t border-border bg-bg">
      <Container className="flex flex-col gap-4 py-6 md:flex-row-reverse md:items-center md:justify-between md:py-9">
        <ul className="grid grid-cols-2 gap-x-3 md:flex md:gap-6">
          <li>
            <span role="link" aria-disabled="true" className={item}>
              {t('privacy')}
            </span>
          </li>
          <li>
            <Link href="/terms" className={link}>
              {t('terms')}
            </Link>
          </li>
          <li>
            <a href={`mailto:${site.contactEmail}`} className={link}>
              {t('contact')}
            </a>
          </li>
          <li>
            <a href={`/${other}`} hrefLang={other} lang={other} className={link}>
              {t('switchLanguage')}
            </a>
          </li>
        </ul>
        <p className="text-small text-muted">{t('copyright', { year: new Date().getFullYear() })}</p>
      </Container>
    </footer>
  );
}
