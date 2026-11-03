import type { AppLocale } from '@/i18n/routing';

// Design landing-redesign L4: only Vietnamese has a landing until the English copy is written. Add 'en' here and the
// redirect, hreflang and sitemap follow.
export const LANDING_LOCALES: readonly AppLocale[] = ['vi'];

// The English home goes to the Vietnamese one. Only the home: /en/app, /en/privacy and /en/terms keep working (D2).
export function landingLocaleRedirect(pathname: string): string | null {
  const home = /^\/(en)\/?$/.exec(pathname);
  return home && !LANDING_LOCALES.includes('en') ? '/vi' : null;
}
