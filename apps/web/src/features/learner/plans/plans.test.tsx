// @vitest-environment jsdom
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { problem } from '@/app-shell/session/test-support';
import { renderApp } from '@/test-utils/render-app';
import { ToastRegion } from '@/ui/Toast';
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
const routes = (entitlements: unknown, extra: Record<string, () => Response | Promise<Response>> = {}, appConfig: unknown = CONFIG) => ({
  'GET /v1/me/app-config': () => Response.json(appConfig),
  'GET /v1/me/entitlements': () => Response.json(entitlements),
  ...extra,
});
// A pending Button shows a spinner icon; React Aria drops the `aria-busy` the kit Button sets, so the icon is what tells it.
const spinning = (button: HTMLElement) => button.querySelector('svg.lucide-loader-circle') !== null;
// Intl puts a no-break space before "₫".
const dong = (amount: number) => new RegExp(`^${amount.toLocaleString('vi-VN')}\\s₫$`);

let assign: ReturnType<typeof vi.fn>;
beforeEach(() => {
  assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
});

describe('PlansPage (K/52, K/53; launch prep B design §3.8; giao diện mới M7.9)', () => {
  it('Free: the lead, its card is "gói hiện tại" at 0 ₫ with the numbers of plans, ads, "bạn đang dùng gói này"; no eyebrow, no "Không cần thẻ ngân hàng"', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Học đều mỗi ngày, lên Pro khi cần' })).toBeInTheDocument();
    expect(screen.getByText('Trả một lần cho mỗi kỳ, không tự gia hạn. Hết kỳ, bạn về gói Miễn phí.')).toBeInTheDocument();
    expect(screen.queryByText('Gói học')).not.toBeInTheDocument();
    const free = screen.getByRole('region', { name: 'Miễn phí' });
    expect(within(free).getByText('Gói hiện tại')).toBeInTheDocument();
    expect(within(free).getByText(dong(0))).toBeInTheDocument();
    expect(within(free).getByText('không thu tiền')).toBeInTheDocument();
    expect(within(free).getByText('Ôn thẻ, lịch ôn, nhắc học qua email')).toBeInTheDocument();
    expect(within(free).getByText('4 phiên luyện mỗi ngày')).toBeInTheDocument();
    expect(within(free).getByText('Tra từ, thêm nhanh, tối đa 90 nhóm')).toBeInTheDocument();
    // LA3#1: the Free card names the monthly AI allowance, with the numbers of the config, and no longer says AI needs Pro.
    expect(within(free).getByText('12 câu AI và 4 lượt tra AI mỗi tháng')).toBeInTheDocument();
    expect(within(free).queryByText('Câu AI và tra bằng AI: cần gói Pro')).not.toBeInTheDocument();
    expect(within(free).getByText('Có thể có quảng cáo.')).toBeInTheDocument();
    expect(within(free).getByText('Bạn đang dùng gói này')).toBeInTheDocument();
    expect(screen.queryByText(/Không cần thẻ ngân hàng/)).not.toBeInTheDocument();
    expect(screen.queryByText(/XX\.000/)).not.toBeInTheDocument();
    expect(screen.queryByText('Phiên luyện hôm nay')).not.toBeInTheDocument();
  });

  it('Free: the Pro card has "có AI", its line, the period cards with 12 tháng checked, the six perks and "Mua gói Pro 12 tháng"', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    const pro = await screen.findByRole('region', { name: 'Pro' });
    expect(within(pro).getByText('Có AI')).toBeInTheDocument();
    expect(within(pro).queryByText('gói hiện tại')).not.toBeInTheDocument();
    expect(within(pro).getByText('Luyện nhiều hơn, có AI soạn câu và tra từ cùng bạn.')).toBeInTheDocument();
    const periods = within(pro).getByRole('radiogroup', { name: 'Kỳ hạn' });
    expect(within(periods).getAllByRole('radio')).toHaveLength(3);
    expect(within(pro).getByRole('radio', { name: /^12 tháng/ })).toBeChecked();
    for (const perk of [
      'AI viết câu luyện cho từng từ bạn học', 'Tra từ bằng AI khi từ điển chưa có', '250 câu AI và 80 lượt tra AI mỗi tháng',
      '25 phiên luyện mỗi ngày', 'Không quảng cáo', 'Mọi quyền lợi của gói Miễn phí',
    ]) expect(within(pro).getByText(perk)).toBeInTheDocument();
    expect(within(pro).getByRole('button', { name: 'Mua gói Pro 12 tháng' })).toBeEnabled();
    expect(within(pro).queryByText('Chưa mở bán')).not.toBeInTheDocument();
    // The footnote about AI being switched on and the daily cap is gone (owner 05/11/2026).
    expect(screen.queryByText(/Câu AI có khi AI đang mở/)).not.toBeInTheDocument();
  });

  it('each period card names its saving, price and price a month, computed from plans.pro.prices; the struck price is shown but not read', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    const pro = await screen.findByRole('region', { name: 'Pro' });
    // 205.000 against 3 × 81.000 = 243.000 is −16 %; 610.000 against 972.000 is −37 %, the best.
    expect(within(pro).getByRole('radio', { name: /^3 tháng\s*−16%\s*205\.000\s₫\s*≈ 68\.300\s₫ mỗi tháng$/ })).toBeInTheDocument();
    expect(within(pro).getByRole('radio', { name: /^12 tháng\s*−37% · tiết kiệm nhất\s*610\.000\s₫\s*≈ 50\.800\s₫ mỗi tháng$/ })).toBeInTheDocument();
    expect(within(pro).getByRole('radio', { name: /^1 tháng\s*81\.000\s₫\s*mỗi tháng$/ })).toBeInTheDocument();
    expect(within(pro).getByText(dong(243000))).toBeInTheDocument();
    expect(within(pro).getByText(dong(972000))).toBeInTheDocument();
  });

  it('choosing 3 tháng: the button and the small print follow; pressing posts that period and its price, then goes to the payment page', async () => {
    const view = renderApp(<PlansPage />, { routes: routes(ent('free'), { 'POST /v1/me/orders': CREATED }) });
    await userEvent.click(await screen.findByRole('radio', { name: /^3 tháng/ }));
    const pro = screen.getByRole('region', { name: 'Pro' });
    expect(within(pro).getByText(/^Trả một lần, dùng 3 tháng, không tự gia hạn\./)).toBeInTheDocument();
    await userEvent.click(within(pro).getByRole('button', { name: 'Mua gói Pro 3 tháng' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/checkout?order=1'));
    const posts = view.calls.filter((c) => c.method === 'POST' && c.path === '/v1/me/orders');
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ period_months: 3, expected_amount: 205000, locale: 'vi' });
    expect(posts[0].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('after the Buy button and the perks: one payment, no renewal, no automatic refund with the support email, then the Terms (owner 05/11/2026)', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    const pro = await screen.findByRole('region', { name: 'Pro' });
    const sentence = within(pro).getByText(/^Trả một lần, dùng 12 tháng, không tự gia hạn\./);
    expect(sentence).toHaveTextContent(
      /^Trả một lần, dùng 12 tháng, không tự gia hạn\. Không hoàn tiền tự động; cần hỗ trợ, liên hệ support@wordmet\.com\.$/,
    );
    expect(within(pro).getByRole('link', { name: 'support@wordmet.com' })).toHaveAttribute('href', 'mailto:support@wordmet.com');
    expect(within(pro).queryByText(/Kỳ mới bắt đầu từ/)).not.toBeInTheDocument();
    const buy = within(pro).getByRole('button', { name: 'Mua gói Pro 12 tháng' });
    expect(buy.compareDocumentPosition(sentence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const lastPerk = within(pro).getByText('Mọi quyền lợi của gói Miễn phí');
    expect(lastPerk.compareDocumentPosition(sentence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const terms = within(pro).getByRole('link', { name: 'Điều khoản sử dụng' });
    expect(terms).toHaveAttribute('href', '/vi/terms');
    expect(sentence.compareDocumentPosition(terms) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('once the order is created the button keeps spinning while the browser leaves for the payment page', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free'), { 'POST /v1/me/orders': CREATED }) });
    const buy = await screen.findByRole('button', { name: 'Mua gói Pro 12 tháng' });
    await userEvent.click(buy);
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    // Let the press settle: the request's own busy flag is off again by now, so only the page leaving keeps the spinner.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(spinning(buy)).toBe(true);
  });

  it('a double press is one order', async () => {
    const view = renderApp(<PlansPage />, { routes: routes(ent('free'), { 'POST /v1/me/orders': CREATED }) });
    await userEvent.click(await screen.findByRole('radio', { name: /^3 tháng/ }));
    await userEvent.dblClick(screen.getByRole('button', { name: 'Mua gói Pro 3 tháng' }));
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    const posts = view.calls.filter((c) => c.method === 'POST' && c.path === '/v1/me/orders');
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ period_months: 3, expected_amount: 205000, locale: 'vi' });
  });

  it('LB1E28: 409 price-changed → the prices are read again, "Giá vừa thay đổi. Xem lại trước khi mua.", nothing opens, and the next press uses the new price', async () => {
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
    await userEvent.click(await screen.findByRole('button', { name: 'Mua gói Pro 12 tháng' }));
    expect(await screen.findByText('Giá vừa thay đổi. Xem lại trước khi mua.')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    const pro = screen.getByRole('region', { name: 'Pro' });
    expect(await within(pro).findByText(dong(620000))).toBeInTheDocument();
    await userEvent.click(within(pro).getByRole('button', { name: 'Mua gói Pro 12 tháng' }));
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    const bodies = view.calls.filter((c) => c.method === 'POST' && c.path === '/v1/me/orders').map((c) => c.body);
    expect(bodies).toEqual([
      { period_months: 12, expected_amount: 610000, locale: 'vi' }, { period_months: 12, expected_amount: 620000, locale: 'vi' },
    ]);
  });

  it('Back from the payment page restores Gói học from the back/forward cache (pageshow, persisted): the button works again', async () => {
    const pageshow = (persisted: boolean) => Object.defineProperty(new Event('pageshow'), 'persisted', { value: persisted });
    const view = renderApp(<PlansPage />, { routes: routes(ent('free'), { 'POST /v1/me/orders': CREATED }) });
    const buy = await screen.findByRole('button', { name: 'Mua gói Pro 12 tháng' });
    await userEvent.click(buy);
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(spinning(buy)).toBe(true));
    // A page that was loaded afresh (persisted false) is not a restored one: nothing changes.
    act(() => { window.dispatchEvent(pageshow(false)); });
    expect(spinning(buy)).toBe(true);
    act(() => { window.dispatchEvent(pageshow(true)); });
    expect(spinning(buy)).toBe(false);
    await userEvent.click(buy);
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(2));
    expect(view.calls.filter((c) => c.method === 'POST' && c.path === '/v1/me/orders')).toHaveLength(2);
  });

  it('503 → "Không tạo được đơn hàng. Thử lại sau ít phút." and the button works again', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free'), { 'POST /v1/me/orders': () => problem(503, 'provider-unavailable') }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Mua gói Pro 12 tháng' }));
    expect(await screen.findByText('Không tạo được đơn hàng. Thử lại sau ít phút.')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Mua gói Pro 12 tháng' })).toBeEnabled();
  });

  it('Review Focus 2: Pro from payOS (prepaid, pro_until): "Bạn đang dùng gói Pro", the Pro card is "gói hiện tại" until pro_until − 1 ms', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('pro', [PREPAID], { pro_until: '2026-12-31T17:00:00Z', upcoming_periods: [] })) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Bạn đang dùng gói Pro' })).toBeInTheDocument();
    const pro = screen.getByRole('region', { name: 'Pro' });
    expect(within(pro).getByText('Gói hiện tại')).toBeInTheDocument();
    expect(within(pro).getByText('Tới hết 31/12/2026')).toBeInTheDocument();
    const free = screen.getByRole('region', { name: 'Miễn phí' });
    expect(within(free).queryByText('gói hiện tại')).not.toBeInTheDocument();
    expect(within(free).queryByText('Bạn đang dùng gói này')).not.toBeInTheDocument();
  });

  it('GG3: Pro given by the team: card says "gói hiện tại" and until when (pro_until); no line under the title (owner 27/10/2026)', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('pro', [GRANT], { pro_until: GRANT.ends_at })) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Bạn đang dùng gói Pro' })).toBeInTheDocument();
    expect(screen.queryByText(/Đội Wordmet cấp từ/)).not.toBeInTheDocument();
    const pro = screen.getByRole('region', { name: 'Pro' });
    expect(within(pro).getByText('Gói hiện tại')).toBeInTheDocument();
    expect(within(pro).getByText('Tới hết 31/12/2026')).toBeInTheDocument();
    expect(within(pro).queryByText(/từ và lịch ôn giữ nguyên/)).not.toBeInTheDocument();
    expect(within(pro).queryByText('Chưa mở bán')).not.toBeInTheDocument();
    expect(screen.queryByText('Tự động về Free khi Pro hết hạn')).not.toBeInTheDocument();
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
    expect(within(pro).getByText('Tới hết 05/12/2027')).toBeInTheDocument();
    expect(within(pro).getByText('Kỳ tiếp theo: 06/12/2026 – 05/12/2027')).toBeInTheDocument();
    // The running period is 1 month and 12 is chosen: a longer period is an upgrade, which starts where the chain ends.
    expect(within(pro).getByRole('button', { name: 'Nâng cấp lên 12 tháng' })).toBeEnabled();
    expect(within(pro).getByText('Kỳ mới bắt đầu từ 06/12/2027, khi kỳ hiện tại kết thúc.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy gói' })).not.toBeInTheDocument();
    expect(screen.queryByText('Gói đang đăng ký')).not.toBeInTheDocument();
  });

  describe('the button follows the running prepaid period (owner 05/11/2026)', () => {
    const THREE = { ...PREPAID, id: 'pp3m', starts_at: '2026-11-05T03:00:00.000Z', ends_at: '2027-02-05T17:00:00.000Z' };
    const onPeriod = (source: unknown, pro_until: string) => routes(ent('pro', [source], { pro_until, upcoming_periods: [] }));

    it('the same length as the running period: the button is locked and says so; nothing can be ordered', async () => {
      const view = renderApp(<PlansPage />, { routes: onPeriod(PREPAID, PREPAID.ends_at) });
      await userEvent.click(await screen.findByRole('radio', { name: /^1 tháng/ }));
      const pro = screen.getByRole('region', { name: 'Pro' });
      expect(within(pro).getByRole('button', { name: 'Đang dùng kỳ này' })).toBeDisabled();
      expect(within(pro).queryByRole('button', { name: /^Mua gói Pro/ })).not.toBeInTheDocument();
      expect(within(pro).queryByText(/Kỳ mới bắt đầu từ/)).not.toBeInTheDocument();
      await userEvent.click(within(pro).getByRole('button', { name: 'Đang dùng kỳ này' }));
      expect(view.calls.filter((c) => c.path === '/v1/me/orders')).toEqual([]);
    });

    it('a longer period: "Nâng cấp lên 3 tháng", and the new period starts when the running one ends', async () => {
      renderApp(<PlansPage />, { routes: onPeriod(PREPAID, PREPAID.ends_at) });
      await userEvent.click(await screen.findByRole('radio', { name: /^3 tháng/ }));
      const pro = screen.getByRole('region', { name: 'Pro' });
      expect(within(pro).getByRole('button', { name: 'Nâng cấp lên 3 tháng' })).toBeEnabled();
      expect(within(pro).getByText('Kỳ mới bắt đầu từ 06/12/2026, khi kỳ hiện tại kết thúc.')).toBeInTheDocument();
    });

    it('a shorter period than the running 3 months: "Mua gói Pro 1 tháng", with the same start line', async () => {
      renderApp(<PlansPage />, { routes: onPeriod(THREE, THREE.ends_at) });
      await userEvent.click(await screen.findByRole('radio', { name: /^1 tháng/ }));
      const pro = screen.getByRole('region', { name: 'Pro' });
      expect(within(pro).getByRole('button', { name: 'Mua gói Pro 1 tháng' })).toBeEnabled();
      expect(within(pro).getByText('Kỳ mới bắt đầu từ 06/02/2027, khi kỳ hiện tại kết thúc.')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('radio', { name: /^3 tháng/ }));
      expect(within(pro).getByRole('button', { name: 'Đang dùng kỳ này' })).toBeDisabled();
    });

    it('Pro given by the team has no period length: every period is "Mua gói Pro …", starting where the grant ends', async () => {
      renderApp(<PlansPage />, { routes: onPeriod(GRANT, GRANT.ends_at) });
      const pro = await screen.findByRole('region', { name: 'Pro' });
      for (const name of ['1 tháng', '3 tháng', '12 tháng']) {
        await userEvent.click(screen.getByRole('radio', { name: new RegExp(`^${name}`) }));
        expect(within(pro).getByRole('button', { name: `Mua gói Pro ${name}` })).toBeEnabled();
      }
      expect(within(pro).getByText('Kỳ mới bắt đầu từ 01/01/2027, khi kỳ hiện tại kết thúc.')).toBeInTheDocument();
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
    expect(within(pro).getByText('Kỳ tiếp theo: 06/12/2026 – 05/12/2027')).toBeInTheDocument();
    expect(within(pro).getByText('Sau đó: 06/12/2027 – 05/03/2028')).toBeInTheDocument();
  });

  it('"So sánh chi tiết các gói" is a heading that names the table, always shown with the same numbers; yes and no are words', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free')) });
    expect(await screen.findByRole('heading', { level: 2, name: 'So sánh chi tiết các gói' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'So sánh chi tiết các gói' })).not.toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'So sánh chi tiết các gói' });
    expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Tính năng', 'Miễn phí', 'Pro']);
    const cells = (row: RegExp) => within(within(table).getByRole('row', { name: row })).getAllByRole('cell').map((c) => c.textContent);
    expect(cells(/Phiên luyện mỗi ngày/)).toEqual(['4', '25']);
    expect(cells(/Số nhóm/)).toEqual(['90', '90']);
    // The AI rows: Free has its numbers too, not a dash.
    expect(cells(/Câu AI mới mỗi tháng/)).toEqual(['12', '250']);
    expect(cells(/Lượt tra AI mỗi tháng/)).toEqual(['4', '80']);
    expect(cells(/Ôn thẻ và lịch ôn/)).toEqual(['Có', 'Có']);
    expect(cells(/Không quảng cáo/)).toEqual(['Không', 'Có']);
  });

  it('LA3#11: when the config gives Free no AI (both numbers 0) the card and the table say so, as before', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free'), {}, withFree(0, 0)) });
    const free = await screen.findByRole('region', { name: 'Miễn phí' });
    expect(within(free).getByText('Câu AI và tra bằng AI: cần gói Pro')).toBeInTheDocument();
    expect(within(free).queryByText(/câu AI và \d+ lượt tra AI mỗi tháng/)).not.toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'So sánh chi tiết các gói' });
    expect(within(within(table).getByRole('row', { name: /Câu AI mới mỗi tháng/ })).getAllByRole('cell').map((c) => c.textContent)).toEqual(['—', '250']);
    expect(within(within(table).getByRole('row', { name: /Lượt tra AI mỗi tháng/ })).getAllByRole('cell').map((c) => c.textContent)).toEqual(['—', '80']);
  });

  it('LA3#13: only one of the two Free numbers is 0 → the card names both and the table shows the same 0 (a dash means no AI at all)', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free'), {}, withFree(15, 0)) });
    const free = await screen.findByRole('region', { name: 'Miễn phí' });
    expect(within(free).getByText('15 câu AI và 0 lượt tra AI mỗi tháng')).toBeInTheDocument();
    const row = within(screen.getByRole('table', { name: 'So sánh chi tiết các gói' })).getByRole('row', { name: /Lượt tra AI mỗi tháng/ });
    expect(within(row).getAllByRole('cell').map((c) => c.textContent)).toEqual(['0', '80']);
  });

  it('while the prices and the plan load: the skeleton, announced as "Đang tải…"', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('free'), { 'GET /v1/me/app-config': () => new Promise<Response>(() => {}) }) });
    expect(await screen.findByRole('status')).toHaveTextContent(/^Đang tải…$/);
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('English', async () => {
    const view = renderApp(<PlansPage />, { locale: 'en', routes: routes(ent('free'), { 'POST /v1/me/orders': CREATED }) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Learn a little every day, go Pro when you need it' })).toBeInTheDocument();
    expect(screen.getByText('4 practice sessions a day')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^1 month/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^12 months\s*−37% · best value/ })).toBeChecked();
    expect(screen.getByText(/^One payment for 12 months, no automatic renewal\. No automatic refunds; for help, write to/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/en/terms');
    await userEvent.click(screen.getByRole('button', { name: 'Buy Pro for 12 months' }));
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

  it('"Giữ gói" closes the dialog and hands focus back to "Hủy gói"', async () => {
    renderApp(<PlansPage />, { routes: routes(ent('pro', [SUB])) });
    const opener = await screen.findByRole('button', { name: 'Hủy gói' });
    await userEvent.click(opener);
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Hủy gói?' })).getByRole('button', { name: 'Giữ gói' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Hủy gói' })).toHaveFocus());
  });

  it('after "Hủy gia hạn" succeeds the "Hủy gói" button is gone, so focus moves to the row\'s line, not to the page', async () => {
    let cancelled = false;
    renderApp(<PlansPage />, {
      routes: {
        'GET /v1/me/app-config': () => Response.json(CONFIG),
        'GET /v1/me/entitlements': () => Response.json(ent('pro', [{ ...SUB, cancel_at_period_end: cancelled }])),
        'POST /v1/me/subscriptions/sub-1/cancel': () => { cancelled = true; return Response.json({ status: 'requested' }, { status: 202 }); },
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Hủy gói' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Hủy gói?' })).getByRole('button', { name: 'Hủy gia hạn' }));
    const line = await screen.findByText('Gói kết thúc ngày 12/11/2026');
    await waitFor(() => expect(line).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
