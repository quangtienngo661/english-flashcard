// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react';
import { problem, tokenResponse } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { AuthGate } from './AuthGate';

const hardReplace = vi.fn();
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/vi/app/login', useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

beforeEach(() => hardReplace.mockReset());

describe('AuthGate', () => {
  it('a learner already signed in when the page opens goes on into the app', async () => {
    renderApp(
      <AuthGate>
        <p>form</p>
      </AuthGate>,
    );
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app'));
  });

  it('signing in or up on this page does not redirect from here: the form chooses where to go', async () => {
    const { store } = renderApp(
      <AuthGate>
        <p>form</p>
      </AuthGate>,
      {
        routes: {
          'POST /v1/auth/refresh': () => problem(401, 'invalid-token'),
          'POST /v1/auth/register': () => tokenResponse('t'),
        },
      },
    );
    await screen.findByText('form');
    await waitFor(() => expect(store.state.status).toBe('signed-out'));
    await act(() =>
      store.register({ email: 'a@b.c', password: 'Aa1!aaaa', given_name: 'A', birth_date: '2000-01-01', timezone: 'UTC', accept_terms: true }),
    );
    expect(store.state.status).toBe('signed-in');
    expect(hardReplace).not.toHaveBeenCalled();
  });
});
