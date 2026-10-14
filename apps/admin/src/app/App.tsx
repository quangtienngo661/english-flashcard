import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { BrowserRouter } from 'react-router';
import { SessionProvider } from '../auth/session-context';
import { LocaleProvider } from '../i18n/locale-context';
import { createQueryClient, OfflineContext } from './offline';
import { AppRoutes } from './routes';

export function App() {
  const [offline, setOffline] = useState(false);
  const client = useMemo(() => createQueryClient(setOffline), []);
  const value = useMemo(
    () => ({
      offline,
      retry: () => {
        setOffline(false);
        void client.refetchQueries({ type: 'active' });
      },
    }),
    [offline, client],
  );

  return (
    <LocaleProvider>
      <QueryClientProvider client={client}>
        <OfflineContext.Provider value={value}>
          <SessionProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </SessionProvider>
        </OfflineContext.Provider>
      </QueryClientProvider>
    </LocaleProvider>
  );
}
