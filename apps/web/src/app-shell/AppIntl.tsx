import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';

/** The app's client screens get the `App` namespace only; the landing's copy stays on the server (design §4.3). */
export async function AppIntl({ children }: { children: ReactNode }) {
  const messages = await getMessages();
  return <NextIntlClientProvider messages={{ App: messages.App }}>{children}</NextIntlClientProvider>;
}
