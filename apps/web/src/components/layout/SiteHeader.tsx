import { getLocale, getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';
import { buttonBase, buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';

// UB16: sticky with a waitlist button from md; below md it scrolls away with no button, as before.
export async function SiteHeader() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('Nav');
  const navLink =
    'inline-flex min-h-11 items-center whitespace-nowrap text-small font-medium text-on-primary-muted transition-colors duration-fast hover:text-on-primary';

  return (
    <header className="bg-primary md:sticky md:top-0 md:z-40">
      <Container className="flex items-center justify-between gap-4 py-2 md:min-h-header">
        <div className="flex flex-1">
          <Logo tone="onPrimary" />
        </div>
        {/* From lg only: at 768 the two links do not fit beside the language switch and the button. */}
        <nav aria-label="Wordmet" className="hidden items-center gap-5 lg:flex">
          <Link href="/#how-it-works" className={navLink}>
            {t('howItWorks')}
          </Link>
          <Link href="/#faq" className={navLink}>
            {t('faq')}
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end gap-3">
          <LanguageSwitch current={locale} label={t('languageLabel')} />
          <Link href="/#waitlist-hero" className={cn(buttonBase, buttonVariants.accent, 'hidden whitespace-nowrap px-4 text-small md:inline-flex')}>
            {t('cta')}
          </Link>
        </div>
      </Container>
    </header>
  );
}
