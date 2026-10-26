// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { clearPendingEmail, readPendingEmail, readPendingPassword, setPendingPassword, writePendingEmail } from '@/app-shell/session/pending-email';
import { makeMe, problem, rateLimited, tokenResponse } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { AuthGate } from './AuthGate';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { VerifyEmailForm } from './VerifyEmailForm';
import { WelcomeLanguage } from './WelcomeLanguage';

const replace = vi.fn();
const hardReplace = vi.fn();
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path), isLeaving: () => false }));
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
  hardReplace.mockReset();
  sessionStorage.clear();
  clearPendingEmail();
  search = new URLSearchParams();
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    timeZone: 'Asia/Ho_Chi_Minh',
  } as Intl.ResolvedDateTimeFormatOptions);
});
afterEach(() => {
  clearPendingEmail();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function fillRegister(birth = '14/5/2008', email = 'lan@example.com') {
  await userEvent.type(screen.getByRole('textbox', { name: 'Tên' }), 'Lan');
  await userEvent.type(screen.getByRole('textbox', { name: 'Họ (không bắt buộc)' }), 'Nguyễn');
  await userEvent.type(screen.getByRole('textbox', { name: 'Ngày sinh' }), birth);
  await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), email);
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Aa1!aaaa');
}

describe('RegisterForm (K/01, K/01b)', () => {
  it('register -> writes the pending email and keeps the password in memory -> client-side navigation to /vi/app/verify-email', async () => {
    const { calls, store } = renderApp(<RegisterForm today={TODAY} />, {
      routes: { ...signedOut, 'POST /v1/auth/register': () => Response.json({ email: 'lan@example.com', verification_required: true }, { status: 201 }) },
    });
    await fillRegister(undefined, 'Lan@Example.COM');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/verify-email'));
    expect(hardReplace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('wordmet-web.pending-email')).toBe('lan@example.com');
    expect(sessionStorage.length).toBe(1);
    expect(readPendingPassword()).toBe('Aa1!aaaa');
    expect(store.state.status).toBe('signed-out');
    const destination = new URL(replace.mock.calls[0][0], 'http://localhost');
    expect(destination.search).toBe('');
    expect(decodeURIComponent(destination.href)).not.toContain('lan@example.com');
    expect(decodeURIComponent(destination.href)).not.toContain('Aa1!aaaa');
    expect(calls.find((c) => c.path === '/v1/auth/register')!.body).toEqual({
      given_name: 'Lan', family_name: 'Nguyễn', birth_date: '2008-05-14', email: 'Lan@Example.COM', password: 'Aa1!aaaa',
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

  it('register 409 email-taken -> the new hint with Forgot password', async () => {
    renderApp(<RegisterForm today={TODAY} />, { routes: { ...signedOut, 'POST /v1/auth/register': () => problem(409, 'email-taken') } });
    await fillRegister();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    const hint = 'Email này đã có tài khoản. Nếu là email của bạn, dùng Quên mật khẩu.';
    expect(await screen.findByText(hint)).toBeInTheDocument();
    const email = screen.getByRole('textbox', { name: 'Email' });
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(hint);
    expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute('href', '/vi/app/forgot-password');
    expect(replace).not.toHaveBeenCalled();
    expect(readPendingPassword()).toBeNull();
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
        'POST /v1/auth/register': () => new Promise<Response>((r) => (release = () => r(Response.json({ email: 'lan@example.com', verification_required: true }, { status: 201 })))),
      },
    });
    await fillRegister();
    await userEvent.click(screen.getByRole('checkbox'));
    const button = screen.getByRole('button', { name: 'Tạo tài khoản' });
    await userEvent.dblClick(button);
    expect(count('POST', '/v1/auth/register')).toBe(1);
    await act(async () => release());
  });
});

describe('LoginForm (K/02, K/93)', () => {
  async function login(email = 'lan@example.com') {
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), email);
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'pw');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  }

  it('E2: signs in and returns to ?next', async () => {
    search = new URLSearchParams({ next: '/vi/app/settings' });
    renderApp(<LoginForm />, { routes: { ...signedOut, 'POST /v1/auth/login': () => tokenResponse('t') } });
    await login();
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/settings'));
  });

  it.each([null, '/vi/app/groups/deck-1?sort=new&view=all'])('login 403 email-not-verified -> pending email + in-memory password, client-side verification redirect (next=%s)', async (next) => {
    if (next !== null) search = new URLSearchParams({ next });
    const { store } = renderApp(<LoginForm />, { routes: { ...signedOut, 'POST /v1/auth/login': () => problem(403, 'email-not-verified') } });
    await login('  Lan@Example.COM  ');
    const destination = `/vi/app/verify-email?reason=login${next === null ? '' : `&next=${encodeURIComponent(next)}`}`;
    await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
    expect(hardReplace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('wordmet-web.pending-email')).toBe('Lan@Example.COM');
    expect(sessionStorage.length).toBe(1);
    expect(readPendingPassword()).toBe('pw');
    expect(store.state.status).toBe('signed-out');
    expect(decodeURIComponent(destination)).not.toContain('Lan@Example.COM');
    expect(decodeURIComponent(destination)).not.toContain('pw');
    expect(new URL(destination, 'http://localhost').searchParams.get('next')).toBe(next);
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

  it('E3: ?reason=expired after a full reload still says the session ended', async () => {
    search = new URLSearchParams({ reason: 'expired' });
    renderApp(<LoginForm />, { routes: signedOut });
    expect(await screen.findByText('Bạn cần đăng nhập lại.')).toBeInTheDocument();
  });

  it('E4: three 429 refreshes end at the sign-in screen with a line that says why', async () => {
    renderApp(<LoginForm />, { routes: { 'POST /v1/auth/refresh': () => rateLimited(1) }, instantWaits: true });
    expect(await screen.findByText(/quá nhiều yêu cầu/)).toBeInTheDocument();
  });
});

describe('VerifyEmailForm (K/03)', () => {
  const wrongCode = 'Mã hoặc mật khẩu không đúng, hoặc mã đã hết hạn. Nếu email đã được xác nhận, hãy đăng nhập.';

  beforeEach(() => {
    writePendingEmail('lan@example.com');
    setPendingPassword('Aa1!aaaa');
  });

  async function typeCode(code: string) {
    await userEvent.click(screen.getByRole('textbox', { name: 'Chữ số 1' }));
    await userEvent.keyboard(code);
  }

  function setup(options: Parameters<typeof renderApp>[1] = {}) {
    return renderApp(<AuthGate><VerifyEmailForm /></AuthGate>, { ...options, routes: { ...signedOut, ...options.routes } });
  }

  it('reads the pending email and shows it without an email or password field', async () => {
    const { store } = setup();
    expect(await screen.findByText('Mã đã gửi tới lan@example.com. Mã có hiệu lực 10 phút.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Email' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
    await waitFor(() => expect(store.state.status).toBe('signed-out'));
  });

  it('A13-15: no pending email shows an email field; resend needs an email', async () => {
    clearPendingEmail();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { calls } = setup({ routes: {
      'POST /v1/auth/otp': () => Response.json({}, { status: 202 }),
      'POST /v1/auth/verify-email': () => tokenResponse('verified'),
    } });
    expect(await screen.findByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(screen.getByRole('button', { name: 'Gửi lại mã' })).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'new@example.com');
    expect(screen.getByRole('button', { name: 'Gửi lại mã' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lại mã' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/v1/auth/otp')!.body).toEqual({ purpose: 'verify_email', email: 'new@example.com' }));
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'typed-password');
    await typeCode('481205');
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh' }));
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app'));
    expect(calls.find((c) => c.path === '/v1/auth/verify-email')!.body).toMatchObject({ email: 'new@example.com', password: 'typed-password' });
  });

  it.each([
    [null, null, '/vi/app/welcome'],
    [null, '/vi/app/settings', '/vi/app/welcome?next=%2Fvi%2Fapp%2Fsettings'],
    ['vi', null, '/vi/app'],
    ['vi', '/vi/app/settings', '/vi/app/settings'],
    ['vi', 'https://evil.test', '/vi/app'],
  ] as const)('submit signs in with the memory password, clears pending data and navigates once (language=%s, next=%s)', async (language, next, destination) => {
    if (next) search = new URLSearchParams({ next });
    const { calls, store } = setup({ me: makeMe({ native_language: language }), routes: { 'POST /v1/auth/verify-email': () => tokenResponse('verified') } });
    const verify = vi.spyOn(store, 'verifyEmail');
    await typeCode('481205');
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh' }));
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith(destination));
    expect(hardReplace).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith('lan@example.com', '481205', 'Aa1!aaaa');
    expect(calls.find((c) => c.path === '/v1/auth/verify-email')!.body).toMatchObject({ email: 'lan@example.com', code: '481205', password: 'Aa1!aaaa', client: 'web' });
    expect(readPendingEmail()).toBeNull();
    expect(readPendingPassword()).toBeNull();
  });

  it('A13-12b: after a reload the password field supplies the password', async () => {
    clearPendingEmail();
    writePendingEmail('lan@example.com');
    const { store } = setup({ routes: { 'POST /v1/auth/verify-email': () => tokenResponse('verified') } });
    const verify = vi.spyOn(store, 'verifyEmail');
    await userEvent.type(await screen.findByLabelText('Mật khẩu'), 'reloaded-password');
    await typeCode('481205');
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh' }));
    await waitFor(() => expect(verify).toHaveBeenCalledWith('lan@example.com', '481205', 'reloaded-password'));
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app'));
  });

  it('Review Focus 3: submitting an old code after another tab verified shows invalid-otp and stays on the page', async () => {
    setup({ routes: { 'POST /v1/auth/verify-email': () => problem(400, 'invalid-otp') } });
    await typeCode('000000');
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh' }));
    expect(await screen.findByText(wrongCode)).toBeInTheDocument();
    expect(hardReplace).not.toHaveBeenCalled();
    expect(readPendingEmail()).toBe('lan@example.com');
  });

  it.each([
    ['vi', 'Bạn đã nhập sai mã quá nhiều lần. Thử lại sau 2 phút.'],
    ['en', 'Too many wrong codes. Try again in 2 minutes.'],
  ] as const)('429 shows the page-specific wait in %s', async (locale, text) => {
    setup({ locale, routes: { 'POST /v1/auth/verify-email': () => rateLimited(75) } });
    await userEvent.click(screen.getByRole('textbox', { name: locale === 'vi' ? 'Chữ số 1' : 'Digit 1' }));
    await userEvent.keyboard('000000');
    await userEvent.click(screen.getByRole('button', { name: locale === 'vi' ? 'Xác minh' : 'Verify' }));
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(hardReplace).not.toHaveBeenCalled();
  });

  it('other errors use the existing error message and stay on the page', async () => {
    setup({ routes: { 'POST /v1/auth/verify-email': () => problem(503, 'mail-unavailable') } });
    await typeCode('000000');
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/./);
    expect(hardReplace).not.toHaveBeenCalled();
  });

  it('resend posts the email without a token, once, and restarts the 60 s countdown; no auto-send on open', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let release!: () => void;
    const { count, calls, store } = setup({ routes: {
      'POST /v1/auth/otp': () => new Promise<Response>((r) => (release = () => r(Response.json({}, { status: 202 })))),
    } });
    await waitFor(() => expect(store.state.status).toBe('signed-out'));
    expect(count('POST', '/v1/auth/otp')).toBe(0);
    expect(screen.getByText('Gửi lại mã sau 60 giây')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(61_000));
    await userEvent.dblClick(await screen.findByRole('button', { name: 'Gửi lại mã' }));
    expect(count('POST', '/v1/auth/otp')).toBe(1);
    const otp = calls.find((c) => c.path === '/v1/auth/otp')!;
    expect(otp.body).toEqual({ purpose: 'verify_email', email: 'lan@example.com' });
    expect(otp.headers.Authorization).toBeUndefined();
    await act(async () => release());
    expect(screen.getByText('Gửi lại mã sau 60 giây')).toBeInTheDocument();
  });

  it('A13-16: the wrong-email link clears pending data and goes to register', async () => {
    setup();
    await userEvent.click(await screen.findByRole('link', { name: 'Gõ nhầm email? Đăng ký bằng email khác' }));
    expect(readPendingEmail()).toBeNull();
    expect(readPendingPassword()).toBeNull();
    expect(replace).toHaveBeenCalledWith('/vi/app/register');
  });

  it('opened while signed in: AuthGate sends to the app once', async () => {
    setup({ routes: { 'POST /v1/auth/refresh': () => tokenResponse('already-in') } });
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app'));
    expect(hardReplace).toHaveBeenCalledTimes(1);
  });

  it.each([null, 'vi'] as const)('another tab signs in: the bootstrap transition sends the code page into the app (language=%s)', async (language) => {
    search = new URLSearchParams({ next: '/vi/app/settings' });
    let otherTabSignedIn = false;
    const { store } = setup({ me: makeMe({ native_language: language }), routes: { 'POST /v1/auth/refresh': () => otherTabSignedIn ? tokenResponse('other-tab') : problem(401, 'invalid-token') } });
    await waitFor(() => expect(store.state.status).toBe('signed-out'));
    otherTabSignedIn = true;
    // BroadcastChannel login calls bootstrap on this signed-out store.
    await act(() => store.bootstrap());
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith(language ? '/vi/app/settings' : '/vi/app/welcome?next=%2Fvi%2Fapp%2Fsettings'));
    expect(hardReplace).toHaveBeenCalledTimes(1);
  });

  it('A13-19: double submit sends one verify call', async () => {
    let release!: () => void;
    const { store, count } = setup({ routes: { 'POST /v1/auth/verify-email': () => new Promise<Response>((r) => (release = () => r(tokenResponse('verified')))) } });
    const verify = vi.spyOn(store, 'verifyEmail');
    await typeCode('481205');
    const form = screen.getByRole('button', { name: 'Xác minh' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(count('POST', '/v1/auth/verify-email')).toBe(1);
    await act(async () => release());
    await waitFor(() => expect(hardReplace).toHaveBeenCalledTimes(1));
  });

  it('Strict Mode preserves the memory password in state; leaving clears the module password', async () => {
    const { store, unmount } = renderApp(<StrictMode><VerifyEmailForm /></StrictMode>, { routes: { ...signedOut, 'POST /v1/auth/verify-email': () => problem(400, 'invalid-otp') } });
    const verify = vi.spyOn(store, 'verifyEmail');
    expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
    await typeCode('481205');
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh' }));
    expect(await screen.findByText(wrongCode)).toBeInTheDocument();
    expect(verify).toHaveBeenCalledWith('lan@example.com', '481205', 'Aa1!aaaa');
    unmount();
    expect(readPendingPassword()).toBeNull();
    expect(readPendingEmail()).toBe('lan@example.com');
  });

  it('?reason=login shows the confirm-email line', async () => {
    search = new URLSearchParams({ reason: 'login' });
    setup();
    expect(await screen.findByText('Bạn cần xác nhận email trước khi vào app. Mã đã được gửi tới lan@example.com.')).toBeInTheDocument();
  });

  it('keeps paste and backspace navigation in the six code boxes', async () => {
    setup();
    await userEvent.click(screen.getByRole('textbox', { name: 'Chữ số 1' }));
    await userEvent.paste('48 1205');
    expect(screen.getAllByRole('textbox').map((box) => (box as HTMLInputElement).value).join('')).toBe('481205');
    const last = screen.getByRole('textbox', { name: 'Chữ số 6' });
    expect(last).toHaveFocus();
    await userEvent.keyboard('{Backspace}{Backspace}');
    expect(screen.getByRole('textbox', { name: 'Chữ số 5' })).toHaveFocus();
  });
});

describe('WelcomeLanguage (K/06)', () => {
  it('stores the language, then goes back to ?next under that language', async () => {
    search = new URLSearchParams({ next: '/vi/app/settings' });
    const { calls } = renderApp(<WelcomeLanguage />, { routes: { 'PATCH /v1/me': () => Response.json({}) } });
    await userEvent.click(await screen.findByRole('button', { name: /Ngôn ngữ/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'English' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/en/app/settings'));
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ native_language: 'en' });
  });
});

describe('Forgot and reset password (K/04, K/05)', () => {
  it('asks for a reset code, then opens the reset screen for that email', async () => {
    const { calls } = renderApp(<ForgotPasswordForm />, { routes: { ...signedOut, 'POST /v1/auth/otp': () => Response.json({}, { status: 202 }) } });
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'lan@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi mã' }));
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/reset-password?email=lan%40example.com'));
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
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/login?reset=1'));
    expect(calls.find((c) => c.path === '/v1/auth/password/reset')!.body).toEqual({
      email: 'lan@example.com', code: '481205', new_password: 'Bb2@bbbb',
    });
  });
});
