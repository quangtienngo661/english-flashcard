import { useTranslations } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';
import { ButtonLink } from '@/ui/ButtonLink';
import { AppLogo } from '@/ui/Logo';
import { Container } from './Container';
import { ThemeToggleButton } from './ThemeToggle';

/**
 * Figma "Thanh trên" (`5:2` desktop, `9:93` phone): sticky, `--bg` at 72 % over a background blur, no bottom shadow; 68 px high, 60 on a
 * phone. Owner QM8-1: Đăng nhập (white) and Đăng ký (navy) instead of Figma's "Dùng thử"; the theme switch sits here from `md` up and in
 * the footer below it. The page links always name the home page (`/vi#gia`): from a legal page they open it, on it they only scroll.
 */
export function SiteHeader({ locale }: { locale: AppLocale }) {
  const t = useTranslations('Nav');
  const home = `/${locale}`;
  const anchor =
    'inline-flex min-h-11 items-center rounded-wm-sm font-wm-sans text-wm-button font-normal text-wm-muted outline-none transition-colors duration-200 hover:text-wm-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent';
  return (
    <header className="sticky top-0 z-40 bg-wm-bg/72 backdrop-blur-wm-sm">
      <Container className="flex h-15 items-center gap-2 md:h-17 md:gap-6">
        <a
          href={home}
          className="mr-auto shrink-0 rounded-wm-sm outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent"
        >
          <AppLogo />
        </a>
        <nav className="hidden items-center gap-5.5 md:flex">
          <a href={`${home}#nhom-tu`} className={anchor}>
            {t('groups')}
          </a>
          <a href={`${home}#cach-hoc`} className={anchor}>
            {t('howTo')}
          </a>
          <a href={`${home}#gia`} className={anchor}>
            {t('pricing')}
          </a>
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:block">
            <ThemeToggleButton toLight={t('themeToLight')} toDark={t('themeToDark')} />
          </div>
          <ButtonLink reload variant="secondary" href={`${home}/app/login`} className="px-3 md:px-5">
            {t('login')}
          </ButtonLink>
          <ButtonLink reload variant="primary" href={`${home}/app/register`} className="px-3 md:px-5">
            {t('signup')}
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}
