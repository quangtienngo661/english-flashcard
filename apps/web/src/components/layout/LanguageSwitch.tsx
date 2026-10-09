'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { routing, type AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';

// Client component: needs usePathname so switching keeps the current page (spec §4.3).
export function LanguageSwitch({ current, label }: { current: AppLocale; label: string }) {
  const pathname = usePathname();
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
      {routing.locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            lang={locale}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'inline-flex min-h-8 min-w-11 items-center justify-center rounded-full px-2.5 text-caption font-bold uppercase transition-colors duration-fast',
              active ? 'bg-ink text-on-primary' : 'text-muted hover:text-ink',
            )}
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
