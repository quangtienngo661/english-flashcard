import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import en from '../../messages/en.json';

/**
 * Học, Phiên luyện and Ôn speak English in every locale (QM9-9): their copy and plural rules come from `en` ("1 card left"). The data
 * (meanings, translations, group names) is not copy and stays as the API sends it; links and the Vietnamese-only blocks follow the
 * route through `useRouteLocale()`. `vi.json` keeps the session keys for parity; they are not rendered under this provider.
 */
export function SessionIntl({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={{ App: en.App }}>
      {children}
    </NextIntlClientProvider>
  );
}
