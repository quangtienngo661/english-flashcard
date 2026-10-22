// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeMe, problem, rateLimited, tokenResponse } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { VerifyEmailForm } from './VerifyEmailForm';
import { WelcomeLanguage } from './WelcomeLanguage';

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => search,
  usePathname: () => '/vi/app/login',
}));

// Forms with many fields typed key by key take a few seconds when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const signedOut = { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') };
const TODAY = '2026-10-18';

beforeEach(() => {
  replace.mockReset();
  search = new URLSearchParams();
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    timeZone: 'Asia/Ho_Chi_Minh',
  } as Intl.ResolvedDateTimeFormatOptions);
});
afterEach(() => vi.restoreAllMocks());

async function fillRegister(birth = '14/5/2008') {
  await userEvent.type(screen.getByRole('textbox', { name: 'Tên' }), 'Lan');
  await userEvent.type(screen.getByRole('textbox', { name: 'Họ (không bắt buộc)' }), 'Nguyễn');
  await userEvent.type(screen.getByRole('textbox', { name: 'Ngày sinh' }), birth);
  await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'lan@example.com');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Aa1!aaaa');
}

describe('RegisterForm (K/01, K/01b)', () => {
  it('sends the form with the browser zone and consent, then goes to the code screen', async () => {
    const { calls } = renderApp(<RegisterForm today={TODAY} />, {
      routes: { ...signedOut, 'POST /v1/auth/register': () => tokenResponse('tok-1') },
    });
    await fillRegister();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/verify-email?sent=1'));
    expect(calls.find((c) => c.path === '/v1/auth/register')!.body).toEqual({
      given_name: 'Lan', family_name: 'Nguyễn', birth_date: '2008-05-14', email: 'lan@example.com', password: 'Aa1!aaaa',
      timezone: 'Asia/Ho_Chi_Minh', accept_terms: true, client: 'web', device_label: 'Wordmet Web',
    });
  });

  it('K/01b: the button stays off until consent is ticked and the birth date is 13+; no request is sent', async () => {
    const { count } = renderApp(<RegisterForm today={TODAY} />, { routes: signedOut });
    await fillRegister('14/5/2015');
    expect(screen.getByText('Bạn cần đủ 13 tuổi để dùng Wordmet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Tạo tài khoản' })).toBeDisabled();
    expect(count('POST', '/v1/auth/register')).toBe(0);
  });

  it('409 email-taken shows under the email field', async () => {
    renderApp(<RegisterForm today={TODAY} />, { routes: { ...signedOut, 'POST /v1/auth/register': () => problem(409, 'email-taken') } });
    await fillRegister();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await screen.findByText('Email này đã có tài khoản. Đăng nhập hoặc dùng email khác.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('400 age-below-minimum from the API shows under the birth date', async () => {
    renderApp(<RegisterForm today={TODAY} />, { routes: { ...signedOut, 'POST /v1/auth/register': () => problem(400, 'age-below-minimum') } });
    await fillRegister();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await screen.findByText('Bạn cần đủ 13 tuổi để dùng Wordmet.')).toBeInTheDocument();
  });

  it('password violations are listed under the password', async () => {
    renderApp(<RegisterForm today={TODAY} />, {
      routes: { ...signedOut, 'POST /v1/auth/register': () => problem(400, 'validation-failed', { violations: ['uppercase', 'special'] }) },
    });
    await fillRegister();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await screen.findByText('Cần một chữ hoa.')).toBeInTheDocument();
    expect(screen.getByText('Cần một ký tự đặc biệt.')).toBeInTheDocument();
  });

  it('Review Focus 1: a double click sends one request', async () => {
    let release!: () => void;
    const { count } = renderApp(<RegisterForm today={TODAY} />, {
      routes: {
        ...signedOut,
        'POST /v1/auth/register': () => new Promise<Response>((r) => (release = () => r(tokenResponse('t')))),
      },
    });
    await fillRegister();
    await userEvent.click(screen.getByRole('checkbox'));
    const button = screen.getByRole('button', { name: 'Tạo tài khoản' });
    await userEvent.dblClick(button);
    expect(count('POST', '/v1/auth/register')).toBe(1);
    release();
  });
});

describe('LoginForm (K/02, K/93)', () => {
  async function login() {
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'lan@example.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'pw');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  }

  it('E2: signs in and returns to ?next', async () => {
    search = new URLSearchParams({ next: '/vi/app/settings' });
    renderApp(<LoginForm />, { routes: { ...signedOut, 'POST /v1/auth/login': () => tokenResponse('t') } });
    await login();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/settings'));
  });

  it('a wrong password says so in the copy of the app', async () => {
    renderApp(<LoginForm />, { routes: { ...signedOut, 'POST /v1/auth/login': () => problem(401, 'invalid-credentials') } });
    await login();
    expect(await screen.findByText('Email hoặc mật khẩu chưa đúng.')).toBeInTheDocument();
  });

  it('E8: 403 account-locked shows the K/93 box and keeps what was typed', async () => {
    renderApp(<LoginForm />, { routes: { ...signedOut, 'POST /v1/auth/login': () => problem(403, 'account-locked') } });
    await login();
    expect(await screen.findByText('Tài khoản đang bị khóa')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('lan@example.com');
  });

  it('E4: three 429 refreshes end at the sign-in screen with a line that says why', async () => {
    renderApp(<LoginForm />, { routes: { 'POST /v1/auth/refresh': () => rateLimited(1) }, instantWaits: true });
    expect(await screen.findByText(/quá nhiều yêu cầu/)).toBeInTheDocument();
  });
});

describe('VerifyEmailForm (K/03)', () => {
  async function typeCode(code: string) {
    await userEvent.click(screen.getByRole('textbox', { name: 'Chữ số 1' }));
    await userEvent.keyboard(code);
  }

  it('six digits send POST /v1/auth/verify-email, then on to choosing a language', async () => {
    search = new URLSearchParams({ sent: '1' });
    const { calls } = renderApp(<VerifyEmailForm />, {
      me: makeMe({ native_language: null }),
      routes: { 'POST /v1/auth/verify-email': () => Response.json({}) },
    });
    await typeCode('481205');
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/welcome'));
    expect(calls.find((c) => c.path === '/v1/auth/verify-email')!.body).toEqual({ code: '481205' });
  });

  it('a wrong code says so', async () => {
    search = new URLSearchParams({ sent: '1' });
    renderApp(<VerifyEmailForm />, { routes: { 'POST /v1/auth/verify-email': () => problem(400, 'invalid-otp') } });
    await typeCode('000000');
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh' }));
    expect(await screen.findByText('Mã xác minh chưa đúng hoặc đã hết hạn.')).toBeInTheDocument();
  });

  it('opened from Settings it sends a code itself; resend waits 60 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { count } = renderApp(<VerifyEmailForm />, { routes: { 'POST /v1/auth/otp': () => Response.json({}, { status: 202 }) } });
    await waitFor(() => expect(count('POST', '/v1/auth/otp')).toBe(1));
    expect(await screen.findByText('Gửi lại mã sau 60 giây')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(await screen.findByRole('button', { name: 'Gửi lại mã' })).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('WelcomeLanguage (K/06)', () => {
  it('stores the language, then goes back to ?next under that language', async () => {
    search = new URLSearchParams({ next: '/vi/app/settings' });
    const { calls } = renderApp(<WelcomeLanguage />, { routes: { 'PATCH /v1/me': () => Response.json({}) } });
    await userEvent.click(await screen.findByRole('button', { name: /Ngôn ngữ/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'English' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/app/settings'));
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ native_language: 'en' });
  });
});

describe('Forgot and reset password (K/04, K/05)', () => {
  it('asks for a reset code, then opens the reset screen for that email', async () => {
    const { calls } = renderApp(<ForgotPasswordForm />, { routes: { ...signedOut, 'POST /v1/auth/otp': () => Response.json({}, { status: 202 }) } });
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'lan@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi mã' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/reset-password?email=lan%40example.com'));
    expect(calls.find((c) => c.path === '/v1/auth/otp')!.body).toEqual({ purpose: 'reset_password', email: 'lan@example.com' });
  });

  it('sets the new password, then sends the learner to sign in', async () => {
    search = new URLSearchParams({ email: 'lan@example.com' });
    const { calls } = renderApp(<ResetPasswordForm />, {
      routes: { ...signedOut, 'POST /v1/auth/password/reset': () => new Response(null, { status: 204 }) },
    });
    await userEvent.type(screen.getByRole('textbox', { name: 'Mã 6 số trong email' }), '481205');
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'Bb2@bbbb');
    await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/login?reset=1'));
    expect(calls.find((c) => c.path === '/v1/auth/password/reset')!.body).toEqual({
      email: 'lan@example.com', code: '481205', new_password: 'Bb2@bbbb',
    });
  });
});
