// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeMe, problem } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { AccountDeleted } from '../auth/AccountDeleted';
import { DeleteAccountPage } from './DeleteAccountPage';

const replace = vi.fn();
let search = '';
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => replace(path), isLeaving: () => false }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/vi/app/settings/delete-account',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.setConfig({ testTimeout: 20_000 });

const pool = { limit: 3, used: 0, remaining: 3, resets_at: null };
const ent = (sources: unknown[] = []) => ({
  plan: 'free', sources, pools: { practice_sessions: pool, ai_practice: pool, ai_lookup: pool }, features: {},
  ai_available: { enabled: true, cap_reached: false }, trial_eligible: false,
});
const SUB = { kind: 'subscription', id: 'sub-1', status: 'active', starts_at: null, ends_at: null, renews_at: '2026-11-12T03:00:00.000Z', cancel_at_period_end: false, pending_interval: null };
const CONFIG = {
  practice: { max_questions_per_session: 20, default_questions_per_session: 10 }, reminders: { send_time: '20:00' },
  learning: { backlog_after_days: 60, groups_per_user: 100 }, account: { transaction_retention_years: 10 },
  plans: { free: { practice_sessions_per_day: 3 }, trial: { ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 }, pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 } },
};
const routes = (sources: unknown[] = [], extra: Record<string, () => Response> = {}) => ({
  'GET /v1/me/entitlements': () => Response.json(ent(sources)), 'GET /v1/me/app-config': () => Response.json(CONFIG), ...extra,
});

beforeEach(() => { replace.mockReset(); search = ''; });

async function fill(view: ReturnType<typeof renderApp>, opts: { email?: string; password?: string; tick?: boolean } = {}) {
  await screen.findByRole('button', { name: 'Xóa vĩnh viễn' });
  if (opts.tick !== false) await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.type(screen.getByLabelText('Gõ lại email của bạn'), opts.email ?? 'lan@example.com');
  if (opts.password !== undefined) await userEvent.type(screen.getByLabelText('Mật khẩu'), opts.password);
  return view;
}

describe('DeleteAccountPage (design §9.4)', () => {
  it('lists what is deleted and what is kept, with the retention years from the settings', async () => {
    renderApp(<DeleteAccountPage />, { routes: routes() });
    expect(await screen.findByText('Những gì bị xóa')).toBeInTheDocument();
    expect(screen.getByText('Hồ sơ thanh toán 10 năm, không kèm tên bạn')).toBeInTheDocument();
    expect(screen.getByText('Báo lỗi bạn đã gửi, không kèm tên')).toBeInTheDocument();
  });

  it.each(['active', 'grace', 'on_hold', 'trialing'])('a %s auto-renewing plan blocks the form and links to the plans page', async (status) => {
    renderApp(<DeleteAccountPage />, { routes: routes([{ ...SUB, status }]) });
    expect(await screen.findByText('Bạn đang có gói tự gia hạn. Hủy gói trước khi xóa tài khoản.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đến trang Gói' })).toHaveAttribute('href', '/vi/app/plans');
    expect(screen.queryByRole('button', { name: 'Xóa vĩnh viễn' })).not.toBeInTheDocument();
  });

  it('a cancelled or staff-granted plan does not block', async () => {
    renderApp(<DeleteAccountPage />, {
      routes: routes([{ ...SUB, cancel_at_period_end: true }, { kind: 'grant_plan', id: 'g1', status: null, starts_at: null, ends_at: null, renews_at: null, cancel_at_period_end: null, pending_interval: null }]),
    });
    expect(await screen.findByRole('button', { name: 'Xóa vĩnh viễn' })).toBeInTheDocument();
  });

  it('the red button waits for the tick, the typed email and the password', async () => {
    renderApp(<DeleteAccountPage />, { routes: routes() });
    const button = await screen.findByRole('button', { name: 'Xóa vĩnh viễn' });
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Gõ lại email của bạn'), 'lan@example.com');
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'pw');
    expect(button).toBeEnabled();
  });

  it('204: posts the confirmation once, ends the session in this tab and goes to the "deleted" page', async () => {
    const view = renderApp(<DeleteAccountPage />, { routes: routes([], { 'POST /v1/me/account/delete': () => new Response(null, { status: 204 }) }) });
    await fill(view, { email: '  lan@example.com ', password: 'Secret-1!' });
    await userEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/account-deleted'));
    const posts = view.calls.filter((c) => c.method === 'POST' && c.path === '/v1/me/account/delete');
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ confirm_email: 'lan@example.com', acknowledged: true, password: 'Secret-1!' });
    expect(view.store.state.status).toBe('signed-out');
  });

  it('202 { status: pending } goes to the "deleted" page with ?pending=1', async () => {
    const view = renderApp(<DeleteAccountPage />, {
      routes: routes([], { 'POST /v1/me/account/delete': () => Response.json({ status: 'pending' }, { status: 202 }) }),
    });
    await fill(view, { password: 'Secret-1!' });
    await userEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/account-deleted?pending=1'));
  });

  it('a wrong email → its text; the session stays and the page does not move', async () => {
    const view = renderApp(<DeleteAccountPage />, { routes: routes([], { 'POST /v1/me/account/delete': () => problem(400, 'confirm-email-mismatch') }) });
    await fill(view, { email: 'other@example.com', password: 'pw' });
    await userEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
    expect(await screen.findByText('Email bạn gõ chưa khớp với email của tài khoản.')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(view.store.state.status).toBe('signed-in');
  });

  it('P3: a wrong password is a 400 invalid-current-password: its text, and the transport neither refreshes nor sends the request again', async () => {
    const view = renderApp(<DeleteAccountPage />, { routes: routes([], { 'POST /v1/me/account/delete': () => problem(400, 'invalid-current-password') }) });
    await fill(view, { password: 'wrong' });
    const refreshesBefore = view.calls.filter((c) => c.path === '/v1/auth/refresh').length;
    await userEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
    expect(await screen.findByText('Mật khẩu hiện tại chưa đúng.')).toBeInTheDocument();
    expect(view.calls.filter((c) => c.method === 'POST' && c.path === '/v1/me/account/delete')).toHaveLength(1);
    expect(view.calls.filter((c) => c.path === '/v1/auth/refresh')).toHaveLength(refreshesBefore);
  });

  describe('a Google-only account', () => {
    const googleOnly = makeMe({ auth_method: 'google', sign_in_methods: ['google'] });

    it('shows "Xác nhận bằng Google" instead of the password field; the button stays off until the Google trip came back with reauth=ok', async () => {
      renderApp(<DeleteAccountPage />, { routes: routes(), me: googleOnly });
      await screen.findByRole('button', { name: 'Xác nhận bằng Google' });
      expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.type(screen.getByLabelText('Gõ lại email của bạn'), 'lan@example.com');
      expect(screen.getByRole('button', { name: 'Xóa vĩnh viễn' })).toBeDisabled();
    });

    it('asks the API for the start URL with the locale and navigates there', async () => {
      const assign = vi.fn();
      Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
      const view = renderApp(<DeleteAccountPage />, {
        routes: routes([], { 'POST /v1/auth/google/reauth': () => Response.json({ start_url: 'http://api.test/v1/auth/google/start?intent=reauth&ticket=t' }) }),
        me: googleOnly,
      });
      await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận bằng Google' }));
      await waitFor(() => expect(assign).toHaveBeenCalledWith('http://api.test/v1/auth/google/start?intent=reauth&ticket=t'));
      expect(view.calls.find((c) => c.path === '/v1/auth/google/reauth')!.body).toEqual({ locale: 'vi' });
    });

    it('reauth=ok enables the red button and the request carries no password', async () => {
      search = 'reauth=ok';
      const view = renderApp(<DeleteAccountPage />, { routes: routes([], { 'POST /v1/me/account/delete': () => new Response(null, { status: 204 }) }), me: googleOnly });
      await screen.findByText('Đã xác nhận bằng Google');
      await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.type(screen.getByLabelText('Gõ lại email của bạn'), 'lan@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
      await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/account-deleted'));
      expect(view.calls.find((c) => c.path === '/v1/me/account/delete')!.body).toEqual({ confirm_email: 'lan@example.com', acknowledged: true });
    });

    it.each([['wrong-account', 'Đây không phải tài khoản Google của bạn. Chọn lại đúng tài khoản.'], ['failed', 'Chưa xác nhận được bằng Google. Thử lại.']])(
      'reauth=%s says so and keeps the button off', async (value, text) => {
        search = `reauth=${value}`;
        renderApp(<DeleteAccountPage />, { routes: routes(), me: googleOnly });
        expect(await screen.findByText(text)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Xóa vĩnh viễn' })).toBeDisabled();
      });

    it('B8E19: a 403 reauth-required shows its text', async () => {
      search = 'reauth=ok';
      const view = renderApp(<DeleteAccountPage />, { routes: routes([], { 'POST /v1/me/account/delete': () => problem(403, 'reauth-required') }), me: googleOnly });
      await screen.findByText('Đã xác nhận bằng Google');
      await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.type(screen.getByLabelText('Gõ lại email của bạn'), 'lan@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
      expect(await screen.findByText('Hãy xác nhận lại bằng tài khoản Google của bạn trước khi xóa.')).toBeInTheDocument();
      void view;
    });

    it('B8E19 (final review I3): after reauth-required the Google button is usable again and the red button is off', async () => {
      search = 'reauth=ok';
      renderApp(<DeleteAccountPage />, { routes: routes([], { 'POST /v1/me/account/delete': () => problem(403, 'reauth-required') }), me: googleOnly });
      await screen.findByText('Đã xác nhận bằng Google');
      await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.type(screen.getByLabelText('Gõ lại email của bạn'), 'lan@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
      await screen.findByText('Hãy xác nhận lại bằng tài khoản Google của bạn trước khi xóa.');
      expect(screen.getByRole('button', { name: 'Xác nhận bằng Google' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Xóa vĩnh viễn' })).toBeDisabled();
    });
  });
});

describe('AccountDeleted', () => {
  it('says the account was deleted, and links to the login page', async () => {
    renderApp(<AccountDeleted />);
    expect(await screen.findByRole('heading', { name: 'Tài khoản của bạn đã được xóa.' })).toBeInTheDocument();
    expect(within(document.body).getByRole('link', { name: 'Về trang đăng nhập' })).toHaveAttribute('href', '/vi/app/login');
  });

  it('?pending=1 says it is being finished', async () => {
    search = 'pending=1';
    renderApp(<AccountDeleted />);
    expect(await screen.findByRole('heading', { name: 'Tài khoản đang được xóa' })).toBeInTheDocument();
    expect(screen.getByText(/mất tới một giờ/)).toBeInTheDocument();
  });
});
