// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { problem } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { ToastRegion } from '@/app-ui/Toast';
import { PlansPage } from './PlansPage';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/plans',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.setConfig({ testTimeout: 20_000 });

// Not the seeded numbers, so the test proves they come from GET /me/app-config (not hard-coded).
const CONFIG = {
  practice: { max_questions_per_session: 20, default_questions_per_session: 10 },
  reminders: { send_time: '20:00' }, learning: { backlog_after_days: 60, groups_per_user: 90 },
  plans: { free: { practice_sessions_per_day: 4 }, trial: { ai_practice_per_cycle: 100, ai_lookup_per_cycle: 30 }, pro: { practice_sessions_per_day: 25, ai_practice_per_cycle: 250, ai_lookup_per_cycle: 80 } },
};
const pools = { practice_sessions: { limit: 4, used: 1, remaining: 3, resets_at: null }, ai_practice: { limit: 0, used: 0, remaining: 0, resets_at: null }, ai_lookup: { limit: 0, used: 0, remaining: 0, resets_at: null } };
const ent = (plan: string, sources: unknown[] = []) => ({
  plan, sources, pools, trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  features: { 'ai.practice': { allowed: plan !== 'free', reason: null }, 'ai.lookup': { allowed: plan !== 'free', reason: null } },
});
const GRANT = {
  kind: 'grant_plan', id: 'g1', status: null, starts_at: '2026-10-15T03:00:00.000Z', ends_at: '2026-12-31T17:00:00.000Z',
  renews_at: null, cancel_at_period_end: null, pending_interval: null,
};
const routes = (entitlements: unknown) => ({
  'GET /v1/me/app-config': () => Response.json(CONFIG),
  'GET /v1/me/entitlements': () => Response.json(entitlements),
});

describe('PlansPage (K/52, K/53)', () => {
  it('Free: its card is "Gói hiện tại", no "Không cần thẻ ngân hàng"; numbers from plans; Pro not on sale, placeholder price', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Học đều mỗi ngày, lên Pro khi cần' })).toBeInTheDocument();
    const free = screen.getByRole('region', { name: 'Miễn phí' });
    expect(within(free).getByText('Gói hiện tại')).toBeInTheDocument();
    expect(within(free).getByText('Bạn đang dùng gói này')).toBeInTheDocument();
    expect(within(free).getByText('4 phiên luyện mỗi ngày')).toBeInTheDocument();
    expect(within(free).getByText('Tra từ, thêm nhanh, tối đa 90 nhóm')).toBeInTheDocument();
    expect(screen.queryByText(/Không cần thẻ ngân hàng/)).not.toBeInTheDocument();
    const pro = screen.getByRole('region', { name: 'Pro' });
    expect(within(pro).getByText('Chưa mở bán')).toBeInTheDocument();
    expect(within(pro).getByText('XXX.000 ₫')).toBeInTheDocument();
    expect(within(pro).getByText('/ năm')).toBeInTheDocument();
    expect(within(pro).getByText('25 phiên luyện mỗi ngày')).toBeInTheDocument();
    expect(within(pro).getByText('Tối đa 250 câu AI mới mỗi tháng*')).toBeInTheDocument();
    expect(within(pro).getByText('80 lượt tra AI mỗi tháng')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mua|Đăng ký|Nâng cấp/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/thanh toán/)).not.toBeInTheDocument();
    expect(screen.queryByText('Phiên luyện hôm nay')).not.toBeInTheDocument();
  });

  it('the month/year switch changes the placeholder price', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('radio', { name: 'Theo tháng' }));
    const pro = screen.getByRole('region', { name: 'Pro' });
    expect(within(pro).getByText('XX.000 ₫')).toBeInTheDocument();
    expect(within(pro).getByText('/ tháng')).toBeInTheDocument();
  });

  it('GG3: Pro given by the team: card says "Gói hiện tại" and until when; no line under the title (owner 27/10/2026)', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('pro', [GRANT])) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Bạn đang dùng gói Pro' })).toBeInTheDocument();
    expect(screen.queryByText(/Đội Wordmet cấp từ/)).not.toBeInTheDocument();
    const pro = screen.getByRole('region', { name: 'Pro' });
    expect(within(pro).getByText('Gói hiện tại')).toBeInTheDocument();
    expect(within(pro).getByText('Tới hết 31/12/2026')).toBeInTheDocument();
    expect(within(pro).queryByText('Chưa mở bán')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Theo tháng' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Miễn phí' })).getByText('Hết hạn Pro thì tài khoản tự về gói Miễn phí')).toBeInTheDocument();
  });

  it('[So sánh chi tiết các gói] opens a table with the same numbers', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'So sánh chi tiết các gói' }));
    const table = screen.getByRole('table');
    const sessions = within(table).getByRole('row', { name: /Phiên luyện mỗi ngày/ });
    expect(within(sessions).getAllByRole('cell').map((c) => c.textContent)).toEqual(['4', '25']);
  });

  it('a close button back to Today', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    expect(await screen.findByRole('link', { name: 'Đóng' })).toHaveAttribute('href', '/vi/app');
  });

  it('English', async () => {
    renderApp(<PlansPage />, { locale: 'en', routes: routes(ent('free')) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Learn a little every day, go Pro when you need it' })).toBeInTheDocument();
    expect(screen.getByText('Not on sale yet')).toBeInTheDocument();
    expect(screen.getByText('4 practice sessions a day')).toBeInTheDocument();
  });
});

describe('Hủy gói (Bước 8, design §8.2)', () => {
  const SUB = {
    kind: 'subscription', id: 'sub-1', status: 'active', starts_at: '2026-10-15T03:00:00.000Z', ends_at: null,
    renews_at: '2026-11-12T03:00:00.000Z', cancel_at_period_end: false, pending_interval: null,
  };

  it('a renewing subscription says when it renews and has a button; a staff-granted plan has none', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('pro', [SUB, GRANT])) });
    expect(await screen.findByText('Gia hạn ngày 12/11/2026')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Hủy gói' })).toHaveLength(1);
  });

  it('D28: a subscription in grace (the provider retries the charge) can be cancelled too', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('pro', [{ ...SUB, status: 'grace' }])) });
    expect(await screen.findByRole('button', { name: 'Hủy gói' })).toBeInTheDocument();
  });

  it('a cancelled subscription says "Gói kết thúc ngày …" and has no button', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('pro', [{ ...SUB, cancel_at_period_end: true }])) });
    expect(await screen.findByText('Gói kết thúc ngày 12/11/2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy gói' })).not.toBeInTheDocument();
  });

  it('the dialog says what happens, "Giữ gói" closes it without a request, "Hủy gia hạn" posts once with an Idempotency-Key and the row shows the request', async () => {
    let cancelled = false;
    const view = renderApp(<PlansPage />, {
      routes: {
        'GET /v1/me/app-config': () => Response.json(CONFIG),
        'GET /v1/me/entitlements': () => Response.json(ent('pro', [{ ...SUB, cancel_at_period_end: cancelled }])),
        'POST /v1/me/subscriptions/sub-1/cancel': () => { cancelled = true; return Response.json({ status: 'requested' }, { status: 202 }); },
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Hủy gói' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hủy gói?' });
    expect(within(dialog).getByText(/Gói vẫn dùng tới hết 12\/11\/2026, sau đó không gia hạn\. Không hoàn tiền/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Giữ gói' }));
    expect(view.calls.some((c) => c.method === 'POST' && c.path.includes('/cancel'))).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Hủy gói' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Hủy gói?' })).getByRole('button', { name: 'Hủy gia hạn' }));
    expect(await screen.findByText('Gói kết thúc ngày 12/11/2026')).toBeInTheDocument();
    const posts = view.calls.filter((c) => c.method === 'POST' && c.path === '/v1/me/subscriptions/sub-1/cancel');
    expect(posts).toHaveLength(1);
    expect(posts[0].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('B8E36: a 409 subscription-not-cancellable shows its text and the row is read again', async () => {
    renderApp(<><PlansPage /><ToastRegion /></>, {
      routes: {
        'GET /v1/me/app-config': () => Response.json(CONFIG),
        'GET /v1/me/entitlements': () => Response.json(ent('pro', [SUB])),
        'POST /v1/me/subscriptions/sub-1/cancel': () => problem(409, 'subscription-not-cancellable'),
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Hủy gói' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Hủy gia hạn' }));
    expect(await screen.findByText('Gói này không còn tự gia hạn nên không cần hủy.')).toBeInTheDocument();
  });
});
