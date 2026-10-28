import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, rateLimited, tokenResponse } from '../../auth/test-support';
import { LoginPage } from './LoginPage';
import { renderAccount } from './test-utils';

const noContent = () => new Response(null, { status: 204 });
const editorRoutes = {
  'POST /v1/auth/refresh': () => problem(401, 'invalid-token'),
  'POST /v1/auth/login': () => tokenResponse('tok-1'),
  'GET /v1/me': () => Response.json(makeMe()),
};

async function fillAndSubmit(email = 'staff@example.com', password = 'secret-pass') {
  await userEvent.type(await screen.findByLabelText(vi.account.login.email), email);
  await userEvent.type(screen.getByLabelText(vi.account.login.password), password);
  await userEvent.click(screen.getByRole('button', { name: vi.account.login.submit }));
}

describe('LoginPage', () => {
  beforeEach(() => sessionStorage.clear());

  it('shows the sign-out failure banner and its retry button', async () => {
    let logoutStatus = 503;
    const { store } = renderAccount(<LoginPage />, {
      path: '/login',
      routes: { ...editorRoutes, 'POST /v1/auth/logout': () => new Response(null, { status: logoutStatus }) },
    });
    await waitFor(() => expect(store.state.status).toBe('signed-out'));
    await store.logout();

    expect(await screen.findByText(vi.notice.logoutFailed)).toBeInTheDocument();
    logoutStatus = 204;
    await userEvent.click(screen.getByRole('button', { name: vi.session.retry }));

    await waitFor(() => expect(screen.queryByText(vi.notice.logoutFailed)).toBeNull());
    expect(store.state).toEqual({ status: 'signed-out', notice: null });
  });

  it('B25#2 (screen): notice no-access shows errors.noAccess text on /login; the login card has no registration link', async () => {
    const { store } = renderAccount(<LoginPage />, {
      path: '/login',
      routes: { ...editorRoutes, 'POST /v1/auth/logout': noContent },
    });
    await waitFor(() => expect(store.state.status).toBe('signed-out')); // bootstrap finished
    await store.logout('no-access');

    expect(await screen.findByText(vi.errors.noAccess)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /đăng ký|register|sign up/i })).toBeNull();
    expect(screen.getByRole('link', { name: vi.account.login.forgot })).toHaveAttribute('href', '/forgot-password');
  });

  it('notice expired shows notice.expired', async () => {
    const { store } = renderAccount(<LoginPage />, { path: '/login', routes: { ...editorRoutes, 'POST /v1/auth/logout': noContent } });
    await waitFor(() => expect(store.state.status).toBe('signed-out'));
    await store.logout('expired');
    expect(await screen.findByText(vi.notice.expired)).toBeInTheDocument();
  });

  it('B8E44: notice password-required says to sign in again with the password', async () => {
    const { store } = renderAccount(<LoginPage />, { path: '/login', routes: { ...editorRoutes, 'POST /v1/auth/logout': noContent } });
    await waitFor(() => expect(store.state.status).toBe('signed-out'));
    await store.logout('password-required');
    expect(await screen.findByText('Đăng nhập lại bằng mật khẩu để vào trang quản trị')).toBeInTheDocument();
  });

  it('wrong credentials show the invalid-credentials message and stay on the form', async () => {
    renderAccount(<LoginPage />, {
      path: '/login',
      routes: { ...editorRoutes, 'POST /v1/auth/login': () => problem(401, 'invalid-credentials') },
    });
    await fillAndSubmit();
    expect(await screen.findByText(vi.errors['invalid-credentials'])).toBeInTheDocument();
    expect(screen.getByLabelText(vi.account.login.email)).toBeInTheDocument();
  });

  it('a network failure shows the generic message, not a crash', async () => {
    renderAccount(<LoginPage />, {
      path: '/login',
      routes: {
        ...editorRoutes,
        'POST /v1/auth/login': () => {
          throw new TypeError('Failed to fetch');
        },
      },
    });
    await fillAndSubmit();
    expect(await screen.findByText(vi.offline.message)).toBeInTheDocument();
  });

  it('Review Focus 3: a double-click on the submit button sends one login request', async () => {
    const { count } = renderAccount(<LoginPage />, { path: '/login', routes: editorRoutes });
    await userEvent.type(await screen.findByLabelText(vi.account.login.email), 'staff@example.com');
    await userEvent.type(screen.getByLabelText(vi.account.login.password), 'secret-pass');
    await userEvent.dblClick(screen.getByRole('button', { name: vi.account.login.submit }));
    await waitFor(() => expect(count('POST', '/v1/auth/login')).toBe(1));
  });

  it('signed in: lands on the path kept in router state `from`, else on /', async () => {
    renderAccount(<LoginPage />, { path: '/login', routes: editorRoutes, state: { from: '/uploads/abc' } });
    await fillAndSubmit();
    expect(await screen.findByTestId('where')).toHaveTextContent('/uploads/abc');
  });

  it('signed in without `from` goes to /', async () => {
    renderAccount(<LoginPage />, { path: '/login', routes: editorRoutes });
    await fillAndSubmit();
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/$/);
  });

  it('a user who must change the password is sent to /change-password', async () => {
    renderAccount(<LoginPage />, {
      path: '/login',
      routes: { ...editorRoutes, 'GET /v1/me': () => Response.json(makeMe({ must_change_password: true })) },
    });
    await fillAndSubmit();
    expect(await screen.findByTestId('where')).toHaveTextContent('/change-password');
  });
});

const retryIn = (n: number) => vi.errors.retryIn.replace('{seconds}', String(n));
afterEach(() => vitest.useRealTimers());
async function tick() {
  await act(async () => {
    await vitest.advanceTimersByTimeAsync(1000);
  });
}

describe('LoginPage — rate limit', () => {
  it('B25#18: 429 with Retry-After 30 disables submit and counts 30 → 0, then re-enables', async () => {
    renderAccount(<LoginPage />, { path: '/login', routes: { ...editorRoutes, 'POST /v1/auth/login': () => rateLimited(30) } });
    await screen.findByLabelText(vi.account.login.email);
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    await fillAndSubmit();

    expect(await screen.findByRole('button', { name: retryIn(30) })).toBeDisabled();
    await tick();
    expect(screen.getByRole('button', { name: retryIn(29) })).toBeDisabled();
    for (let i = 0; i < 29; i++) await tick();
    expect(screen.getByRole('button', { name: vi.account.login.submit })).toBeEnabled();
  }, 20_000);
});
