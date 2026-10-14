export type Locale = 'vi' | 'en';

const KEY = 'wordmet-admin.locale';

/** Stored choice, else the browser language (`vi*` → vi, anything else → en). Storage errors are ignored. */
export function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'vi' || stored === 'en') return stored;
  } catch {
    // blocked storage: fall through to the browser language
  }
  return navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function writeLocale(locale: Locale): void {
  try {
    localStorage.setItem(KEY, locale);
  } catch {
    // the choice then lasts until the next reload only
  }
}
