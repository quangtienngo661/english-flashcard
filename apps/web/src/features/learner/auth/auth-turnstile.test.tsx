// @vitest-environment jsdom
// How the forms use the bot check (launch prep A, design 4.3): a token per press, a fresh one after every response.
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

const widget = vi.hoisted(() => ({ issued: 0, resets: 0, emit: (() => {}) as (token: string | null) => void }));
vi.mock('./TurnstileWidget', async () => {
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
    expect(await screen.findByText('Email hoặc mật khẩu chưa đúng.')).toBeInTheDocument();
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

describe('the other forms and a pending check (QA5)', () => {
  it.each([
    ['sign-up', () => <RegisterForm today="2026-10-18" />, 'Tạo tài khoản'],
    ['forgot password', () => <ForgotPasswordForm />, 'Gửi mã'],
  ] as const)('%s: only a pending token keeps the button off, with "Đang xác minh…" beside it', async (_name, form, button) => {
    renderApp(form(), { routes: signedOut });
    await waitFor(() => expect(screen.getByRole('button', { name: button })).toBeEnabled());
    act(() => widget.emit(null));
    expect(screen.getByRole('button', { name: button })).toBeDisabled();
    expect(screen.getByText('Đang xác minh…')).toBeInTheDocument();
  });
});

describe('ForgotPasswordForm and the bot check', () => {
  it('sends the token with the reset request; a failure resets the widget', async () => {
    const { calls } = renderApp(<ForgotPasswordForm />, { routes: { ...signedOut, 'POST /v1/auth/otp': () => problem(503, 'mail-unavailable') } });
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'lan@example.com');
    await press('Gửi mã');
    await waitFor(() => expect(widget.resets).toBe(1));
    expect(tokensOf(calls, '/v1/auth/otp')).toEqual(['tok-1']);
    expect(hardReplace).not.toHaveBeenCalled();
  });

  it('a successful request leaves for the reset screen without resetting the widget', async () => {
    renderApp(<ForgotPasswordForm />, { routes: { ...signedOut, 'POST /v1/auth/otp': () => Response.json({}, { status: 202 }) } });
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'lan@example.com');
    await press('Gửi mã');
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/reset-password'));
    expect(widget.resets).toBe(0);
  });
});

describe('VerifyEmailForm and the bot check', () => {
  beforeEach(() => {
    writePendingEmail('lan@example.com');
    setPendingPassword('Aa1!aaaa');
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('resend carries a token and resets the widget afterwards, because the form stays on the page', async () => {
    const { calls } = renderApp(<VerifyEmailForm />, { routes: { ...signedOut, 'POST /v1/auth/otp': () => Response.json({}, { status: 202 }) } });
    await act(() => vi.advanceTimersByTimeAsync(61_000));
    await userEvent.click(await screen.findByRole('button', { name: 'Gửi lại mã' }));
    await waitFor(() => expect(widget.resets).toBe(1));
    expect(tokensOf(calls, '/v1/auth/otp')).toEqual(['tok-1']);
  });

  // Review 07/11 F7 (replaces LA1E14): verify-email runs argon2, so the bot check guards it too.
  it('F7: submitting the code carries a token; a wrong code resets the widget and the next press carries a new one', async () => {
    let answer = () => problem(400, 'invalid-otp');
    const { calls } = renderApp(<VerifyEmailForm />, { routes: { ...signedOut, 'POST /v1/auth/verify-email': () => answer() } });
    await userEvent.click(await screen.findByRole('textbox', { name: 'Chữ số 1' }));
    await userEvent.keyboard('481205');
    await press('Xác minh');
    await waitFor(() => expect(widget.resets).toBe(1));
    answer = () => tokenResponse('t');
    await press('Xác minh');
    await waitFor(() => expect(hardReplace).toHaveBeenCalled());
    expect(tokensOf(calls, '/v1/auth/verify-email')).toEqual(['tok-1', 'tok-2']);
  });

  it('F7: no token yet keeps the Xác minh button off', async () => {
    renderApp(<VerifyEmailForm />, { routes: signedOut });
    await userEvent.click(await screen.findByRole('textbox', { name: 'Chữ số 1' }));
    await userEvent.keyboard('481205');
    act(() => widget.emit(null));
    expect(screen.getByRole('button', { name: 'Xác minh' })).toBeDisabled();
  });
});

describe('ResetPasswordForm and the bot check (review 07/11 F7)', () => {
  beforeEach(() => writePendingEmail('lan@example.com'));
  const fillReset = async () => {
    // The new form: six digit boxes (typing moves to the next box) and the new password typed twice.
    await userEvent.click(await screen.findByRole('textbox', { name: 'Chữ số 1' }));
    await userEvent.keyboard('481205');
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'Aa1!aaaa');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Aa1!aaaa');
  };

  it('sends the token with the new password; a wrong code resets the widget and the next press carries a new one', async () => {
    let answer = () => problem(400, 'invalid-otp');
    const { calls } = renderApp(<ResetPasswordForm />, { routes: { ...signedOut, 'POST /v1/auth/password/reset': () => answer() } });
    await fillReset();
    await press('Đổi mật khẩu');
    await waitFor(() => expect(widget.resets).toBe(1));
    answer = () => new Response(null, { status: 204 });
    await press('Đổi mật khẩu');
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/login?reset=1'));
    expect(tokensOf(calls, '/v1/auth/password/reset')).toEqual(['tok-1', 'tok-2']);
  });

  it('no token yet keeps the button off', async () => {
    renderApp(<ResetPasswordForm />, { routes: signedOut });
    await fillReset();
    act(() => widget.emit(null));
    expect(screen.getByRole('button', { name: 'Đổi mật khẩu' })).toBeDisabled();
  });
});
