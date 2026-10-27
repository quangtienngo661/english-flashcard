import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'use-intl';
import { describe, expect, it } from 'vitest';
import vi from '../../messages/vi.json';
import { SessionProvider } from '../auth/session-context';
import { SessionStore } from '../auth/session-store';
import { BASE, makeFetch, makeMe, problem, rateLimited, tokenResponse } from '../auth/test-support';
import { renderRoutes } from './test-router';

function renderWith(store: SessionStore, path: string) {
  renderRoutes(path, (routerNode) => (
    <IntlProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <QueryClientProvider client={new QueryClient()}>
        <SessionProvider store={store}>
          {routerNode}
        </SessionProvider>
      </QueryClientProvider>
    </IntlProvider>
  ));
}

describe('session loading (B25E30)', () => {
  it('RequireSession shows "Thử lại sau 2 giây" while the store waits after a 429', async () => {
    const f = makeFetch({ 'POST /v1/auth/refresh': () => rateLimited(2) });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null, wait: () => new Promise(() => {}) });
    renderWith(store, '/uploads');
    expect(await screen.findByText(vi.shell.sessionRetry.replace('{seconds}', '2'))).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(vi.shell.loadingSession);
  });

  it('the countdown is a timer outside the live status region, so a screen reader does not read it every second (review M7)', async () => {
    const f = makeFetch({ 'POST /v1/auth/refresh': () => rateLimited(2) });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null, wait: () => new Promise(() => {}) });
    renderWith(store, '/uploads');
    const countdown = await screen.findByText(vi.shell.sessionRetry.replace('{seconds}', '2'));
    expect(screen.getByRole('status')).not.toContainElement(countdown);
    expect(screen.getByRole('timer')).toBe(countdown);
  });

  it('after three 429s the login page says the server is busy', async () => {
    const f = makeFetch({ 'POST /v1/auth/refresh': () => rateLimited(1) });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null, wait: async () => {} });
    renderWith(store, '/uploads');
    expect(await screen.findByText(vi.errors['rate-limited'])).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: vi.account.login.title })).toBeInTheDocument();
  });

  it('the unavailable state shows the text and a retry button that bootstraps again (FE36)', async () => {
    let up = false;
    const f = makeFetch({
      'POST /v1/auth/refresh': () => (up ? tokenResponse('tok-1') : problem(503, 'unavailable')),
      'GET /v1/me': () => Response.json(makeMe()),
      'GET /v1/admin/x': () => Response.json({}),
    });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
    renderWith(store, '/uploads');
    expect(await screen.findByText(vi.session.unavailable)).toBeInTheDocument();
    up = true;
    fireEvent.click(screen.getByRole('button', { name: vi.session.retry }));
    await vi_waitSignedIn(store);
    expect(screen.queryByText(vi.session.unavailable)).not.toBeInTheDocument();
  });
});

async function vi_waitSignedIn(store: SessionStore) {
  await waitFor(() => expect(store.state.status).toBe('signed-in'));
}
