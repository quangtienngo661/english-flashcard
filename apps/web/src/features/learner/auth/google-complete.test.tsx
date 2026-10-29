// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BASE, makeFetch, makeMe, problem, tokenResponse } from '@/app-shell/session/test-support';
import { pickDate, renderApp } from '@/app-ui/test-utils';
import { GoogleComplete } from './GoogleComplete';

const replace = vi.fn();
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => replace(path), isLeaving: () => false }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/vi/app/google/complete',
  useSearchParams: () => new URLSearchParams(),
}));
vi.setConfig({ testTimeout: 20_000 });

const TODAY = '2026-10-29';

// The ticket calls go with a plain global fetch to the API origin (not through the session transport).
function stubApi(routes: Parameters<typeof makeFetch>[0]) {
  process.env.NEXT_PUBLIC_API_BASE_URL = BASE;
  const f = makeFetch(routes);
  vi.stubGlobal('fetch', f.fetch);
  return f;
}

beforeEach(() => { replace.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); delete process.env.NEXT_PUBLIC_API_BASE_URL; });

const FIELDS = async () => {
  await pickDate('Ngày sinh', '2000-05-12');
  await userEvent.click(screen.getByRole('checkbox'));
};

describe('GoogleComplete (design §9.2)', () => {
  it('Review Focus 1: with no first name from Google it asks for first and family name; the button waits for the first name', async () => {
    stubApi({ 'GET /v1/auth/google/complete': () => Response.json({ email: 'minh@gmail.com', needs_name: true }) });
    renderApp(<GoogleComplete today={TODAY} />);
    expect(await screen.findByText(/minh@gmail.com/)).toBeInTheDocument();
    expect(screen.getByLabelText('Tên')).toBeInTheDocument();
    await FIELDS();
    expect(screen.getByRole('button', { name: 'Tạo tài khoản' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Tên'), 'Minh');
    expect(screen.getByRole('button', { name: 'Tạo tài khoản' })).toBeEnabled();
  });

  it('with a name from Google there are no name fields', async () => {
    stubApi({ 'GET /v1/auth/google/complete': () => Response.json({ email: 'minh@gmail.com', needs_name: false }) });
    renderApp(<GoogleComplete today={TODAY} />);
    await screen.findByText(/minh@gmail.com/);
    expect(screen.queryByLabelText('Tên')).not.toBeInTheDocument();
  });

  it('posts birth date, consent, time zone (and the names when asked) with the CSRF header, adopts the session and goes to the app', async () => {
    const f = stubApi({
      'GET /v1/auth/google/complete': () => Response.json({ email: 'minh@gmail.com', needs_name: true }),
      'POST /v1/auth/google/complete': () => tokenResponse('tok-google'),
    });
    const view = renderApp(<GoogleComplete today={TODAY} />, { routes: { 'GET /v1/me': () => Response.json(makeMe({ auth_method: 'google', sign_in_methods: ['google'] })) } });
    await screen.findByText(/minh@gmail.com/);
    await userEvent.type(screen.getByLabelText('Tên'), ' Minh ');
    await userEvent.type(screen.getByLabelText('Họ (không bắt buộc)'), 'Trần');
    await FIELDS();
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app'));
    const post = f.calls.find((c) => c.method === 'POST')!;
    expect(post.body).toEqual({ birth_date: '2000-05-12', accept_terms: true, timezone: expect.any(String), given_name: 'Minh', family_name: 'Trần' });
    expect(post.headers['X-CSRF-Protection']).toBe('1');
    expect(view.store.state.status).toBe('signed-in');
  });

  it('B8E9: under 13 → the register page\'s text and a way back to sign in', async () => {
    stubApi({
      'GET /v1/auth/google/complete': () => Response.json({ email: 'minh@gmail.com', needs_name: false }),
      'POST /v1/auth/google/complete': () => problem(400, 'age-below-minimum'),
    });
    renderApp(<GoogleComplete today={TODAY} />);
    await screen.findByText(/minh@gmail.com/);
    await pickDate('Ngày sinh', '2013-10-29');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await screen.findByRole('link', { name: 'Về trang đăng nhập' })).toHaveAttribute('href', '/vi/app/login');
    expect(replace).not.toHaveBeenCalled();
  });

  it('B8E8 / P19: an expired ticket (401) says so and offers Google again, without signing anyone out or refreshing', async () => {
    const f = stubApi({ 'GET /v1/auth/google/complete': () => problem(401, 'invalid-token') });
    renderApp(<GoogleComplete today={TODAY} />);
    expect(await screen.findByText('Phiên đăng ký đã hết hạn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeInTheDocument();
    expect(f.calls.filter((c) => c.path === '/v1/auth/refresh')).toHaveLength(0);
  });

  it('a ticket that expires while the form is open (401 on the POST) shows the same message', async () => {
    stubApi({
      'GET /v1/auth/google/complete': () => Response.json({ email: 'minh@gmail.com', needs_name: false }),
      'POST /v1/auth/google/complete': () => problem(401, 'invalid-token'),
    });
    renderApp(<GoogleComplete today={TODAY} />);
    await screen.findByText(/minh@gmail.com/);
    await FIELDS();
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await screen.findByText('Phiên đăng ký đã hết hạn')).toBeInTheDocument();
  });

  it('the Google button goes to the API start URL with the locale and next, and does not clear the sign-out flag', async () => {
    stubApi({ 'GET /v1/auth/google/complete': () => problem(401, 'invalid-token') });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
    sessionStorage.setItem('wordmet-web-logout-pending', '1');
    renderApp(<GoogleComplete today={TODAY} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục với Google' }));
    expect(assign).toHaveBeenCalledWith(`${BASE}/v1/auth/google/start?intent=login&locale=vi&next=%2Fvi%2Fapp`);
    expect(sessionStorage.getItem('wordmet-web-logout-pending')).toBe('1');
    sessionStorage.clear();
  });
});
