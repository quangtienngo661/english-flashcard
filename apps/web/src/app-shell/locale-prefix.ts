import type { AppLocale } from '@/i18n/routing';

const APP_PATH = /^\/(vi|en)\/app(?=[/?#]|$)(.*)$/;

/** E1: where to go after sign-in. Only an app path, moved to this locale; anything else is the app home. */
export function safeNext(raw: string | null, locale: AppLocale): string {
  const match = raw ? APP_PATH.exec(raw) : null;
  return match ? `/${locale}/app${match[2]}` : `/${locale}/app`;
}

/** E10: the app follows the profile's language. Returns the corrected path (sub-path and query kept), or null. */
export function prefixFix(path: string, profileLanguage: 'vi' | 'en' | null): string | null {
  const match = APP_PATH.exec(path);
  if (!match || profileLanguage === null || match[1] === profileLanguage) return null;
  return `/${profileLanguage}/app${match[2]}`;
}
