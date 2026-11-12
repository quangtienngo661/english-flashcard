// @vitest-environment jsdom
import { act, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { renderApp } from '@/test-utils/render-app';
import { showStreak, StreakToast } from './StreakToast';

describe('StreakToast (đợt C DC9)', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('shows "13 ngày liên tiếp" in a status region, then leaves after 3 s', async () => {
    renderApp(<StreakToast />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
    act(() => showStreak(13));
    expect(region).toHaveTextContent('13 ngày liên tiếp');
    act(() => vi.advanceTimersByTime(2_900));
    expect(region).toHaveTextContent('13 ngày liên tiếp');
    act(() => vi.advanceTimersByTime(600));
    expect(region).toBeEmptyDOMElement();
  });

  it('never takes a tap: the toast lets pointer events through', () => {
    renderApp(<StreakToast />);
    act(() => showStreak(2));
    expect(screen.getByRole('status')).toHaveClass('pointer-events-none');
  });

  it('a second streak replaces the first: one toast, the newer number, a fresh 3 s', () => {
    renderApp(<StreakToast />);
    act(() => showStreak(1));
    act(() => vi.advanceTimersByTime(2_000));
    act(() => showStreak(2));
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('2 ngày liên tiếp');
    expect(region).not.toHaveTextContent('1 ngày liên tiếp');
    act(() => vi.advanceTimersByTime(2_000));
    expect(region).toHaveTextContent('2 ngày liên tiếp');
  });

  it('English: "13-day streak"', () => {
    renderApp(<StreakToast />, { locale: 'en' });
    act(() => showStreak(13));
    expect(screen.getByRole('status')).toHaveTextContent('13-day streak');
  });

  it('placement: bottom centre by default; the session corner sits under its bar, at the right (mockup L1192)', () => {
    const { unmount } = renderApp(<StreakToast />);
    expect(screen.getByRole('status')).toHaveClass('fixed', 'bottom-28');
    unmount();
    renderApp(<StreakToast placement="session-corner" />);
    expect(screen.getByRole('status')).toHaveClass('absolute', 'top-full', 'right-4');
  });

  it('P.17: while a session corner toast is mounted the bottom one stays empty, so a streak shows once; it comes back when the session goes', () => {
    function Screens() {
      const [session, setSession] = useState(true);
      return (
        <>
          <StreakToast />
          {session && <StreakToast placement="session-corner" />}
          <button type="button" onClick={() => setSession(false)}>leave</button>
        </>
      );
    }
    renderApp(<Screens />);
    act(() => showStreak(5));
    expect(screen.getAllByText('5 ngày liên tiếp')).toHaveLength(1);
    const [bottom, corner] = screen.getAllByRole('status');
    expect(bottom).toBeEmptyDOMElement();
    expect(corner).toHaveTextContent('5 ngày liên tiếp');
    fireEvent.click(screen.getByRole('button', { name: 'leave' }));
    expect(screen.getByRole('status')).toHaveTextContent('5 ngày liên tiếp');
  });

  it('P.17: a toast mounted after a streak was shown does not show it again (a Học session opened later the same day)', () => {
    renderApp(<StreakToast />);
    act(() => showStreak(8));
    act(() => vi.advanceTimersByTime(4_000));
    function Later() {
      const [open, setOpen] = useState(false);
      return (
        <>
          {open && <StreakToast placement="session-corner" />}
          <button type="button" onClick={() => setOpen(true)}>open</button>
        </>
      );
    }
    renderApp(<Later />);
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.queryByText('8 ngày liên tiếp')).not.toBeInTheDocument();
  });
});
