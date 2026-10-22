'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { ApiError, NetworkError } from './api/problem';
import { SessionProvider } from './session/session-context';
import type { SessionStore } from './session/session-store';
import { ThemeProvider } from './theme/ThemeProvider';

type OfflineValue = { offline: boolean; retry: () => void };
const OfflineContext = createContext<OfflineValue>({ offline: false, retry: () => {} });
export const useOffline = () => useContext(OfflineContext);

/**
 * Everything the app's client screens share (design §4.2): one QueryClient (no automatic retries; a NetworkError raises the
 * offline band, the next good answer lowers it, as admin), the session, the theme. E9: any query or mutation answered 403
 * `profile-incomplete` sends the learner to choose a language, then back.
 */
export function AppProviders({ children, store }: { children: ReactNode; store?: SessionStore }) {
  const router = useRouter();
  const locale = useLocale();
  const [offline, setOffline] = useState(false);
  const [client] = useState(() => {
    const onError = (error: Error) => {
      if (error instanceof NetworkError) setOffline(true);
      if (error instanceof ApiError && error.problem.slug === 'profile-incomplete') {
        const here = `${window.location.pathname}${window.location.search}`;
        router.replace(`/${locale}/app/welcome?next=${encodeURIComponent(here)}`);
      }
    };
    return new QueryClient({
      defaultOptions: { queries: { retry: false } },
      queryCache: new QueryCache({ onError, onSuccess: () => setOffline(false) }),
      mutationCache: new MutationCache({ onError }),
    });
  });
  const retry = () => void client.refetchQueries({ type: 'active' });

  return (
    <QueryClientProvider client={client}>
      <SessionProvider store={store}>
        <ThemeProvider>
          <OfflineContext.Provider value={{ offline, retry }}>
            {offline ? <OfflineBand onRetry={retry} /> : null}
            {children}
          </OfflineContext.Provider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function OfflineBand({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('App');
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-3 bg-danger-soft px-4 py-2 text-ui text-ink">
      <span>{t('offline.message')}</span>
      <button type="button" onClick={onRetry} className="font-semibold text-primary underline underline-offset-2">
        {t('common.retry')}
      </button>
    </div>
  );
}
