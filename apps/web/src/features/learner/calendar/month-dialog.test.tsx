// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import { MonthDialog } from './MonthDialog';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// M6 Figma A §2: November 2026, today Sunday 08/11, a run 03–08/11, streak 6.
const NOVEMBER = {
  month: '2026-11',
  days: [
    { date: '2026-11-01', learned: 5, reviewed: 8, practice_sessions: 0 },
    { date: '2026-11-03', learned: 10, reviewed: 20, practice_sessions: 1 },
    { date: '2026-11-04', learned: 8, reviewed: 18, practice_sessions: 0 },
    { date: '2026-11-05', learned: 10, reviewed: 22, practice_sessions: 1 },
    { date: '2026-11-06', learned: 0, reviewed: 20, practice_sessions: 0 },
    { date: '2026-11-07', learned: 12, reviewed: 22, practice_sessions: 1 },
    { date: '2026-11-08', learned: 10, reviewed: 20, practice_sessions: 1 },
  ],
  totals: { study_days: 7, learned: 55, reviewed: 130, practice_sessions: 4 },
};
const routes = (over = {}) => ({
  'GET /v1/me/calendar?month=2026-11': () => Response.json(NOVEMBER),
  'GET /v1/me/streak': () => Response.json({ days: 6, studied_today: true }),
  ...over,
});
const props = () => ({ month: '2026-11', today: '2026-11-08', onMonth: vi.fn(), onDay: vi.fn(), onClose: vi.fn() });

describe('MonthDialog (Figma 102:3278 / 102:3948)', () => {
  it('head, totals and day labels of the sample month', async () => {
    renderApp(<MonthDialog {...props()} />, { routes: routes() });
    const dialog = await screen.findByRole('dialog', { name: 'Tháng 11, 2026' });
    expect(within(dialog).getByText('lịch học')).toBeInTheDocument();
    expect(await within(dialog).findByText('6 ngày liên tiếp')).toBeInTheDocument();
    const totals = await within(dialog).findByRole('list', { name: 'Tổng tháng' });
    expect(within(totals).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '7/8Ngày có học', '55Từ mới đã học', '130Lượt ôn', '4Phiên luyện',
    ]);
    expect(within(dialog).getByRole('button', { name: 'Tháng sau' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Tháng trước' })).toBeEnabled();
    expect(within(dialog).queryByRole('button', { name: 'Về hôm nay' })).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Thứ Năm 5/11: học 10 từ, ôn 22 lượt, luyện 1 phiên' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Thứ Hai 2/11: không học' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Thứ Sáu 6/11: ôn 20 lượt' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Thứ Hai 9/11: chưa tới' })).toBeDisabled();
    // Ghost days of October are not buttons.
    expect(within(dialog).queryByRole('button', { name: /26\/10/ })).toBeNull();
    expect(within(dialog).getByRole('button', { name: /^Chủ Nhật 8\/11/ })).toHaveFocus();
  });

  it('no streak pill at 0', async () => {
    renderApp(<MonthDialog {...props()} />, { routes: routes({ 'GET /v1/me/streak': () => Response.json({ days: 0, studied_today: false }) }) });
    await screen.findByRole('list', { name: 'Tổng tháng' });
    expect(screen.queryByText(/ngày liên tiếp/)).toBeNull();
  });

  it('arrow keys move the selected day; Enter opens it', async () => {
    const p = props();
    renderApp(<MonthDialog {...p} />, { routes: routes() });
    await screen.findByRole('list', { name: 'Tổng tháng' });
    await waitFor(() => expect(screen.getByRole('button', { name: /^Chủ Nhật 8\/11/ })).toHaveFocus());
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: /^Thứ Bảy 7\/11/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowUp}');
    expect(screen.getByRole('button', { name: /^Chủ Nhật 1\/11/ })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Về hôm nay' })).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(p.onDay).toHaveBeenCalledWith('2026-11-01');
  });

  it('ArrowRight from today stays (the future is closed); ArrowUp from 01/11 moves to October', async () => {
    const p = props();
    renderApp(<MonthDialog {...p} />, { routes: routes() });
    await screen.findByRole('list', { name: 'Tổng tháng' });
    await waitFor(() => expect(screen.getByRole('button', { name: /^Chủ Nhật 8\/11/ })).toHaveFocus());
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /^Chủ Nhật 8\/11/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(p.onMonth).toHaveBeenCalledWith('2026-10');
  });

  it('"Tháng trước" asks for the previous month; a click on a day opens it', async () => {
    const p = props();
    renderApp(<MonthDialog {...p} />, { routes: routes() });
    await userEvent.click(await screen.findByRole('button', { name: 'Tháng trước' }));
    expect(p.onMonth).toHaveBeenCalledWith('2026-10');
    expect(screen.getByRole('button', { name: 'Tháng trước' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: /^Thứ Tư 4\/11/ }));
    expect(p.onDay).toHaveBeenCalledWith('2026-11-04');
  });

  it('January 2026 is the floor: "Tháng trước" is disabled', async () => {
    renderApp(<MonthDialog {...props()} month="2026-01" />, { routes: routes({
      'GET /v1/me/calendar?month=2026-01': () => Response.json({ ...NOVEMBER, month: '2026-01', days: [], totals: { study_days: 0, learned: 0, reviewed: 0, practice_sessions: 0 } }),
    }) });
    expect(await screen.findByRole('dialog', { name: 'Tháng 1, 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tháng trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tháng sau' })).toBeEnabled();
    expect(await screen.findByText('/31')).toBeInTheDocument();
  });

  it('a 500 shows "Không tải được lịch." and Thử lại asks again', async () => {
    let calls = 0;
    renderApp(<MonthDialog {...props()} />, { routes: routes({
      'GET /v1/me/calendar?month=2026-11': () => {
        calls += 1;
        return calls === 1 ? Response.json({ type: 'about:blank', title: 'x', status: 500 }, { status: 500 }) : Response.json(NOVEMBER);
      },
    }) });
    expect(await screen.findByText('Không tải được lịch.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('list', { name: 'Tổng tháng' })).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('Esc closes', async () => {
    const p = props();
    renderApp(<MonthDialog {...p} />, { routes: routes() });
    await screen.findByRole('list', { name: 'Tổng tháng' });
    await userEvent.keyboard('{Escape}');
    expect(p.onClose).toHaveBeenCalled();
  });
});
