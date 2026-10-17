import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { IntlProvider } from 'use-intl';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { readLocale, writeLocale, type Locale } from './locale';

const MESSAGES = { vi, en };

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({ locale: 'vi', setLocale: () => {} });
export const useLocaleSwitch = () => useContext(LocaleContext);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);
  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        writeLocale(next);
        setLocaleState(next);
      },
    }),
    [locale],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider locale={locale} messages={MESSAGES[locale]} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
