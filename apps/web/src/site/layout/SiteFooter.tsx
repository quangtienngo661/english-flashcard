import { useTranslations } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';
import { site } from '@/lib/site';
import { AppLogo } from '@/ui/Logo';
import { Container } from './Container';
import { FooterMotionSwitch } from './FooterMotionSwitch';
import { FooterThemeSwitch } from './FooterThemeSwitch';

/**
 * Figma "Chân trang" (`7:209` desktop, `9:100` phone): logo, the three legal pages and the contact address, then the year. Desktop is one
 * row; a phone puts the logo above one wrapping row and adds the theme switch under it (owner QM8-1b′). Links are plain text, as drawn.
 * The motion switch (T10, QA7) shows at every width, after the theme switch on a phone and at the end of the row from md.
 */
export function SiteFooter({ locale }: { locale: AppLocale }) {
  const t = useTranslations('Footer');
  const nav = useTranslations('Nav');
  const link =
    'inline-flex min-h-11 items-center rounded-wm-control font-wm-sans text-wm-small text-wm-muted outline-none transition-colors duration-200 hover:text-wm-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent';
  return (
    <footer>
      <Container className="flex flex-col gap-4 pt-8 pb-10 md:flex-row md:items-center md:justify-between md:gap-6 md:pt-10 md:pb-12">
        {/* A link home, also because AppLogo's aria-label is not allowed on a bare span (axe aria-prohibited-attr). */}
        <a
          href={`/${locale}`}
          className="inline-flex min-h-11 items-center self-start rounded-wm-control outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent md:self-auto"
        >
          <AppLogo />
        </a>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:contents">
          <ul role="list" className="contents md:flex md:items-center md:gap-6">
            <li>
              <a href={`/${locale}/privacy`} className={link}>
                {t('privacy')}
              </a>
            </li>
            <li>
              <a href={`/${locale}/terms`} className={link}>
                {t('terms')}
              </a>
            </li>
            <li>
              <a href={`/${locale}/sources`} className={link}>
                {t('sources')}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.contactEmail}`} className={link}>
                {t('contact')}
              </a>
            </li>
          </ul>
          <p className="font-wm-sans text-wm-small text-wm-muted">{t('copyright', { year: new Date().getFullYear() })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="md:hidden">
            <FooterThemeSwitch label={nav('theme')} light={nav('light')} dark={nav('dark')} />
          </div>
          <FooterMotionSwitch label={nav('motion')} on={nav('motionOn')} off={nav('motionOff')} deviceNote={nav('motionDevice')} />
        </div>
      </Container>
    </footer>
  );
}
