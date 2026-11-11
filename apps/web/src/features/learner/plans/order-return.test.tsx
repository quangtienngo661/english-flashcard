// @vitest-environment jsdom
import { act, screen, waitFor, within } from '@testing-library/react';
import { problem } from '@/app-shell/session/test-support';
import { ENTITLEMENTS_KEY } from '@/app-shell/queries';
import { renderApp } from '@/app-ui/test-utils';
import { OrderReturnPage } from './OrderReturnPage';

let search = '';
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/plans/order',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));
vi.setConfig({ testTimeout: 30_000 });

const ID = '10480ac9-5340-4677-a0af-536b11614277';
const CHECK = `POST /v1/me/orders/${ID}/check`;
const READ = `GET /v1/me/orders/${ID}`;
const view = (status: string) => ({
  id: ID, status, period_months: 3, amount: 199000, description: 'WM0XSNJGK', expires_at: '2026-11-05T03:17:00.000Z',
  period: status === 'paid' ? { starts_at: '2026-11-05T03:02:00.000Z', ends_at: '2026-12-05T17:00:00.000Z' } : null,
});
const answer = (status: string) => () => Response.json(view(status));
const count = (calls: Array<{ method: string; path: string }>, method: string, path: string) => calls.filter((c) => c.method === method && c.path === path).length;

beforeEach(() => {
  search = new URLSearchParams({ order: ID }).toString();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('OrderReturnPage (launch prep B design §3.8, DB32)', () => {
  it('LB1A3: asks payOS through check once, reads the order, and says it was paid with the last day of the period (vi, the learner\'s zone)', async () => {
    const view$ = renderApp(<OrderReturnPage />, { routes: { [CHECK]: answer('pending'), [READ]: answer('paid') } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Thanh toán thành công' })).toBeInTheDocument();
    expect(screen.getByText(/^Gói Pro có hiệu lực đến hết/)).toHaveTextContent('Gói Pro có hiệu lực đến hết 05/12/2026.');
    // The receipt: plan and length, the amount and the order's transfer note, all from the order itself.
    expect(screen.getByText('Pro, 3 tháng')).toBeInTheDocument();
    expect(screen.getByText(/^199\.000\s₫$/)).toBeInTheDocument();
    expect(screen.getByText('WM0XSNJGK')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem gói' })).toHaveAttribute('href', '/vi/app/plans');
    expect(count(view$.calls, 'POST', `/v1/me/orders/${ID}/check`)).toBe(1);
    expect(screen.getByRole('link', { name: 'Bắt đầu học' })).toHaveAttribute('href', '/vi/app');
  });

  it('a paid order makes the learner\'s plan read again (the entitlements are invalidated)', async () => {
    const view$ = renderApp(<OrderReturnPage />, { routes: { [CHECK]: answer('pending'), [READ]: answer('paid') } });
    view$.client.setQueryData(ENTITLEMENTS_KEY, { plan: 'free' });
    await screen.findByText(/^Thanh toán thành công$/);
    await waitFor(() => expect(view$.client.getQueryState(ENTITLEMENTS_KEY)?.isInvalidated).toBe(true));
  });

  it('LB1E45: only ?order= is read; code, id, cancel, status and orderCode that payOS adds are ignored (cancel=true on a paid order changes nothing)', async () => {
    search = new URLSearchParams({ order: ID, code: '00', id: 'abc', cancel: 'true', status: 'CANCELLED', orderCode: '1000000123' }).toString();
    const view$ = renderApp(<OrderReturnPage />, { routes: { [CHECK]: answer('pending'), [READ]: answer('paid') } });
    expect(await screen.findByText(/^Thanh toán thành công$/)).toBeInTheDocument();
    expect(view$.calls.filter((c) => c.path.startsWith('/v1/me/orders')).map((c) => c.path).sort()).toEqual([`/v1/me/orders/${ID}`, `/v1/me/orders/${ID}/check`]);
  });

  it('pending: the waiting sentence and the support email at once; the order is read every 3 s and the page stops asking after 2 minutes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const view$ = renderApp(<OrderReturnPage />, { routes: { [CHECK]: answer('pending'), [READ]: answer('pending') } });
    expect(await screen.findByText('Gói Pro sẽ tự kích hoạt khi nhận được tiền. Bạn có thể đóng trang này.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'support@wordmet.com' })).toHaveAttribute('href', 'mailto:support@wordmet.com');
    // The waiting card sits inside the page's one status element.
    expect(within(screen.getByRole('status')).getByRole('heading', { level: 1, name: 'Đang chờ xác nhận thanh toán' })).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(9_500));
    const early = count(view$.calls, 'GET', `/v1/me/orders/${ID}`);
    expect(early).toBeGreaterThanOrEqual(3);
    expect(early).toBeLessThanOrEqual(5);
    await act(() => vi.advanceTimersByTimeAsync(125_000));
    const stopped = count(view$.calls, 'GET', `/v1/me/orders/${ID}`);
    expect(stopped).toBeGreaterThanOrEqual(39);
    expect(stopped).toBeLessThanOrEqual(45);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(count(view$.calls, 'GET', `/v1/me/orders/${ID}`)).toBe(stopped);
    expect(count(view$.calls, 'POST', `/v1/me/orders/${ID}/check`)).toBe(1);
    expect(screen.getByText('Gói Pro sẽ tự kích hoạt khi nhận được tiền. Bạn có thể đóng trang này.')).toBeInTheDocument();
  });

  it('pending turns into paid on a later read: the success line replaces the waiting one and the reading stops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let reads = 0;
    const view$ = renderApp(<OrderReturnPage />, {
      routes: { [CHECK]: answer('pending'), [READ]: () => { reads += 1; return Response.json(view(reads >= 3 ? 'paid' : 'pending')); } },
    });
    await screen.findByText(/^Đang chờ xác nhận thanh toán$/);
    // One status element holds the card in every state, so the change to paid is announced (M7 Review Focus 4).
    const status = screen.getByRole('status');
    expect(within(status).getByRole('heading', { level: 1 })).toHaveTextContent('Đang chờ xác nhận thanh toán');
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(await screen.findByText(/^Thanh toán thành công$/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBe(status);
    expect(within(status).getByRole('heading', { level: 1 })).toHaveTextContent('Thanh toán thành công');
    expect(screen.queryByText(/^Đang chờ xác nhận thanh toán$/)).not.toBeInTheDocument();
    const after = count(view$.calls, 'GET', `/v1/me/orders/${ID}`);
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(count(view$.calls, 'GET', `/v1/me/orders/${ID}`)).toBe(after);
  });

  it('needs_review (and closed): "Giao dịch đang được kiểm tra" with the support email, not the waiting line', async () => {
    renderApp(<OrderReturnPage />, { routes: { [CHECK]: answer('needs_review'), [READ]: answer('needs_review') } });
    expect(await screen.findByText('Giao dịch đang được kiểm tra')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'support@wordmet.com' })).toBeInTheDocument();
    expect(screen.queryByText(/^Đang chờ xác nhận thanh toán$/)).not.toBeInTheDocument();
  });

  it.each(['cancelled', 'expired', 'failed'])('LB1A6: a %s order says "Đơn hàng đã hủy hoặc hết hạn" and has the button back to the plans page', async (status) => {
    renderApp(<OrderReturnPage />, { routes: { [CHECK]: answer(status), [READ]: answer(status) } });
    expect(await screen.findByText('Đơn hàng đã hủy hoặc hết hạn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đến trang Gói học' })).toHaveAttribute('href', '/vi/app/plans');
    expect(screen.queryByText(/^Đang chờ xác nhận thanh toán$/)).not.toBeInTheDocument();
  });

  it('the waiting dot blinks while the order is pending; a cancelled or expired order has a still dot', async () => {
    // The dot is decoration (aria-hidden) inside the page's status element: its blink is the animation class.
    const blinking = () => screen.getByRole('status').querySelectorAll('.animate-wm-pulse').length;
    const pending = renderApp(<OrderReturnPage />, { routes: { [CHECK]: answer('pending'), [READ]: answer('pending') } });
    await screen.findByRole('heading', { level: 1, name: 'Đang chờ xác nhận thanh toán' });
    expect(blinking()).toBe(1);
    pending.unmount();
    renderApp(<OrderReturnPage />, { routes: { [CHECK]: answer('expired'), [READ]: answer('expired') } });
    await screen.findByRole('heading', { level: 1, name: 'Đơn hàng đã hủy hoặc hết hạn' });
    expect(blinking()).toBe(0);
  });

  it('a check that fails (429, 404) does not stop the page from reading the order', async () => {
    renderApp(<OrderReturnPage />, { routes: { [CHECK]: () => problem(429, 'rate-limited'), [READ]: answer('paid') } });
    expect(await screen.findByText(/^Thanh toán thành công$/)).toBeInTheDocument();
  });

  it('no ?order= (or one that is not an id): "Không tìm thấy đơn hàng" and the way to the plans page; the API is not asked', async () => {
    for (const query of ['', 'order=not-an-id']) {
      search = query;
      const view$ = renderApp(<OrderReturnPage />, { routes: {} });
      expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy đơn hàng' })).toBeInTheDocument();
      expect(screen.getByText('Bạn có thể tạo đơn mới tại trang Gói học.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Đến trang Gói học' })).toHaveAttribute('href', '/vi/app/plans');
      expect(view$.calls.filter((c) => c.path.startsWith('/v1/me/orders'))).toEqual([]);
      view$.unmount();
    }
  });

  it('an order that is not this learner\'s (404) says it cannot be found, with the way to the plans page', async () => {
    renderApp(<OrderReturnPage />, { routes: { [CHECK]: () => problem(404, 'not-found'), [READ]: () => problem(404, 'not-found') } });
    expect(await screen.findByText('Không tìm thấy đơn hàng')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đến trang Gói học' })).toBeInTheDocument();
  });

  it('English', async () => {
    renderApp(<OrderReturnPage />, { locale: 'en', routes: { [CHECK]: answer('pending'), [READ]: answer('paid') } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Payment received' })).toBeInTheDocument();
    expect(screen.getByText(/^Pro is active through/)).toHaveTextContent('Pro is active through Dec 5, 2026.');
    expect(screen.getByRole('link', { name: 'Start learning' })).toHaveAttribute('href', '/en/app');
  });
});
