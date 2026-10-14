import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { IntlProvider } from 'use-intl';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import vi from '../../../messages/vi.json';
import { SessionProvider } from '../../auth/session-context';
import { SessionStore } from '../../auth/session-store';
import { BASE, makeFetch, type Route as ScriptedRoute } from '../../auth/test-support';

export function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{`${pathname}${search}`}</p>;
}

/**
 * Renders `element` at `path` inside a real SessionStore (scripted `fetch`), the vi messages and a MemoryRouter.
 * `/`, `/login` and `/uploads/abc` also render a marker so a redirect can be asserted by where it lands.
 */
export function renderAccount(
  element: ReactNode,
  opts: { path: string; routes: Record<string, ScriptedRoute>; state?: unknown },
) {
  const f = makeFetch(opts.routes);
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
  const utils = render(
    <IntlProvider locale="vi" messages={vi}>
      <SessionProvider store={store}>
        <MemoryRouter initialEntries={[{ pathname: opts.path, state: opts.state }]}>
          <Routes>
            <Route path={opts.path.split('?')[0]} element={element} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    </IntlProvider>,
  );
  return { store, ...f, ...utils };
}
