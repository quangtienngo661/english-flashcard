'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Logo } from './Logo';

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hello@wordmet.com';
const LINK = 'text-caption text-muted hover:text-ink hover:underline underline-offset-2';

/**
 * D7, design §6 (Figma footer `443:6928`): three columns. Pages that exist are links; Trợ giúp, Câu hỏi thường gặp and Gửi góp ý
 * show as muted text that is not a link and takes no focus. No language switch in the app (it lives in Settings).
 */
export function AppFooter() {
  const t = useTranslations('App.chrome.footer');
  const locale = useLocale();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-360 flex-col gap-8 px-4 py-10 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="flex max-w-xs flex-col gap-2">
            <Logo tone="surface" />
            <p className="text-caption text-muted">{t('tagline')}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:gap-16">
            <Column title={t('colWordmet')}>
              <Link href={`/${locale}`} className={LINK}>
                {t('about')}
              </Link>
              <Link href={`/${locale}/app/plans`} className={LINK}>
                {t('plans')}
              </Link>
              <a href={`mailto:${contactEmail}`} className={LINK}>
                {t('contact')}
              </a>
            </Column>
            <Column title={t('colSupport')}>
              {(['help', 'faq', 'feedback'] as const).map((key) => (
                <span key={key} aria-disabled="true" className="text-caption text-placeholder">
                  {t(key)}
                </span>
              ))}
            </Column>
            <Column title={t('colLegal')}>
              <Link href={`/${locale}/terms`} className={LINK}>
                {t('terms')}
              </Link>
              <Link href={`/${locale}/privacy`} className={LINK}>
                {t('privacy')}
              </Link>
            </Column>
          </div>
        </div>
        <p className="border-t border-border pt-4 text-caption text-muted">{t('copyright', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption font-semibold text-ink">{title}</p>
      {children}
    </div>
  );
}
