// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test-utils/render-app';
import { CalendarBarButton } from './CalendarBarButton';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/practice/session',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
const calendar = { isOpen: false, openMonth: vi.fn(), openDay: vi.fn(), backToMonth: vi.fn(), close: vi.fn() };
vi.mock('@/features/learner/calendar/calendar-context', () => ({ useCalendar: () => calendar }));

const desktop = (on: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('min-width'), media: query, addEventListener: () => {}, removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};
const media = window.matchMedia;
const streak = { 'GET /v1/me/streak': () => Response.json({ days: 6, studied_today: true }) };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-08T03:00:00Z'));
  calendar.openMonth.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = media;
});

describe('CalendarBarButton (Figma 95:344, M6.9)', () => {
  it('phone: month strip and today, no streak badge; a press opens Lịch', async () => {
    desktop(false);
    renderApp(<CalendarBarButton />, { routes: streak });
    const button = await screen.findByRole('button', { name: 'Lịch học' });
    expect(button).toHaveAttribute('aria-keyshortcuts', 'L');
    expect(button).toHaveTextContent(/^T118$/);
    expect(within(button).queryByText('6')).toBeNull();
    await userEvent.click(button);
    expect(calendar.openMonth).toHaveBeenCalledTimes(1);
  });

  it('English month strip reads "Nov"', async () => {
    desktop(false);
    renderApp(<CalendarBarButton />, { locale: 'en' });
    expect(await screen.findByRole('button', { name: 'Study calendar' })).toHaveTextContent(/^Nov8$/);
  });

  it('desktop: nothing in the bar (the floating button of the focus layout stays)', () => {
    desktop(true);
    renderApp(<CalendarBarButton />);
    expect(screen.queryByRole('button', { name: 'Lịch học' })).toBeNull();
  });
});
