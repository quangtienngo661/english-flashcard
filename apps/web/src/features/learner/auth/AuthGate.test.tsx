// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react';
import { problem, tokenResponse } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { AuthGate } from './AuthGate';

const hardReplace = vi.fn();
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path), isLeaving: () => false }));
let pathname = '/vi/app/login';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

beforeEach(() => {
  hardReplace.mockReset();
  pathname = '/vi/app/login';
});

describe('AuthGate', () => {
  it('a learner already signed in when the page opens goes on into the app', async () => {
    renderApp(
      <AuthGate>
        <p>form</p>
      </AuthGate>,
    );
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app'));
  });

  it.each(['/vi/app/forgot-password', '/en/app/reset-password'])(
    'B8-2: %s stays open for a learner who is signed in (a Google-only account sets a password there)',
    async (path) => {
      pathname = path;
      const { store } = renderApp(
        <AuthGate>
          <p>form</p>
        </AuthGate>,
      );
      // The session must be known before "no redirect" means anything; the sign-in page redirects at this same moment (first test).
      await waitFor(() => expect(store.state.status).toBe('signed-in'));
      expect(screen.getByText('form')).toBeInTheDocument();
      expect(hardReplace).not.toHaveBeenCalled();
    },
  );

  it('registering on this page stays signed out and lets the form choose where to go', async () => {
    const { store } = renderApp(
      <AuthGate>
        <p>form</p>
      </AuthGate>,
      {
        routes: {
          'POST /v1/auth/refresh': () => problem(401, 'invalid-token'),
          'POST /v1/auth/register': () => Response.json({ email: 'a@b.c', verification_required: true }, { status: 201 }),
        },
      },
    );
    await screen.findByText('form');
    await waitFor(() => expect(store.state.status).toBe('signed-out'));
    await act(() =>
      store.register({ email: 'a@b.c', password: 'Aa1!aaaa', given_name: 'A', birth_date: '2000-01-01', timezone: 'UTC', accept_terms: true }),
    );
    expect(store.state.status).toBe('signed-out');
    expect(screen.getByText('form')).toBeInTheDocument();
    expect(hardReplace).not.toHaveBeenCalled();
  });

  it('signing in on this page lets the form choose where to go', async () => {
    const { store } = renderApp(<AuthGate><p>form</p></AuthGate>, {
      routes: {
        'POST /v1/auth/refresh': () => problem(401, 'invalid-token'),
        'POST /v1/auth/login': () => tokenResponse('t'),
      },
    });
    await screen.findByText('form');
    await waitFor(() => expect(store.state.status).toBe('signed-out'));
    await act(() => store.login('a@b.c', 'Aa1!aaaa'));
    expect(store.state.status).toBe('signed-in');
    expect(hardReplace).not.toHaveBeenCalled();
  });
});
