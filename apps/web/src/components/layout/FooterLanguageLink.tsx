'use client';

import { Link, usePathname } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

export function FooterLanguageLink({ locale, label, className }: { locale: AppLocale; label: string; className: string }) {
  const pathname = usePathname();
  return (
    <Link href={pathname} locale={locale} lang={locale} hrefLang={locale} className={className}>
      {label}
    </Link>
  );
}
