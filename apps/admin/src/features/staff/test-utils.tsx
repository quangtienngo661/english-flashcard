import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'use-intl';
import vi from '../../../messages/vi.json';
import { renderRoutes } from '../../app/test-router';
import { SessionProvider } from '../../auth/session-context';
import { SessionStore } from '../../auth/session-store';
import { BASE, makeFetch, makeMe, tokenResponse, type Route } from '../../auth/test-support';
import { ToastRegion } from '../../ui/Toast';

export const ME_ADMIN = makeMe({
  id: 'me-1',
  email: 'admin@wordmet.com',
  staff_role: 'admin',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'roles.manage'],
});

export type StaffRow = { id: string; email: string; email_verified: boolean; staff_role: 'admin' | 'editor' | null };
export const row = (over: Partial<StaffRow> & { id: string; email: string }): StaffRow => ({
  email_verified: true,
  staff_role: 'editor',
  ...over,
});

export const LIST_URL = 'GET /v1/admin/staff?page_size=20';

/** The whole app (routes, shell, nav) at `path`, signed in as an admin, with `routes` scripting the API. */
export function renderApp(path: string, routes: Record<string, Route>, me = ME_ADMIN) {
  const f = makeFetch({
    'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
    'GET /v1/me': () => Response.json(me),
    ...routes,
  });
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = renderRoutes(path, (routerNode) => (
    <IntlProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <QueryClientProvider client={client}>
        <SessionProvider store={store}>
          {routerNode}
          <ToastRegion />
        </SessionProvider>
      </QueryClientProvider>
    </IntlProvider>
  ));
  return { store, client, ...f, ...utils };
}
