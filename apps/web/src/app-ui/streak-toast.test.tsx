// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import { renderApp } from './test-utils';
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
});
