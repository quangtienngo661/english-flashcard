'use client';

import { hasLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { routing, type AppLocale } from '@/i18n/routing';

/**
 * The locale of the URL (`/vi/app…`, `/en/app…`). Inside a session `useLocale()` is `en` (SessionIntl, QM9-9), so links, the
 * Vietnamese-only blocks and anything that must follow the learner's language read this instead.
 */
export function useRouteLocale(): AppLocale {
  const locale = useParams<{ locale?: string }>()?.locale;
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}
