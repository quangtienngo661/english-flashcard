// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useInsertionEffect, useState } from 'react';
import { renderApp } from '@/test-utils/render-app';
import { CalendarHost } from './CalendarHost';
import { useCalendar } from './calendar-context';

vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const MONTH = { month: '2026-11', days: [], totals: { study_days: 0, learned: 0, reviewed: 0, practice_sessions: 0 } };
const DAY = {
  date: '2026-11-05', counts: { learned: 0, reviewed: 0, reviewed_known: 0, reviewed_again: 0, learned_groups: 0, practice_questions: 0 },
  items: [], practice_sessions: [], next_page_token: null,
};
const routes = {
  'GET /v1/me/calendar?month=2026-11': () => Response.json(MONTH),
  'GET /v1/me/calendar?month=2026-10': () => Response.json({ ...MONTH, month: '2026-10' }),
  'GET /v1/me/calendar/days/2026-11-05?kind=all&page_size=100': () => Response.json(DAY),
  'GET /v1/practice/history?date=2026-11-05&page_size=100': () => Response.json({ items: [], next_page_token: null }),
  'GET /v1/groups': () => Response.json({ items: [] }),
};

function Controls() {
  const calendar = useCalendar();
  return (
    <div>
      <button type="button" onClick={() => calendar.openMonth()}>mở lịch</button>
      <button type="button" onClick={() => calendar.openDay('2026-11-05')}>mở ngày</button>
      <button type="button" onClick={() => calendar.backToMonth()}>về tháng</button>
      <button type="button" onClick={() => calendar.close()}>đóng</button>
      <input aria-label="ô gõ" />
      <p>{calendar.isOpen ? 'đang mở' : 'đang đóng'}</p>
    </div>
  );
}

const HistoryReplace = window.history.replaceState;
const go = (url: string) => window.history.replaceState(null, '', url);
let push: ReturnType<typeof vi.spyOn>;
let replace: ReturnType<typeof vi.spyOn>;
let back: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-08T03:00:00Z'));
  go('/vi/app/practice');
  push = vi.spyOn(window.history, 'pushState');
  replace = vi.spyOn(window.history, 'replaceState');
  back = vi.spyOn(window.history, 'back');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const host = () => renderApp(<CalendarHost><Controls /></CalendarHost>, { routes });
// jsdom's history.back is asynchronous and fires popstate; this waits for it.
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

describe('CalendarHost (design §5.6)', () => {
  it('FAB → Lịch → a day → back to the month → close: two pushes, two history.back', async () => {
    host();
    await userEvent.click(screen.getByRole('button', { name: 'mở lịch' }));
    expect(await screen.findByRole('dialog', { name: 'Tháng 11, 2026' })).toBeInTheDocument();
    expect(window.location.search).toBe('?lich=2026-11');
    expect(window.history.state?.wmCalendar).toBeTruthy();
    act(() => screen.getByRole('button', { name: 'mở ngày', hidden: true }).click());
    await waitFor(() => expect(window.location.search).toBe('?ngay=2026-11-05'));
    act(() => screen.getByRole('button', { name: 'về tháng', hidden: true }).click());
    await settle();
    expect(window.location.search).toBe('?lich=2026-11');
    act(() => screen.getByRole('button', { name: 'đóng', hidden: true }).click());
    await settle();
    expect(window.location.search).toBe('');
    expect(push).toHaveBeenCalledTimes(2);
    expect(back).toHaveBeenCalledTimes(2);
    expect(screen.getByText('đang đóng')).toBeInTheDocument();
  });

  it('"Tháng trước" replaces ?lich= with no new history step', async () => {
    host();
    await userEvent.click(screen.getByRole('button', { name: 'mở lịch' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Tháng trước' }));
    expect(await screen.findByRole('dialog', { name: 'Tháng 10, 2026' })).toBeInTheDocument();
    expect(window.location.search).toBe('?lich=2026-10');
    expect(push).toHaveBeenCalledTimes(1);
    expect(window.history.state?.wmCalendar).toBe(1);
  });

  it("review #1: our writes carry only the calendar marker, never Next's own history keys (so Next re-syncs its router)", async () => {
    window.history.replaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: {} }, '', '/vi/app/practice?lich=2026-10');
    replace.mockClear();
    host();
    expect(await screen.findByRole('dialog', { name: 'Tháng 10, 2026' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tháng trước' }));
    act(() => screen.getByRole('button', { name: 'mở ngày', hidden: true }).click());
    const written = [...push.mock.calls, ...replace.mock.calls].map((call: unknown[]) => call[0] as Record<string, unknown>);
    expect(written.length).toBeGreaterThan(1);
    for (const state of written) expect(Object.keys(state ?? {}).filter((k) => !k.startsWith('wm'))).toEqual([]);
  });

  it('review #5: keys typed in Lịch do not reach window listeners of the screen below (a session answering on 1 / 2)', async () => {
    const below = vi.fn();
    window.addEventListener('keydown', below);
    try {
      host();
      await userEvent.click(screen.getByRole('button', { name: 'mở lịch' }));
      await screen.findByRole('list', { name: 'Tổng tháng' });
      await userEvent.keyboard('1');
      expect(below.mock.calls.filter(([e]) => (e as KeyboardEvent).key === '1')).toHaveLength(0);
    } finally {
      window.removeEventListener('keydown', below);
    }
  });

  it('a Next navigation to ?ngay= (the history redirect) opens Ngày: Next writes the URL after its render, in an insertion effect', async () => {
    function NextLike() {
      const [to, setTo] = useState<string | null>(null);
      // Next's HistoryUpdater writes the URL in the commit, after the render that already read the old one.
      useInsertionEffect(() => {
        if (to) HistoryReplace.call(window.history, null, '', to);
      }, [to]);
      return (
        <CalendarHost>
          <Controls />
          <button type="button" onClick={() => setTo('/vi/app/practice?ngay=2026-11-05')}>điều hướng</button>
        </CalendarHost>
      );
    }
    renderApp(<NextLike />, { routes });
    await userEvent.click(screen.getByRole('button', { name: 'điều hướng' }));
    expect(await screen.findByRole('dialog', { name: '05/11' })).toBeInTheDocument();
  });

  it('arriving on ?ngay= from a link: replace with ?lich=<month>, then push ?ngay=', async () => {
    go('/vi/app/practice?ngay=2026-11-05');
    host();
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(replace.mock.calls.map((call: unknown[]) => call[2])).toContain('/vi/app/practice?lich=2026-11');
    expect(push.mock.calls[0][2]).toBe('/vi/app/practice?ngay=2026-11-05');
    expect(screen.getByText('đang mở')).toBeInTheDocument();
  });

  it('a dialog opened from a link closes by stripping the parameters, never by leaving', async () => {
    go('/vi/app/practice?lich=2026-10');
    host();
    expect(await screen.findByRole('dialog', { name: 'Tháng 10, 2026' })).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'đóng', hidden: true }).click());
    await settle();
    expect(back).not.toHaveBeenCalled();
    expect(window.location.pathname + window.location.search).toBe('/vi/app/practice');
  });

  it('?lich=2026-13: the URL becomes the bare path, no dialog', async () => {
    go('/vi/app/practice?lich=2026-13');
    host();
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('đang đóng')).toBeInTheDocument();
  });

  it('L opens and closes; L typed in a text box does nothing', async () => {
    host();
    await userEvent.type(screen.getByRole('textbox', { name: 'ô gõ' }), 'l');
    expect(screen.getByText('đang đóng')).toBeInTheDocument();
    (document.activeElement as HTMLElement).blur();
    await userEvent.keyboard('l');
    expect(await screen.findByRole('dialog', { name: 'Tháng 11, 2026' })).toBeInTheDocument();
    await userEvent.keyboard('l');
    await settle();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.search).toBe('');
  });
});
