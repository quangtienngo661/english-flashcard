import { getLocale, getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';

export async function SiteHeader() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('Nav');
  const navLink = 'inline-flex min-h-11 items-center text-small font-medium text-muted transition-colors duration-fast hover:text-ink';

  return (
    <header className="border-b border-border bg-bg">
      <Container className="flex items-center justify-between gap-4 py-2 md:py-5">
        <div className="flex flex-1">
          <Logo />
        </div>
        <nav aria-label="Wordmet" className="hidden items-center gap-5 md:flex">
          <Link href="/#how-it-works" className={navLink}>
            {t('howItWorks')}
          </Link>
          <Link href="/#faq" className={navLink}>
            {t('faq')}
          </Link>
        </nav>
        <div className="flex flex-1 justify-end">
          <LanguageSwitch current={locale} label={t('languageLabel')} />
        </div>
      </Container>
    </header>
  );
}
