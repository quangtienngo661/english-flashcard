// @vitest-environment jsdom
// How the forms use the bot check (launch prep A, design 4.3): a token per press, a fresh one after every response. Owner 14/11/2026: only
// sign-in and sign-up have it; forgot password, the reset form and the email code form have none (the section at the end pins that).
// The widget is replaced by one that issues tok-1, tok-2, … so the tests can tell tokens apart; the widget's own behaviour is in
// TurnstileWidget.test.tsx and the other form tests run with the real (fake-token) widget in auth.test.tsx.
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearPendingEmail, setPendingPassword, writePendingEmail } from '@/app-shell/session/pending-email';
import { problem, rateLimited, tokenResponse } from '@/app-shell/session/test-support';
import { parseBirthDate } from '@/lib/date-of-birth';
import { pickDate, renderApp } from '@/test-utils/render-app';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { VerifyEmailForm } from './VerifyEmailForm';

const widget = vi.hoisted(() => ({ issued: 0, resets: 0, mounted: 0, emit: (() => {}) as (token: string | null) => void }));
vi.mock('./TurnstileWidget', async () => {
  const { useEffect, useImperativeHandle } = await import('react');
  return {
    TurnstileWidget: ({ onToken, ref }: { onToken: (token: string | null) => void; ref?: React.Ref<{ reset(): void }> }) => {
      widget.emit = onToken;
      widget.mounted += 1;
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

const replace = vi.fn();
const hardReplace = vi.fn();
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path), isLeaving: () => false }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/vi/app/login',
}));
vi.setConfig({ testTimeout: 20_000 });

const signedOut = { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') };

beforeEach(() => {
  widget.issued = 0;
  widget.resets = 0;
  widget.mounted = 0;
  replace.mockReset();
  hardReplace.mockReset();
  sessionStorage.clear();
  clearPendingEmail();
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ timeZone: 'Asia/Ho_Chi_Minh' } as Intl.ResolvedDateTimeFormatOptions);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function fillLogin() {
  await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'lan@example.com');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'wrong-pw');
}
const press = (name: string) => userEvent.click(screen.getByRole('button', { name }));
const tokensOf = (calls: Array<{ path: string; body: unknown }>, path: string) =>
  calls.filter((c) => c.path === path).map((c) => (c.body as { turnstile_token?: string }).turnstile_token);

describe('LoginForm and the bot check', () => {
  it('LA1#6: a wrong password (401) resets the widget; the second press carries a new token', async () => {
    let attempt = 0;
    const { calls } = renderApp(<LoginForm />, {
      routes: { ...signedOut, 'POST /v1/auth/login': () => (++attempt === 1 ? problem(401, 'invalid-credentials') : tokenResponse('t')) },
    });
    await fillLogin();
    await press('Đăng nhập');
    expect(await screen.findByText('Email hoặc mật khẩu không đúng. Thử lại.')).toBeInTheDocument();
    expect(widget.resets).toBe(1);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled());
    await press('Đăng nhập');
    await waitFor(() => expect(hardReplace).toHaveBeenCalled());
    expect(tokensOf(calls, '/v1/auth/login')).toEqual(['tok-1', 'tok-2']);
  });

  it('LA1E4: a 429 on sign-in resets the widget too', async () => {
    renderApp(<LoginForm />, { routes: { ...signedOut, 'POST /v1/auth/login': () => rateLimited(30) }, instantWaits: true });
    await fillLogin();
    await press('Đăng nhập');
    await waitFor(() => expect(widget.resets).toBe(1));
  });

  it('a signed-in redirect does not reset the widget (the page is leaving)', async () => {
    renderApp(<LoginForm />, { routes: { ...signedOut, 'POST /v1/auth/login': () => tokenResponse('t') } });
    await fillLogin();
    await press('Đăng nhập');
    await waitFor(() => expect(hardReplace).toHaveBeenCalled());
    expect(widget.resets).toBe(0);
  });

  it('LA1E5, QA5: no token yet, or it expired, keeps the button off with "Đang xác minh…"; a new token turns it on again', async () => {
    renderApp(<LoginForm />, { routes: signedOut });
    await fillLogin();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled());
    expect(screen.queryByText('Đang xác minh…')).toBeNull();
    act(() => widget.emit(null));
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Đang xác minh…');
    act(() => widget.emit('tok-new'));
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
    expect(screen.queryByText('Đang xác minh…')).toBeNull();
  });

  it('LA1E6: two quick presses send one request', async () => {
    let release!: () => void;
    const { count } = renderApp(<LoginForm />, {
      routes: { ...signedOut, 'POST /v1/auth/login': () => new Promise<Response>((r) => (release = () => r(tokenResponse('t')))) },
    });
    await fillLogin();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(count('POST', '/v1/auth/login')).toBe(1);
    await act(async () => release());
  });
});

describe('RegisterForm and the bot check', () => {
  it('sends the token, and an "email already taken" answer resets the widget', async () => {
    const { calls } = renderApp(<RegisterForm today="2026-10-18" />, { routes: { ...signedOut, 'POST /v1/auth/register': () => problem(409, 'email-taken') } });
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên' }), 'Lan');
    pickDate('Ngày sinh', parseBirthDate('14/5/2008')!);
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'lan@example.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Aa1!aaaa');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu'), 'Aa1!aaaa');
    await userEvent.click(screen.getByRole('checkbox'));
    await press('Tạo tài khoản');
    expect(await screen.findByText(/Email này đã có tài khoản/)).toBeInTheDocument();
    expect(tokensOf(calls, '/v1/auth/register')).toEqual(['tok-1']);
    expect(widget.resets).toBe(1);
  });
});

describe('RegisterForm and a pending check (QA5)', () => {
  it('only a pending token keeps the button off, with "Đang xác minh…" beside it', async () => {
    renderApp(<RegisterForm today="2026-10-18" />, { routes: signedOut });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo tài khoản' })).toBeEnabled());
    act(() => widget.emit(null));
    expect(screen.getByRole('button', { name: 'Tạo tài khoản' })).toBeDisabled();
    expect(screen.getByText('Đang xác minh…')).toBeInTheDocument();
  });
});

describe('forgot password, email code and reset have no bot check (owner 14/11/2026)', () => {
  it('ForgotPasswordForm: no widget, the button is on at once, the request carries no token, and it leaves for the reset screen', async () => {
    const { calls } = renderApp(<ForgotPasswordForm />, { routes: { ...signedOut, 'POST /v1/auth/otp': () => Response.json({}, { status: 202 }) } });
    expect(screen.getByRole('button', { name: 'Gửi mã' })).toBeEnabled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'lan@example.com');
    await press('Gửi mã');
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/reset-password'));
    expect(widget.mounted).toBe(0);
    expect(screen.queryByText('Đang xác minh…')).not.toBeInTheDocument();
    expect(calls.find((c) => c.path === '/v1/auth/otp')?.body).toEqual({ purpose: 'reset_password', email: 'lan@example.com' });
  });

  it('VerifyEmailForm: no widget; the code and the resend carry no token, and Xác minh is on once the six digits are in', async () => {
    writePendingEmail('lan@example.com');
    setPendingPassword('Aa1!aaaa');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { calls } = renderApp(<VerifyEmailForm />, {
      routes: { ...signedOut, 'POST /v1/auth/otp': () => Response.json({}, { status: 202 }), 'POST /v1/auth/verify-email': () => tokenResponse('t') },
    });
    await userEvent.click(await screen.findByRole('textbox', { name: 'Chữ số 1' }));
    await userEvent.keyboard('481205');
    expect(screen.getByRole('button', { name: 'Xác minh' })).toBeEnabled();
    await act(() => vi.advanceTimersByTimeAsync(61_000));
    await userEvent.click(await screen.findByRole('button', { name: 'Gửi lại mã' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/v1/auth/otp')).toBe(true));
    await press('Xác minh');
    await waitFor(() => expect(hardReplace).toHaveBeenCalled());
    expect(widget.mounted).toBe(0);
    expect(tokensOf(calls, '/v1/auth/otp')).toEqual([undefined]);
    expect(tokensOf(calls, '/v1/auth/verify-email')).toEqual([undefined]);
    expect(screen.queryByText('Đang xác minh…')).not.toBeInTheDocument();
  });

  it('ResetPasswordForm: no widget; the new password goes without a token, and a wrong code just shows the error', async () => {
    writePendingEmail('lan@example.com');
    let answer = () => problem(400, 'invalid-otp');
    const { calls } = renderApp(<ResetPasswordForm />, { routes: { ...signedOut, 'POST /v1/auth/password/reset': () => answer() } });
    await userEvent.click(await screen.findByRole('textbox', { name: 'Chữ số 1' }));
    await userEvent.keyboard('481205');
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'Aa1!aaaa');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Aa1!aaaa');
    expect(screen.getByRole('button', { name: 'Đổi mật khẩu' })).toBeEnabled();
    await press('Đổi mật khẩu');
    await waitFor(() => expect(calls.filter((c) => c.path === '/v1/auth/password/reset')).toHaveLength(1));
    answer = () => new Response(null, { status: 204 });
    await press('Đổi mật khẩu');
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/login?reset=1'));
    expect(widget.mounted).toBe(0);
    expect(tokensOf(calls, '/v1/auth/password/reset')).toEqual([undefined, undefined]);
    expect(screen.queryByText('Đang xác minh…')).not.toBeInTheDocument();
  });
});
