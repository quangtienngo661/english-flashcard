// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import type { Route } from '@/app-shell/session/test-support';
import { ToastRegion } from '@/ui/Toast';
import { TransactionsPage } from './TransactionsPage';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/settings/transactions',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });

type Tx = Record<string, unknown>;
const row = (id: string, fields: Tx): Tx => ({
  id, kind: 'renewal', plan: 'pro', interval: 'month', amount_minor: 99000, currency: 'VND', occurred_at: '2026-10-15T02:12:00.000Z',
  period_start: '2026-10-15T02:12:00.000Z', period_end: '2026-11-15T02:12:00.000Z', status: 'succeeded', provider: 'fake',
  provider_transaction_id: 'fake_txn_8f2c41d9a7', ...fields,
});
// M7 Figma A §6.1, in the learner's zone (Asia/Ho_Chi_Minh, UTC+7): periods start at local midnight.
const QUARTER = row('p1', { kind: 'purchase', interval: 'quarter', amount_minor: 199000, provider: 'payos', provider_transaction_id: 'WM-261101-6F3K2Q',
  occurred_at: '2026-11-01T13:14:00.000Z', period_start: '2026-11-07T17:00:00.000Z', period_end: '2027-02-07T17:00:00.000Z' });
const SUMMER = row('p2', { kind: 'purchase', interval: 'quarter', amount_minor: 199000, provider: 'payos', provider_transaction_id: 'WM-260808-2B7Q',
  occurred_at: '2026-08-08T03:00:00.000Z', period_start: '2026-08-07T17:00:00.000Z', period_end: '2026-11-07T17:00:00.000Z' });
const REFUND = row('r1', { kind: 'refund', amount_minor: 79000, provider: 'payos', provider_transaction_id: 'WM-260722-9K',
  occurred_at: '2026-07-22T03:00:00.000Z', period_start: '2026-07-19T17:00:00.000Z', period_end: '2026-08-19T17:00:00.000Z' });
const REFUNDED = row('p3', { kind: 'purchase', amount_minor: 79000, provider: 'payos', provider_transaction_id: 'WM-260720-4X', status: 'refunded',
  occurred_at: '2026-07-20T03:00:00.000Z', period_start: '2026-07-19T17:00:00.000Z', period_end: '2026-08-19T17:00:00.000Z' });
const GRANT = row('g1', { kind: 'grant', interval: null, amount_minor: null, currency: null, provider: null, provider_transaction_id: null,
  occurred_at: '2026-06-15T03:00:00.000Z', period_start: '2026-06-14T17:00:00.000Z', period_end: '2026-07-14T17:00:00.000Z' });
const FIGMA = [QUARTER, SUMMER, REFUND, REFUNDED, GRANT];
// Kinds and statuses Figma does not draw (§6.3).
const RENEWAL = row('t1', { status: 'pending' });
const REVERSED = row('t2', { kind: 'refund', occurred_at: '2026-09-16T03:00:00.000Z', status: 'reversed' });
const YEAR = row('t3', { kind: 'plan_change', interval: 'year', amount_minor: 990000, occurred_at: '2026-09-15T03:00:00.000Z',
  period_start: '2026-09-15T03:00:00.000Z', period_end: '2027-09-15T03:00:00.000Z', status: 'refunded' });
const TRIAL = row('t4', { kind: 'trial', amount_minor: null, currency: null, occurred_at: '2026-08-01T03:00:00.000Z',
  period_start: '2026-08-01T03:00:00.000Z', period_end: '2026-08-15T03:00:00.000Z', provider_transaction_id: null });

const POOLS = {
  practice_sessions: { limit: 30, used: 0, remaining: 30, resets_at: '2026-10-23T17:00:00.000Z' },
  ai_practice: { limit: 300, used: 0, remaining: 300, resets_at: null }, ai_lookup: { limit: 100, used: 0, remaining: 100, resets_at: null },
};
// Lan bought Pro 3 tháng through payOS (Review Focus 2): a prepaid source and pro_until, no subscription.
const PREPAID = {
  plan: 'pro', trial_eligible: false, ai_available: { enabled: true, cap_reached: false }, pro_until: '2027-02-07T17:00:00.000Z',
  sources: [{ kind: 'prepaid', id: 'p1', status: null, starts_at: '2026-11-07T17:00:00.000Z', ends_at: '2027-02-07T17:00:00.000Z',
    renews_at: null, cancel_at_period_end: null, pending_interval: null }],
  features: { 'ai.practice': { allowed: true, reason: null }, 'ai.lookup': { allowed: true, reason: null } },
  pools: POOLS,
};
const FREE = { ...PREPAID, plan: 'free', pro_until: null, sources: [] };
const list = (items: Tx[], next: string | null = null): Route => () => Response.json({ items, next_page_token: next });
const routes = (over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/me/entitlements': () => Response.json(PREPAID),
  'GET /v1/me/transactions?page_size=20': list(FIGMA),
  ...over,
});
const rowButton = async (name: RegExp) => screen.findByRole('button', { name });
// Intl puts a no-break space before "₫".
const nameOf = (el: HTMLElement) => el.getAttribute('aria-label')!.replace(/ /g, ' ');
const text = (el: HTMLElement) => (el.textContent ?? '').replace(/ /g, ' ');

describe('TransactionsPage (Figma 122:4203 / 122:4354)', () => {
  it('back to Cài đặt, the title, month headings newest first in the learner\'s zone, and the footnote', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    expect(await screen.findByRole('heading', { level: 1, name: 'Lịch sử giao dịch' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('href', '/vi/app/settings');
    await rowButton(/^Mua · Pro · 3 tháng, 01\/11\/2026/);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
      ['tháng 11, 2026', 'tháng 8, 2026', 'tháng 7, 2026', 'tháng 6, 2026']);
    expect(screen.getAllByRole('list')).toHaveLength(4);
    expect(screen.getByText('ngày theo múi giờ của bạn · bấm một dòng để xem cổng thanh toán và mã giao dịch')).toBeInTheDocument();
  });

  it('a payOS quarter purchase row reads line 1, date, amount, period and status', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    expect(nameOf(await rowButton(/^Mua · Pro · 3 tháng, 01\/11\/2026/))).toBe(
      'Mua · Pro · 3 tháng, 01/11/2026, 199.000 ₫, dùng 08/11/2026 – 07/02/2027, Thành công. Xem chi tiết');
  });

  it('a period within one year drops the first year', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    expect(nameOf(await rowButton(/08\/08\/2026/))).toBe(
      'Mua · Pro · 3 tháng, 08/08/2026, 199.000 ₫, dùng 08/08 – 07/11/2026, Thành công. Xem chi tiết');
  });

  it('a refund shows "−" before its amount and "không có kỳ"; the refunded purchase says Đã hoàn tiền', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    const refund = await rowButton(/^Hoàn tiền/);
    expect(nameOf(refund)).toBe('Hoàn tiền · Pro · 1 tháng, 22/07/2026, −79.000 ₫, không có kỳ, Thành công. Xem chi tiết');
    expect(within(refund).getAllByText((_, el) => el?.tagName === 'SPAN' && text(el as HTMLElement) === '−79.000 ₫').length).toBeGreaterThan(0);
    expect(nameOf(await rowButton(/20\/07\/2026/))).toBe(
      'Mua · Pro · 1 tháng, 20/07/2026, 79.000 ₫, dùng 20/07 – 19/08/2026, Đã hoàn tiền. Xem chi tiết');
  });

  it('a grant has no interval and shows "0 ₫"', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    const grant = await rowButton(/^Cấp gói/);
    expect(nameOf(grant)).toBe('Cấp gói · Pro, 15/06/2026, 0 ₫, dùng 15/06 – 14/07/2026, Thành công. Xem chi tiết');
    expect(within(grant).getAllByText('Cấp gói · Pro').length).toBeGreaterThan(0);
  });

  it('kinds and statuses Figma does not draw keep their words; a subscription names its interval "theo tháng"', async () => {
    renderApp(<TransactionsPage />, { routes: routes({ 'GET /v1/me/transactions?page_size=20': list([RENEWAL, REVERSED, YEAR, TRIAL]) }) });
    expect(nameOf(await rowButton(/^Gia hạn/))).toBe(
      'Gia hạn · Pro · theo tháng, 15/10/2026, 99.000 ₫, dùng 15/10 – 14/11/2026, Đang chờ. Xem chi tiết');
    expect(nameOf(await rowButton(/^Hoàn tiền/))).toBe(
      'Hoàn tiền · Pro · theo tháng, 16/09/2026, −99.000 ₫, không có kỳ, Đã hủy hoàn tiền. Xem chi tiết');
    expect(nameOf(await rowButton(/^Đổi kỳ/))).toBe(
      'Đổi kỳ · Pro · theo năm, 15/09/2026, 990.000 ₫, dùng 15/09/2026 – 14/09/2027, Đã hoàn tiền. Xem chi tiết');
    expect(nameOf(await rowButton(/^Dùng thử/))).toBe(
      'Dùng thử · Pro · theo tháng, 01/08/2026, 0 ₫, dùng 01/08 – 14/08/2026, Thành công. Xem chi tiết');
  });

  it('the plan card: "Pro tới hết" the last day of pro_until, "Gói học hiện tại", and a link to the plans page', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    expect(await screen.findByText('Pro tới hết 07/02/2027')).toBeInTheDocument();
    expect(screen.getByText('Gói học hiện tại')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem gói học →' })).toHaveAttribute('href', '/vi/app/plans');
  });

  it('the plan card of a Free learner reads "Gói Miễn phí"', async () => {
    renderApp(<TransactionsPage />, { routes: routes({ 'GET /v1/me/entitlements': () => Response.json(FREE) }) });
    expect(await screen.findByText('Gói Miễn phí')).toBeInTheDocument();
  });

  it('a row opens "Chi tiết giao dịch": the receipt, the time, the period, payOS and the id', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    await userEvent.click(await rowButton(/^Mua · Pro · 3 tháng, 01\/11\/2026/));
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết giao dịch' });
    expect(within(dialog).getByText('mua · pro · 3 tháng')).toBeInTheDocument();
    expect(within(dialog).getByText((_, el) => el?.tagName === 'P' && text(el as HTMLElement) === '199.000 ₫')).toBeInTheDocument();
    expect(within(dialog).getByText('Thành công')).toBeInTheDocument();
    const value = (label: string) => within(dialog).getByText(label).closest('div')!;
    expect(within(value('Thời điểm')).getByText('01/11/2026, 20:14')).toBeInTheDocument();
    expect(within(value('Kỳ được dùng')).getByText('08/11/2026 – 07/02/2027')).toBeInTheDocument();
    expect(within(value('Cổng thanh toán')).getByText('payOS')).toBeInTheDocument();
    expect(within(value('Mã giao dịch')).getByText('WM-261101-6F3K2Q')).toBeInTheDocument();
    expect(within(dialog).getByText('Có câu hỏi về giao dịch này? Gửi mã giao dịch cho đội Wordmet qua mục Liên hệ.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('"Chép mã giao dịch" copies the id and says so in a toast', async () => {
    const user = userEvent.setup();
    renderApp(<><TransactionsPage /><ToastRegion /></>, { routes: routes() });
    await user.click(await rowButton(/^Mua · Pro · 3 tháng, 01\/11\/2026/));
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết giao dịch' });
    await user.click(within(dialog).getByRole('button', { name: 'Chép mã giao dịch' }));
    expect(await navigator.clipboard.readText()).toBe('WM-261101-6F3K2Q');
    expect(await screen.findByText('Đã chép mã giao dịch.')).toBeInTheDocument();
  });

  it('Esc closes the detail and focus returns to the row', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    const button = await rowButton(/^Mua · Pro · 3 tháng, 01\/11\/2026/);
    await userEvent.click(button);
    await screen.findByRole('dialog', { name: 'Chi tiết giao dịch' });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });

  it('a grant\'s detail has no gateway, no id and no help text', async () => {
    renderApp(<TransactionsPage />, { routes: routes() });
    await userEvent.click(await rowButton(/^Cấp gói/));
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết giao dịch' });
    expect(within(dialog).getByText('cấp gói · pro')).toBeInTheDocument();
    expect(within(dialog).queryByText('Cổng thanh toán')).toBeNull();
    expect(within(dialog).queryByText('Mã giao dịch')).toBeNull();
    expect(within(dialog).queryByRole('button', { name: 'Chép mã giao dịch' })).toBeNull();
    expect(within(dialog).queryByText(/Có câu hỏi về giao dịch này/)).toBeNull();
  });

  it('a fake-provider transaction names its gateway "Giả (thử)"', async () => {
    renderApp(<TransactionsPage />, { routes: routes({ 'GET /v1/me/transactions?page_size=20': list([RENEWAL]) }) });
    await userEvent.click(await rowButton(/^Gia hạn/));
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết giao dịch' });
    expect(within(within(dialog).getByText('Cổng thanh toán').closest('div')!).getByText('Giả (thử)')).toBeInTheDocument();
    expect(within(dialog).getByText('Đang chờ')).toBeInTheDocument();
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

  it('loading shows skeleton blocks announced as "Đang tải…"', async () => {
    renderApp(<TransactionsPage />, { routes: routes({ 'GET /v1/me/transactions?page_size=20': () => new Promise<Response>(() => {}) }) });
    expect(await screen.findByRole('status')).toHaveTextContent('Đang tải…');
  });

  it('no transactions yet', async () => {
    renderApp(<TransactionsPage />, { routes: routes({ 'GET /v1/me/transactions?page_size=20': list([]) }) });
    expect(await screen.findByText('Chưa có giao dịch nào.')).toBeInTheDocument();
    expect(screen.getByText('Khi bạn mua gói Pro hoặc được đội Wordmet cấp gói, giao dịch sẽ hiện ở đây.')).toBeInTheDocument();
  });

  it('a load error says so and Thử lại reads again', async () => {
    let fail = true;
    renderApp(<TransactionsPage />, { routes: routes({
      'GET /v1/me/transactions?page_size=20': () => (fail
        ? Response.json({ type: 'http://x/problems/internal', status: 500, title: 'x' }, { status: 500 })
        : Response.json({ items: [RENEWAL], next_page_token: null })),
    }) });
    expect(within(await screen.findByRole('alert')).getByText('Không tải được lịch sử giao dịch. Kiểm tra mạng rồi thử lại.')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await rowButton(/^Gia hạn/)).toBeInTheDocument();
  });

  it('English: kinds, statuses, money, dates and periods in English', async () => {
    renderApp(<TransactionsPage />, { locale: 'en', routes: routes({ 'GET /v1/me/transactions?page_size=20': list([QUARTER, RENEWAL, SUMMER]) }) });
    expect(nameOf(await rowButton(/^Renewal/))).toBe(
      'Renewal · Pro · monthly, Oct 15, 2026, ₫99,000, active Oct 15 – Nov 14, 2026, Pending. See details');
    expect(nameOf(await rowButton(/Aug 8, 2026/))).toBe(
      'Purchase · Pro · 3 months, Aug 8, 2026, ₫199,000, active Aug 8 – Nov 7, 2026, Succeeded. See details');
    expect(nameOf(await rowButton(/Nov 1, 2026/))).toBe(
      'Purchase · Pro · 3 months, Nov 1, 2026, ₫199,000, active Nov 8, 2026 – Feb 7, 2027, Succeeded. See details');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['November 2026', 'October 2026', 'August 2026']);
    expect(await screen.findByText('Pro through Feb 7, 2027')).toBeInTheDocument();
  });
});
