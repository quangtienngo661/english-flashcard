import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { IntlProvider } from 'use-intl';
import { describe, expect, it } from 'vitest';
import vi from '../../messages/vi.json';
import { SessionProvider } from '../auth/session-context';
import { SessionStore } from '../auth/session-store';
import { BASE, makeFetch, rateLimited } from '../auth/test-support';
import { AppRoutes } from './routes';

function renderWith(store: SessionStore, path: string) {
  render(
    <IntlProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <SessionProvider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </SessionProvider>
    </IntlProvider>,
  );
}

describe('session loading (B25E30)', () => {
  it('RequireSession shows "Thử lại sau 2 giây" while the store waits after a 429', async () => {
    const f = makeFetch({ 'POST /v1/auth/refresh': () => rateLimited(2) });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null, wait: () => new Promise(() => {}) });
    renderWith(store, '/uploads');
    expect(await screen.findByText(vi.shell.sessionRetry.replace('{seconds}', '2'))).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(vi.shell.loadingSession);
  });

  it('after three 429s the login page says the server is busy', async () => {
    const f = makeFetch({ 'POST /v1/auth/refresh': () => rateLimited(1) });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null, wait: async () => {} });
    renderWith(store, '/uploads');
    expect(await screen.findByText(vi.errors['rate-limited'])).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: vi.account.login.title })).toBeInTheDocument();
  });
});
