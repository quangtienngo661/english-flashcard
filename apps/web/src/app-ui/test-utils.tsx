import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { SessionProvider } from '@/app-shell/session/session-context';
import { SessionStore, type Me } from '@/app-shell/session/session-store';
import { BASE, makeFetch, makeMe, tokenResponse, type Route } from '@/app-shell/session/test-support';

/** Renders app UI with the App copy, a QueryClient and a signed-in session whose API answers `routes`. */
export function renderApp(
  ui: ReactElement,
  { locale = 'vi', me = makeMe(), routes = {} }: { locale?: 'vi' | 'en'; me?: Me; routes?: Record<string, Route> } = {},
) {
  const f = makeFetch({
    'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
    'GET /v1/me': () => Response.json(me),
    ...routes,
  });
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const messages = { App: (locale === 'vi' ? vi : en).App };
  const view = render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <QueryClientProvider client={client}>
        <SessionProvider store={store}>{ui}</SessionProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return { ...view, store, client, ...f };
}
