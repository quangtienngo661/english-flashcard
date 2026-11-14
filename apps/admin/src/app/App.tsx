import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { SessionProvider } from '../auth/session-context';
import { LocaleProvider } from '../i18n/locale-context';
import { ToastRegion } from '../ui/Toast';
import { createQueryClient, OfflineContext } from './offline';
import { appRoutes } from './routes';

export function App() {
  const [offline, setOffline] = useState(false);
  const client = useMemo(() => createQueryClient(setOffline), []);
  const router = useMemo(() => createBrowserRouter(appRoutes), []);
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
            <RouterProvider router={router} />
            {/* Outside the routes, so a toast survives the page that raised it moving away (Review Focus 4). */}
            <ToastRegion />
          </SessionProvider>
        </OfflineContext.Provider>
      </QueryClientProvider>
    </LocaleProvider>
  );
}
