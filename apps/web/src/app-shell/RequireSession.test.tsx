// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import vi_ from '../../messages/vi.json';
import { RequireSession } from './RequireSession';
import { SessionProvider } from './session/session-context';
import { SessionStore } from './session/session-store';
import { BASE, makeFetch, makeMe, problem, tokenResponse, type Route } from './session/test-support';

const replace = vi.fn();
let routerPath: string | null = null;
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  // The router's path; null = same as the address bar.
  usePathname: () => routerPath ?? window.location.pathname,
}));
vi.mock('./navigate', () => ({ hardReplace: (path: string) => replace(path) }));

function at(path: string) {
  window.history.replaceState(null, '', path);
}

function setup(routes: Record<string, Route>, locale: 'vi' | 'en' = 'vi') {
  const f = makeFetch(routes);
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
  render(
    <NextIntlClientProvider locale={locale} messages={{ App: vi_.App }}>
      <SessionProvider store={store}>
        <RequireSession>
          <p>secret</p>
        </RequireSession>
      </SessionProvider>
    </NextIntlClientProvider>,
  );
  return { store, ...f };
}

const signedIn = (me = makeMe()): Record<string, Route> => ({
  'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
  'GET /v1/me': () => Response.json(me),
});

beforeEach(() => {
  routerPath = null;
  replace.mockReset();
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    timeZone: 'Asia/Ho_Chi_Minh',
  } as Intl.ResolvedDateTimeFormatOptions);
});
afterEach(() => vi.restoreAllMocks());

describe('RequireSession', () => {
  it('shows a spinner while the session loads, then the page', async () => {
    at('/vi/app');
    setup(signedIn());
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải…');
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(await screen.findByText('secret')).toBeInTheDocument();
  });

  it('E1: signed out → login with next = the page being opened', async () => {
    at('/vi/app/group?id=g1');
    setup({ 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/login?next=%2Fvi%2Fapp%2Fgroup%3Fid%3Dg1'));
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('E5: API down at start → offline screen; Thử lại starts again', async () => {
    at('/vi/app');
    let down = true;
    setup({
      'POST /v1/auth/refresh': () => (down ? new Response('', { status: 503 }) : tokenResponse('tok-1')),
      'GET /v1/me': () => Response.json(makeMe()),
    });
    expect(await screen.findByText('Không kết nối được')).toBeInTheDocument();
    down = false;
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('secret')).toBeInTheDocument();
  });

  it('E10: an en path for a vi profile moves to vi, keeping the sub-path and query', async () => {
    at('/en/app/settings?tab=1');
    setup(signedIn(makeMe({ native_language: 'vi' })), 'en');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/settings?tab=1'));
  });

  it('E9: no language yet → welcome, coming back to the page after', async () => {
    at('/vi/app/settings');
    setup(signedIn(makeMe({ native_language: null })));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/welcome?next=%2Fvi%2Fapp%2Fsettings'));
  });

  it('E9: a client-side move to verify-email is judged by the router path, not the address bar that has not changed yet', async () => {
    at('/vi/app/register');
    routerPath = '/vi/app/verify-email';
    setup(signedIn(makeMe({ native_language: null })));
    expect(await screen.findByText('secret')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('E9: the welcome and verify-email pages themselves open without a language', async () => {
    at('/vi/app/welcome');
    setup(signedIn(makeMe({ native_language: null })));
    expect(await screen.findByText('secret')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('E11: a device zone other than the profile is sent once with PATCH /v1/me', async () => {
    at('/vi/app');
    const { count, calls } = setup({
      ...signedIn(makeMe({ timezone: 'Europe/Berlin' })),
      'PATCH /v1/me': () => Response.json(makeMe({ timezone: 'Asia/Ho_Chi_Minh' })),
    });
    await screen.findByText('secret');
    await waitFor(() => expect(count('PATCH', '/v1/me')).toBe(1));
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ timezone: 'Asia/Ho_Chi_Minh' });
  });

  it('E11: a failed zone update is ignored', async () => {
    at('/vi/app');
    setup({ ...signedIn(makeMe({ timezone: 'Europe/Berlin' })), 'PATCH /v1/me': () => new Response('', { status: 500 }) });
    expect(await screen.findByText('secret')).toBeInTheDocument();
  });

  it('a staff-created account that must change its password goes to forgot-password', async () => {
    at('/vi/app');
    setup(signedIn(makeMe({ must_change_password: true })));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/forgot-password?reason=change-password'));
  });
});
