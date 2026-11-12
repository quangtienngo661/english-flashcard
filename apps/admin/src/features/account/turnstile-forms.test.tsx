// How the admin sign-in and reset forms use the bot check (launch prep A, design 4.3): a token per press, a fresh one after every
// response. The widget is replaced by one that issues tok-1, tok-2, ... so the tests can tell tokens apart; the widget itself is
// tested in ui/TurnstileWidget.test.tsx and the other form tests run with the real (fake-token) widget.
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, rateLimited, tokenResponse } from '../../auth/test-support';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { LoginPage } from './LoginPage';
import { renderAccount } from './test-utils';

const widget = vitest.hoisted(() => ({ issued: 0, resets: 0, emit: (() => {}) as (token: string | null) => void }));
vitest.mock('../../ui/TurnstileWidget', async () => {
  const { useEffect, useImperativeHandle } = await import('react');
  return {
    TurnstileWidget: ({ onToken, ref }: { onToken: (token: string | null) => void; ref?: React.Ref<{ reset(): void }> }) => {
      widget.emit = onToken;
      useImperativeHandle(ref, () => ({
        reset() {
          widget.resets += 1;
          onToken(`tok-${++widget.issued}`);
        },
      }), [onToken]);
      useEffect(() => {
        onToken(`tok-${++widget.issued}`);
        // Only on mount: a re-render must not issue a token by itself.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    },
  };
});

const tokensOf = (calls: Array<{ path: string; body: unknown }>, path: string) =>
  calls.filter((c) => c.path === path).map((c) => (c.body as { turnstile_token?: string }).turnstile_token);

beforeEach(() => {
  widget.issued = 0;
  widget.resets = 0;
  sessionStorage.clear();
});

async function fillLogin() {
  await userEvent.type(await screen.findByLabelText(vi.account.login.email), 'staff@example.com');
  await userEvent.type(screen.getByLabelText(vi.account.login.password), 'wrong-pass');
}
const signIn = () => userEvent.click(screen.getByRole('button', { name: vi.account.login.submit }));
const refresh401 = { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') };

describe('LoginPage and the bot check', () => {
  it('LA1#6: a wrong password (401) resets the widget; the second press carries a new token', async () => {
    let attempt = 0;
    const { calls } = renderAccount(<LoginPage />, {
      path: '/login',
      routes: {
        ...refresh401,
        'GET /v1/me': () => Response.json(makeMe()),
        'POST /v1/auth/login': () => (++attempt === 1 ? problem(401, 'invalid-credentials') : tokenResponse('tok')),
      },
    });
    await fillLogin();
    await signIn();
    expect(await screen.findByText(vi.errors['invalid-credentials'])).toBeInTheDocument();
    expect(widget.resets).toBe(1);
    await waitFor(() => expect(screen.getByRole('button', { name: vi.account.login.submit })).toBeEnabled());
    await signIn();
    await waitFor(() => expect(tokensOf(calls, '/v1/auth/login')).toEqual(['tok-1', 'tok-2']));
  });

  it('LA1E4: a 429 resets the widget too, so the press after the countdown has a token', async () => {
    renderAccount(<LoginPage />, { path: '/login', routes: { ...refresh401, 'POST /v1/auth/login': () => rateLimited(30) } });
    await fillLogin();
    await signIn();
    await waitFor(() => expect(widget.resets).toBe(1));
  });

  it('LA1E5: without a token, or after it expires, the sign-in button is off; a new token turns it on again', async () => {
    renderAccount(<LoginPage />, { path: '/login', routes: refresh401 });
    await fillLogin();
    await waitFor(() => expect(screen.getByRole('button', { name: vi.account.login.submit })).toBeEnabled());
    act(() => widget.emit(null));
    expect(screen.getByRole('button', { name: vi.account.login.submit })).toBeDisabled();
    act(() => widget.emit('tok-new'));
    expect(screen.getByRole('button', { name: vi.account.login.submit })).toBeEnabled();
  });

  it('sends the token with the sign-in', async () => {
    const { calls } = renderAccount(<LoginPage />, {
      path: '/login',
      routes: { ...refresh401, 'GET /v1/me': () => Response.json(makeMe()), 'POST /v1/auth/login': () => tokenResponse('tok') },
    });
    await fillLogin();
    await signIn();
    await waitFor(() => expect(tokensOf(calls, '/v1/auth/login')).toEqual(['tok-1']));
  });
});

describe('ForgotPasswordPage and the bot check', () => {
  const otp = () => new Response(null, { status: 204 });

  it('step one sends the token and resets the widget afterwards; the new step mounts its own', async () => {
    const { calls } = renderAccount(<ForgotPasswordPage />, { path: '/forgot-password', routes: { ...refresh401, 'POST /v1/auth/otp': otp } });
    await userEvent.type(await screen.findByLabelText(vi.account.forgot.email), 'ten@wordmet.com');
    await userEvent.click(screen.getByRole('button', { name: vi.account.forgot.send }));
    await screen.findByLabelText(vi.account.forgot.code);
    expect(tokensOf(calls, '/v1/auth/otp')).toEqual(['tok-1']);
  });

  it('a failed request resets the widget so the next press has a new token', async () => {
    renderAccount(<ForgotPasswordPage />, { path: '/forgot-password', routes: { ...refresh401, 'POST /v1/auth/otp': () => problem(503, 'mail-unavailable') } });
    await userEvent.type(await screen.findByLabelText(vi.account.forgot.email), 'ten@wordmet.com');
    await userEvent.click(screen.getByRole('button', { name: vi.account.forgot.send }));
    await waitFor(() => expect(widget.resets).toBe(1));
  });

  it('F7 (review 07/11): a wrong code on the password step resets the widget, and the next press carries a new token', async () => {
    let answer = () => problem(400, 'invalid-otp');
    const { calls } = renderAccount(<ForgotPasswordPage />, {
      path: '/forgot-password', routes: { ...refresh401, 'POST /v1/auth/otp': otp, 'POST /v1/auth/password/reset': () => answer() },
    });
    await userEvent.type(await screen.findByLabelText(vi.account.forgot.email), 'ten@wordmet.com');
    await userEvent.click(screen.getByRole('button', { name: vi.account.forgot.send }));
    await userEvent.type(await screen.findByLabelText(vi.account.forgot.code), '482913');
    await userEvent.type(screen.getByLabelText(vi.account.forgot.newPassword), 'Abcdef1!x');
    const resetsBefore = widget.resets;
    await userEvent.click(screen.getByRole('button', { name: vi.account.forgot.submit }));
    await waitFor(() => expect(widget.resets).toBe(resetsBefore + 1));
    answer = otp;
    await userEvent.click(screen.getByRole('button', { name: vi.account.forgot.submit }));
    await waitFor(() => expect(tokensOf(calls, '/v1/auth/password/reset')).toHaveLength(2));
    const [first, second] = tokensOf(calls, '/v1/auth/password/reset');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it('"resend" on the code step carries a token of its own, and the password step carries a fresh one (F7)', async () => {
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { calls } = renderAccount(<ForgotPasswordPage />, {
        path: '/forgot-password',
        routes: { ...refresh401, 'POST /v1/auth/otp': otp, 'POST /v1/auth/password/reset': otp },
      });
      await userEvent.type(await screen.findByLabelText(vi.account.forgot.email), 'ten@wordmet.com');
      await userEvent.click(screen.getByRole('button', { name: vi.account.forgot.send }));
      await screen.findByLabelText(vi.account.forgot.code);
      await userEvent.click(screen.getByRole('button', { name: vi.account.forgot.resend }));
      await waitFor(() => expect(tokensOf(calls, '/v1/auth/otp')).toHaveLength(2));
      const [first, second] = tokensOf(calls, '/v1/auth/otp');
      expect(first).toBeTruthy();
      expect(second).toBeTruthy();
      expect(second).not.toBe(first);
      await userEvent.type(screen.getByLabelText(vi.account.forgot.code), '482913');
      await userEvent.type(screen.getByLabelText(vi.account.forgot.newPassword), 'Abcdef1!x');
      await userEvent.click(screen.getByRole('button', { name: vi.account.forgot.submit }));
      await waitFor(() => expect(calls.some((c) => c.path === '/v1/auth/password/reset')).toBe(true));
      const [resetToken] = tokensOf(calls, '/v1/auth/password/reset');
      expect(resetToken).toBeTruthy();
      expect(resetToken).not.toBe(second);
    } finally {
      vitest.useRealTimers();
    }
  });
});
