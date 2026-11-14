// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test-utils/render-app';
import { makeMe } from '@/app-shell/session/test-support';

let pathname = '/vi/app';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
const calendar = { isOpen: false, openMonth: vi.fn(), openDay: vi.fn(), backToMonth: vi.fn(), close: vi.fn() };
vi.mock('@/features/learner/calendar/calendar-context', () => ({ useCalendar: () => calendar }));

const streak = (days: number) => ({ 'GET /v1/me/streak': () => Response.json({ days, studied_today: days > 0 }) });
const desktop = (on: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('min-width'), media: query, addEventListener: () => {}, removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};
const media = window.matchMedia;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-08T03:00:00Z'));
  pathname = '/vi/app';
  calendar.isOpen = false;
  calendar.openMonth.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = media;
});

describe('CalendarButton and the floating stack (Figma 95:343, M6 Figma A §6)', () => {
  it('shows the month strip, today in the learner zone and the streak badge', async () => {
    renderApp(<p>trang</p>, { chrome: true, me: makeMe({ timezone: 'Asia/Ho_Chi_Minh' }), routes: streak(6) });
    const button = await screen.findByRole('button', { name: 'Lịch học' });
    expect(button).toHaveAttribute('aria-keyshortcuts', 'L');
    expect(button).toHaveTextContent('T11');
    expect(within(button).getByText('8')).toBeInTheDocument();
    expect(await within(button).findByText('6')).toBeInTheDocument();
    expect(button).toHaveAccessibleDescription('6 ngày liên tiếp');
  });

  it('English month strip reads "Nov"', async () => {
    renderApp(<p>page</p>, { chrome: true, locale: 'en', routes: streak(6) });
    expect(await screen.findByRole('button', { name: 'Study calendar' })).toHaveTextContent('Nov');
  });

  it('no badge at 0 days', async () => {
    renderApp(<p>trang</p>, { chrome: true, routes: streak(0) });
    const button = await screen.findByRole('button', { name: 'Lịch học' });
    expect(button).toHaveTextContent(/^T118Lịch họcL$/);
    expect(within(button).queryByText('0')).toBeNull();
  });

  it('a click opens the month', async () => {
    renderApp(<p>trang</p>, { chrome: true });
    await userEvent.click(await screen.findByRole('button', { name: 'Lịch học' }));
    expect(calendar.openMonth).toHaveBeenCalledTimes(1);
  });

  it('phone Hôm nay: the calendar button, then "+" (Thêm từ), in that order', async () => {
    renderApp(<p>trang</p>, { chrome: true });
    const calendarButton = await screen.findByRole('button', { name: 'Lịch học' });
    const add = screen.getByRole('button', { name: 'Thêm từ' });
    expect(calendarButton.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('phone Từ tồn đọng and Chủ đề hide the calendar button; other screens have no "+"', async () => {
    for (const path of ['/vi/app/group/backlog', '/vi/app/topic']) {
      pathname = path;
      const view = renderApp(<p>trang</p>, { chrome: true });
      await screen.findByText('trang');
      expect(screen.queryByRole('button', { name: 'Lịch học' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Thêm từ' })).toBeNull();
      view.unmount();
    }
  });

  it('desktop: the calendar button stays on Từ tồn đọng, and there is no floating "+"', async () => {
    desktop(true);
    pathname = '/vi/app/group/backlog';
    renderApp(<p>trang</p>, { chrome: true });
    expect(await screen.findByRole('button', { name: 'Lịch học' })).toBeInTheDocument();
    pathname = '/vi/app';
    expect(screen.queryByRole('button', { name: 'Thêm từ' })).toBeNull();
  });

  it('hidden while Lịch or Ngày is open', async () => {
    calendar.isOpen = true;
    renderApp(<p>trang</p>, { chrome: true });
    await screen.findByText('trang');
    expect(screen.queryByRole('button', { name: 'Lịch học' })).toBeNull();
  });
});
