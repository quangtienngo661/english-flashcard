// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
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
const PRICES = { '1': 81000, '3': 205000, '12': 610000 };
const config = (prices: Record<string, number> = PRICES) => ({
  practice: { max_questions_per_session: 20, default_questions_per_session: 10 },
  reminders: { send_time: '20:00' }, learning: { backlog_after_days: 60, groups_per_user: 90 },
  plans: {
    free: { practice_sessions_per_day: 4, ai_practice_per_cycle: 12, ai_lookup_per_cycle: 4 }, trial: { ai_practice_per_cycle: 100, ai_lookup_per_cycle: 30 },
    pro: { practice_sessions_per_day: 25, ai_practice_per_cycle: 250, ai_lookup_per_cycle: 80, prices },
  },
});
const CONFIG = config();
const pools = { practice_sessions: { limit: 4, used: 1, remaining: 3, resets_at: null }, ai_practice: { limit: 0, used: 0, remaining: 0, resets_at: null }, ai_lookup: { limit: 0, used: 0, remaining: 0, resets_at: null } };
const ent = (plan: string, sources: unknown[] = [], extra: Record<string, unknown> = {}) => ({
  plan, sources, pools, trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  features: { 'ai.practice': { allowed: plan !== 'free', reason: null }, 'ai.lookup': { allowed: plan !== 'free', reason: null } }, ...extra,
});
const GRANT = {
  kind: 'grant_plan', id: 'g1', status: null, starts_at: '2026-10-15T03:00:00.000Z', ends_at: '2026-12-31T17:00:00.000Z',
  renews_at: null, cancel_at_period_end: null, pending_interval: null,
};
const PREPAID = {
  kind: 'prepaid', id: 'pp1', status: null, starts_at: '2026-11-05T03:00:00.000Z', ends_at: '2026-12-05T17:00:00.000Z',
  renews_at: null, cancel_at_period_end: null, pending_interval: null,
};
const CREATED = () => Response.json({ order_id: 'o-1', checkout_url: 'https://pay.example/checkout?order=1' }, { status: 201 });
const withFree = (ai_practice_per_cycle: number, ai_lookup_per_cycle: number) => ({
  ...CONFIG, plans: { ...CONFIG.plans, free: { ...CONFIG.plans.free, ai_practice_per_cycle, ai_lookup_per_cycle } },
});
const routes = (entitlements: unknown, extra: Record<string, () => Response> = {}, appConfig: unknown = CONFIG) => ({
  'GET /v1/me/app-config': () => Response.json(appConfig),
  'GET /v1/me/entitlements': () => Response.json(entitlements),
  ...extra,
});
// Intl puts a no-break space before "₫".
const dong = (amount: number) => new RegExp(`^${amount.toLocaleString('vi-VN')}\\s₫$`);

let assign: ReturnType<typeof vi.fn>;
beforeEach(() => {
  assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
});

describe('PlansPage (K/52, K/53; launch prep B design §3.8)', () => {
  it('Free: its card is "Gói hiện tại", no "Không cần thẻ ngân hàng"; numbers from plans; Pro has three periods and a Buy button, no "Chưa mở bán", no placeholder price', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Học đều mỗi ngày, lên Pro khi cần' })).toBeInTheDocument();
    const free = screen.getByRole('region', { name: 'Miễn phí' });
    expect(within(free).getByText('Gói hiện tại')).toBeInTheDocument();
    expect(within(free).getByText('Bạn đang dùng gói này')).toBeInTheDocument();
    expect(within(free).getByText('4 phiên luyện mỗi ngày')).toBeInTheDocument();
    expect(within(free).getByText('Tra từ, thêm nhanh, tối đa 90 nhóm')).toBeInTheDocument();
    // LA3#1: the Free card names the monthly AI allowance, with the numbers of the config, and no longer says AI needs Pro.
    expect(within(free).getByText('12 câu AI và 4 lượt tra AI mỗi tháng')).toBeInTheDocument();
    expect(within(free).queryByText('Câu AI và tra bằng AI: cần gói Pro')).not.toBeInTheDocument();
    expect(screen.queryByText(/Không cần thẻ ngân hàng/)).not.toBeInTheDocument();
    const pro = screen.getByRole('region', { name: 'Pro' });
    expect(within(pro).queryByText('Chưa mở bán')).not.toBeInTheDocument();
    expect(screen.queryByText(/XX\.000/)).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '1 tháng' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '3 tháng' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '12 tháng' })).toBeChecked();
    expect(within(pro).getByText(dong(610000))).toBeInTheDocument();
    expect(within(pro).getByRole('button', { name: 'Mua' })).toBeInTheDocument();
    expect(within(pro).getByText('25 phiên luyện mỗi ngày')).toBeInTheDocument();
    expect(within(pro).getByText('Tối đa 250 câu AI mới mỗi tháng*')).toBeInTheDocument();
    expect(within(pro).getByText('80 lượt tra AI mỗi tháng')).toBeInTheDocument();
    expect(screen.queryByText('Phiên luyện hôm nay')).not.toBeInTheDocument();
  });

  it('the price follows the chosen period, from plans.pro.prices', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    await screen.findByRole('heading', { level: 1 });
    const pro = screen.getByRole('region', { name: 'Pro' });
    await userEvent.click(screen.getByRole('radio', { name: '3 tháng' }));
    expect(within(pro).getByText(dong(205000))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: '1 tháng' }));
    expect(within(pro).getByText(dong(81000))).toBeInTheDocument();
  });

  it('right above the Buy button: no automatic renewal or refund, the support email, and a link to the Terms (owner 05/11/2026)', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    const pro = await screen.findByRole('region', { name: 'Pro' });
    const sentence = within(pro).getByText(/^Gói không tự gia hạn\. Không hoàn tiền tự động; cần hỗ trợ, liên hệ/);
    expect(within(pro).getByRole('link', { name: 'hello@wordmet.com' })).toHaveAttribute('href', 'mailto:hello@wordmet.com');
    expect(within(pro).queryByText(/Kỳ mới bắt đầu từ/)).not.toBeInTheDocument();
    const buy = within(pro).getByRole('button', { name: 'Mua' });
    expect(sentence.compareDocumentPosition(buy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(pro).getByRole('link', { name: 'Điều khoản sử dụng' })).toHaveAttribute('href', '/vi/terms');
  });

  it('Buy posts the period and the price the learner saw with an Idempotency-Key, then goes to the payment page (window.location.assign)', async () => {
    const view = renderApp(<PlansPage />, { routes: routes(ent('free'), { 'POST /v1/me/orders': CREATED }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Mua' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/checkout?order=1'));
    const posts = view.calls.filter((c) => c.method === 'POST' && c.path === '/v1/me/orders');
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ period_months: 12, expected_amount: 610000, locale: 'vi' });
    expect(posts[0].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('another period → that period and its price; a double press is one order', async () => {
    const view = renderApp(<PlansPage />, { routes: routes(ent('free'), { 'POST /v1/me/orders': CREATED }) });
    await userEvent.click(await screen.findByRole('radio', { name: '3 tháng' }));
    await userEvent.dblClick(screen.getByRole('button', { name: 'Mua' }));
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    const posts = view.calls.filter((c) => c.method === 'POST' && c.path === '/v1/me/orders');
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ period_months: 3, expected_amount: 205000, locale: 'vi' });
  });

  it('LB1E28: 409 price-changed → the prices are read again, "Giá vừa đổi, xem lại trước khi mua", nothing opens, and the next press uses the new price', async () => {
    let prices = PRICES;
    const view = renderApp(<PlansPage />, {
      routes: {
        'GET /v1/me/app-config': () => Response.json(config(prices)),
        'GET /v1/me/entitlements': () => Response.json(ent('free')),
        'POST /v1/me/orders': () => {
          if (prices === PRICES) {
            prices = { ...PRICES, '12': 620000 };
            return problem(409, 'price-changed', { current_amount: 620000 });
          }
          return CREATED();
        },
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Mua' }));
    expect(await screen.findByText('Giá vừa đổi, xem lại trước khi mua')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    const pro = screen.getByRole('region', { name: 'Pro' });
    expect(await within(pro).findByText(dong(620000))).toBeInTheDocument();
    await userEvent.click(within(pro).getByRole('button', { name: 'Mua' }));
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    const bodies = view.calls.filter((c) => c.method === 'POST' && c.path === '/v1/me/orders').map((c) => c.body);
    expect(bodies).toEqual([
      { period_months: 12, expected_amount: 610000, locale: 'vi' }, { period_months: 12, expected_amount: 620000, locale: 'vi' },
    ]);
  });

  it('503 → "Chưa tạo được đơn. Thử lại sau ít phút." and the button works again', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free'), { 'POST /v1/me/orders': () => problem(503, 'provider-unavailable') }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Mua' }));
    expect(await screen.findByText('Chưa tạo được đơn. Thử lại sau ít phút.')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Mua' })).toBeEnabled();
  });

  it('GG3: Pro given by the team: card says "Gói hiện tại" and until when (pro_until); no line under the title (owner 27/10/2026)', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('pro', [GRANT], { pro_until: GRANT.ends_at })) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Bạn đang dùng gói Pro' })).toBeInTheDocument();
    expect(screen.queryByText(/Đội Wordmet cấp từ/)).not.toBeInTheDocument();
    const pro = screen.getByRole('region', { name: 'Pro' });
    expect(within(pro).getByText('Gói hiện tại')).toBeInTheDocument();
    expect(within(pro).getByText('Tới hết 31/12/2026')).toBeInTheDocument();
    expect(within(pro).queryByText('Chưa mở bán')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Miễn phí' })).getByText('Hết hạn Pro thì tài khoản tự về gói Miễn phí')).toBeInTheDocument();
  });

  it('LB1A5: Pro through prepaid periods: "Tới hết" is pro_until (the end of the chain), the next periods are listed, Buy is still there (a following period), no Hủy gói', async () => {
    renderApp(<PlansPage />, {
      routes: routes(ent('pro', [PREPAID], {
        pro_until: '2027-12-05T17:00:00.000Z',
        upcoming_periods: [{ id: 'pp2', starts_at: '2026-12-05T17:00:00.000Z', ends_at: '2027-12-05T17:00:00.000Z' }],
      })),
    });
    const pro = await screen.findByRole('region', { name: 'Pro' });
    expect(within(pro).getByText('Gói hiện tại')).toBeInTheDocument();
    expect(within(pro).getByText('Tới hết 5/12/2027')).toBeInTheDocument();
    expect(within(pro).getByText('Kỳ tiếp theo: 6/12/2026 – 5/12/2027')).toBeInTheDocument();
    // The running period is 1 month and 12 is chosen: a longer period is an upgrade, which starts where the chain ends.
    expect(within(pro).getByRole('button', { name: 'Nâng cấp lên 12 tháng' })).toBeEnabled();
    expect(within(pro).getByText('Kỳ mới bắt đầu từ 6/12/2027, khi kỳ hiện tại kết thúc.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy gói' })).not.toBeInTheDocument();
    expect(screen.queryByText('Gói đang đăng ký')).not.toBeInTheDocument();
  });

  describe('the button follows the running prepaid period (owner 05/11/2026)', () => {
    const THREE = { ...PREPAID, id: 'pp3m', starts_at: '2026-11-05T03:00:00.000Z', ends_at: '2027-02-05T17:00:00.000Z' };
    const onPeriod = (source: unknown, pro_until: string) => routes(ent('pro', [source], { pro_until, upcoming_periods: [] }));

    it('the same length as the running period: the button is locked and says so; nothing can be ordered', async () => {
      const view = renderApp(<PlansPage />, { routes: onPeriod(PREPAID, PREPAID.ends_at) });
      await userEvent.click(await screen.findByRole('radio', { name: '1 tháng' }));
      const pro = screen.getByRole('region', { name: 'Pro' });
      expect(within(pro).getByRole('button', { name: 'Đang dùng kỳ này' })).toBeDisabled();
      expect(within(pro).queryByRole('button', { name: 'Mua' })).not.toBeInTheDocument();
      expect(within(pro).queryByText(/Kỳ mới bắt đầu từ/)).not.toBeInTheDocument();
      await userEvent.click(within(pro).getByRole('button', { name: 'Đang dùng kỳ này' }));
      expect(view.calls.filter((c) => c.path === '/v1/me/orders')).toEqual([]);
    });

    it('a longer period: "Nâng cấp lên 3 tháng", and the new period starts when the running one ends', async () => {
      renderApp(<PlansPage />, { routes: onPeriod(PREPAID, PREPAID.ends_at) });
      await userEvent.click(await screen.findByRole('radio', { name: '3 tháng' }));
      const pro = screen.getByRole('region', { name: 'Pro' });
      expect(within(pro).getByRole('button', { name: 'Nâng cấp lên 3 tháng' })).toBeEnabled();
      expect(within(pro).getByText('Kỳ mới bắt đầu từ 6/12/2026, khi kỳ hiện tại kết thúc.')).toBeInTheDocument();
    });

    it('a shorter period than the running 3 months: plain "Mua", with the same start line', async () => {
      renderApp(<PlansPage />, { routes: onPeriod(THREE, THREE.ends_at) });
      await userEvent.click(await screen.findByRole('radio', { name: '1 tháng' }));
      const pro = screen.getByRole('region', { name: 'Pro' });
      expect(within(pro).getByRole('button', { name: 'Mua' })).toBeEnabled();
      expect(within(pro).getByText('Kỳ mới bắt đầu từ 6/2/2027, khi kỳ hiện tại kết thúc.')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('radio', { name: '3 tháng' }));
      expect(within(pro).getByRole('button', { name: 'Đang dùng kỳ này' })).toBeDisabled();
    });

    it('Pro given by the team has no period length: every period is "Mua", starting where the grant ends', async () => {
      renderApp(<PlansPage />, { routes: onPeriod(GRANT, GRANT.ends_at) });
      const pro = await screen.findByRole('region', { name: 'Pro' });
      for (const name of ['1 tháng', '3 tháng', '12 tháng']) {
        await userEvent.click(screen.getByRole('radio', { name }));
        expect(within(pro).getByRole('button', { name: 'Mua' })).toBeEnabled();
      }
      expect(within(pro).getByText('Kỳ mới bắt đầu từ 1/1/2027, khi kỳ hiện tại kết thúc.')).toBeInTheDocument();
    });
  });

  it('a second and third upcoming period are listed after the first', async () => {
    renderApp(<PlansPage />, {
      routes: routes(ent('pro', [PREPAID], {
        pro_until: '2028-03-05T17:00:00.000Z',
        upcoming_periods: [
          { id: 'pp2', starts_at: '2026-12-05T17:00:00.000Z', ends_at: '2027-12-05T17:00:00.000Z' },
          { id: 'pp3', starts_at: '2027-12-05T17:00:00.000Z', ends_at: '2028-03-05T17:00:00.000Z' },
        ],
      })),
    });
    const pro = await screen.findByRole('region', { name: 'Pro' });
    expect(within(pro).getByText('Kỳ tiếp theo: 6/12/2026 – 5/12/2027')).toBeInTheDocument();
    expect(within(pro).getByText('Sau đó: 6/12/2027 – 5/3/2028')).toBeInTheDocument();
  });

  it('[So sánh chi tiết các gói] opens a table with the same numbers', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'So sánh chi tiết các gói' }));
    const table = screen.getByRole('table');
    const sessions = within(table).getByRole('row', { name: /Phiên luyện mỗi ngày/ });
    expect(within(sessions).getAllByRole('cell').map((c) => c.textContent)).toEqual(['4', '25']);
    // The AI rows: Free has its numbers too, not a dash.
    expect(within(within(table).getByRole('row', { name: /Câu AI mới mỗi tháng/ })).getAllByRole('cell').map((c) => c.textContent)).toEqual(['12', '250']);
    expect(within(within(table).getByRole('row', { name: /Lượt tra AI mỗi tháng/ })).getAllByRole('cell').map((c) => c.textContent)).toEqual(['4', '80']);
  });

  it('LA3#11: when the config gives Free no AI (both numbers 0) the card and the table say so, as before', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free'), {}, withFree(0, 0)) });
    const free = await screen.findByRole('region', { name: 'Miễn phí' });
    expect(within(free).getByText('Câu AI và tra bằng AI: cần gói Pro')).toBeInTheDocument();
    expect(within(free).queryByText(/câu AI và \d+ lượt tra AI mỗi tháng/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'So sánh chi tiết các gói' }));
    const table = screen.getByRole('table');
    expect(within(within(table).getByRole('row', { name: /Câu AI mới mỗi tháng/ })).getAllByRole('cell').map((c) => c.textContent)).toEqual(['—', '250']);
    expect(within(within(table).getByRole('row', { name: /Lượt tra AI mỗi tháng/ })).getAllByRole('cell').map((c) => c.textContent)).toEqual(['—', '80']);
  });

  it('LA3#13: only one of the two Free numbers is 0 → the card names both and the table shows the same 0 (a dash means no AI at all)', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free'), {}, withFree(15, 0)) });
    const free = await screen.findByRole('region', { name: 'Miễn phí' });
    expect(within(free).getByText('15 câu AI và 0 lượt tra AI mỗi tháng')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'So sánh chi tiết các gói' }));
    const row = within(screen.getByRole('table')).getByRole('row', { name: /Lượt tra AI mỗi tháng/ });
    expect(within(row).getAllByRole('cell').map((c) => c.textContent)).toEqual(['0', '80']);
  });

  it('a close button back to Today', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    expect(await screen.findByRole('link', { name: 'Đóng' })).toHaveAttribute('href', '/vi/app');
  });

  it('English', async () => {
    const view = renderApp(<PlansPage />, { locale: 'en', routes: routes(ent('free'), { 'POST /v1/me/orders': CREATED }) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Learn a little every day, go Pro when you need it' })).toBeInTheDocument();
    expect(screen.getByText('4 practice sessions a day')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '1 month' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '12 months' })).toBeChecked();
    expect(screen.getByText(/^The plan does not renew by itself\. No automatic refunds; for help, write to/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/en/terms');
    await userEvent.click(screen.getByRole('button', { name: 'Buy' }));
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    expect(view.calls.find((c) => c.method === 'POST' && c.path === '/v1/me/orders')?.body).toEqual({ period_months: 12, expected_amount: 610000, locale: 'en' });
    expect(screen.getByText('12 AI questions and 4 AI lookups a month')).toBeInTheDocument();
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
