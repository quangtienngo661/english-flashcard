// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { renderApp } from '@/app-ui/test-utils';
import { STREAK_KEY, useStreak, writeStreak, type Streak } from './calendar-api';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

function StreakText() {
  const streak = useStreak();
  return <p>{streak.data ? `days ${streak.data.days} ${streak.data.studied_today}` : 'none'}</p>;
}

describe('streak query (M6.2)', () => {
  it('renderApp answers GET /v1/me/streak by default with no streak', async () => {
    const { count } = renderApp(<StreakText />);
    expect(await screen.findByText('days 0 false')).toBeInTheDocument();
    expect(count('GET', '/v1/me/streak')).toBe(1);
  });

  it('renderApp with the chrome and no extra routes does not throw', async () => {
    renderApp(<p>trang</p>, { chrome: true });
    expect(await screen.findByText('trang')).toBeInTheDocument();
  });

  it('writeStreak puts the answer\'s days in the cache with studied_today', () => {
    const { client } = renderApp(<p />);
    writeStreak(client, 6);
    expect(client.getQueryData<Streak>(STREAK_KEY)).toEqual({ days: 6, studied_today: true });
  });
});
