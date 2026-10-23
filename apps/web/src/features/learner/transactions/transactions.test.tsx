// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import type { Route } from '@/app-shell/session/test-support';
import { TransactionsPage } from './TransactionsPage';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/settings/transactions',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });

type Tx = Record<string, unknown>;
const row = (id: string, fields: Tx): Tx => ({
  id, kind: 'renewal', plan: 'pro', interval: 'month', amount_minor: 99000, currency: 'VND', occurred_at: '2026-10-15T02:12:00.000Z',
  period_start: '2026-10-15T02:12:00.000Z', period_end: '2026-11-15T02:12:00.000Z', status: 'succeeded', provider: 'fake',
  provider_transaction_id: 'fake_txn_8f2c41d9a7', ...fields,
});
const GRANT = row('g1', {
  kind: 'grant', interval: null, amount_minor: null, currency: null, occurred_at: '2026-10-20T03:00:00.000Z',
  period_start: '2026-10-20T03:00:00.000Z', period_end: '2026-12-31T17:00:00.000Z', provider: null, provider_transaction_id: null,
});
const RENEWAL = row('t1', { status: 'pending' });
const REFUND = row('t2', { kind: 'refund', occurred_at: '2026-09-16T03:00:00.000Z', period_start: '2026-09-15T03:00:00.000Z',
  period_end: '2026-10-15T03:00:00.000Z', status: 'reversed' });
const YEAR = row('t3', { kind: 'plan_change', interval: 'year', amount_minor: 990000, occurred_at: '2026-09-15T03:00:00.000Z',
  period_start: '2026-09-15T03:00:00.000Z', period_end: '2027-09-15T03:00:00.000Z', status: 'refunded' });
const TRIAL = row('t4', { kind: 'trial', amount_minor: null, currency: null, occurred_at: '2026-08-01T03:00:00.000Z',
  period_start: '2026-08-01T03:00:00.000Z', period_end: '2026-08-15T03:00:00.000Z', provider_transaction_id: null });

const ENT = {
  plan: 'pro', trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  sources: [{ kind: 'grant_plan', id: 'g1', status: null, starts_at: '2026-10-20T03:00:00.000Z', ends_at: '2026-12-31T17:00:00.000Z',
    renews_at: null, cancel_at_period_end: null, pending_interval: null }],
  features: { 'ai.practice': { allowed: true, reason: null }, 'ai.lookup': { allowed: true, reason: null } },
  pools: {
    practice_sessions: { limit: 30, used: 0, remaining: 30, resets_at: '2026-10-23T17:00:00.000Z' },
    ai_practice: { limit: 300, used: 0, remaining: 300, resets_at: null }, ai_lookup: { limit: 100, used: 0, remaining: 100, resets_at: null },
  },
};
const list = (items: Tx[], next: string | null = null): Route => () => Response.json({ items, next_page_token: next });
const routes = (over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/me/entitlements': () => Response.json(ENT),
  'GET /v1/me/transactions?page_size=20': list([GRANT, RENEWAL, REFUND, YEAR, TRIAL]),
  ...over,
});
const rowButton = async (name: RegExp) => screen.findByRole('button', { name });
// Intl puts a no-break space before "₫".
const nameOf = (el: HTMLElement) => el.getAttribute('aria-label')!.replace(/\u00a0/g, ' ');

describe('TransactionsPage (K/95–K/95d, M/95–M/95c)', () => {
  it('each row names its kind, plan and period, amount and status in the learner\'s zone; no money for a grant or a trial', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    expect(await screen.findByRole('heading', { name: 'Lịch sử giao dịch' })).toBeInTheDocument();
    const renewal = await rowButton(/^Gia hạn/);
    expect(nameOf(renewal)).toBe('Gia hạn, 15/10/2026, Pro · theo tháng, 99.000 ₫, dùng 15/10 – 14/11/2026, Đang chờ. Xem chi tiết');
    expect(nameOf(await rowButton(/^Đội Wordmet cấp/))).toBe('Đội Wordmet cấp, 20/10/2026, Pro, dùng 20/10 – 31/12/2026, Thành công. Xem chi tiết');
    expect(nameOf(await rowButton(/^Dùng thử/))).toBe('Dùng thử, 1/8/2026, Pro · theo tháng, dùng 1/8 – 14/8/2026, Thành công. Xem chi tiết');
    expect(nameOf(await rowButton(/^Đổi kỳ/))).toBe(
      'Đổi kỳ, 15/9/2026, Pro · theo năm, 990.000 ₫, dùng 15/9/2026 – 14/9/2027, Đã hoàn tiền. Xem chi tiết');
    expect(nameOf(await rowButton(/^Hoàn tiền/))).toBe(
      'Hoàn tiền, 16/9/2026, Pro · theo tháng, 99.000 ₫, dùng 15/9 – 14/10/2026, Đã hủy hoàn tiền. Xem chi tiết');
    expect(within(renewal).getAllByText(/^99\.000\s₫$/).length).toBeGreaterThan(0);
    expect(within(await rowButton(/^Đội Wordmet cấp/)).queryByText(/₫/)).toBeNull();
  });

  it('the aside names the current plan and how long it lasts', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    expect(await screen.findByText('Gói Pro · Đội Wordmet cấp tới hết 31/12/2026')).toBeInTheDocument();
    expect(screen.getByText('Dùng thử và Đội Wordmet cấp: không thu tiền.')).toBeInTheDocument();
  });

  it('a row opens its detail: time, gateway "Giả (thử)" and the transaction id; Đóng closes it', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    await userEvent.click(await rowButton(/^Gia hạn/));
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết giao dịch' });
    const value = (label: string) => within(dialog).getByText(label).closest('div')!;
    expect(within(value('Thời điểm')).getByText('15/10/2026, 9:12')).toBeInTheDocument();
    expect(within(value('Số tiền')).getByText('99.000 ₫')).toBeInTheDocument();
    expect(within(value('Cổng thanh toán')).getByText('Giả (thử)')).toBeInTheDocument();
    expect(within(value('Mã giao dịch')).getByText('fake_txn_8f2c41d9a7')).toBeInTheDocument();
    expect(within(value('Trạng thái')).getByText('Đang chờ')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('a grant\'s detail has no amount, gateway or id', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    await userEvent.click(await rowButton(/^Đội Wordmet cấp/));
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết giao dịch' });
    expect(within(dialog).queryByText('Số tiền')).toBeNull();
    expect(within(dialog).queryByText('Cổng thanh toán')).toBeNull();
    expect(within(dialog).queryByText('Mã giao dịch')).toBeNull();
  });

  it('more pages load with the next page token', async () => {
    const view = renderApp(<TransactionsPage />, { routes: routes({
      'GET /v1/me/transactions?page_size=20': list([RENEWAL], 'next-1'),
      'GET /v1/me/transactions?page_size=20&page_token=next-1': list([TRIAL]),
    }) });
    await rowButton(/^Gia hạn/);
    expect(screen.queryByRole('button', { name: /^Dùng thử/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Xem thêm' }));
    expect(await rowButton(/^Dùng thử/)).toBeInTheDocument();
    expect(view.count('GET', '/v1/me/transactions?page_size=20&page_token=next-1')).toBe(1);
    expect(screen.queryByRole('button', { name: 'Xem thêm' })).toBeNull();
  });

  it('K/95c: no transactions yet', async () => {
    renderApp(<TransactionsPage />, { routes: routes({ 'GET /v1/me/transactions?page_size=20': list([]) }) });
    expect(await screen.findByText('Chưa có giao dịch nào.')).toBeInTheDocument();
    expect(screen.getByText('Khi bạn dùng thử, mua gói Pro hoặc được đội Wordmet cấp gói, giao dịch sẽ hiện ở đây.')).toBeInTheDocument();
  });

  it('K/95d: a load error says so and Thử lại reads again', async () => {
    let fail = true;
    renderApp(<TransactionsPage />, { routes: routes({
      'GET /v1/me/transactions?page_size=20': () => (fail
        ? Response.json({ type: 'http://x/problems/internal', status: 500, title: 'x' }, { status: 500 })
        : Response.json({ items: [RENEWAL], next_page_token: null })),
    }) });
    expect(await screen.findByText('Không tải được lịch sử giao dịch.')).toBeInTheDocument();
    expect(screen.getByText('Kiểm tra mạng rồi thử lại.')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await rowButton(/^Gia hạn/)).toBeInTheDocument();
  });

  it('English: kinds, statuses, money and dates in English', async () => {
    renderApp(<TransactionsPage />, { locale: 'en', routes: routes() });
    expect(nameOf(await rowButton(/^Renewal/))).toBe(
      'Renewal, Oct 15, 2026, Pro · monthly, ₫99,000, active Oct 15 – Nov 14, 2026, Pending. See details');
  });
});
