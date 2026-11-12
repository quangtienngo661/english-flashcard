// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test-utils/render-app';
import { LevelBar } from './LevelBar';

// Part 10 P.8 (mockup L185-193): one segment per non-empty level, a legend with every level's count and name.
describe('LevelBar', () => {
  it('draws one segment per non-empty level, each named with its count and interval', () => {
    renderApp(<LevelBar counts={[6, 0, 9, 11, 0, 4]} />);
    const bar = screen.getByRole('figure', { name: 'Số từ theo bậc' });
    expect(within(bar).getAllByRole('img').map((s) => s.getAttribute('aria-label'))).toEqual([
      'Mới · 6 từ', 'Bậc 2 · 9 từ · ôn lại sau 3 ngày', 'Bậc 3 · 11 từ · ôn lại sau 7 ngày', 'Bậc 5 · 4 từ · ôn lại sau 30 ngày',
    ]);
  });

  it('the legend lists every level with its count, untruncated', () => {
    renderApp(<LevelBar counts={[6, 0, 9, 11, 0, 4]} />);
    const legend = screen.getByRole('list', { name: 'Số từ theo bậc' });
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '6 Mới', '0 Bậc 1', '9 Bậc 2', '11 Bậc 3', '0 Bậc 4', '4 Bậc 5',
    ]);
    within(legend).getAllByRole('listitem').forEach((li) => expect(li.className).not.toMatch(/truncate/));
  });

  it('focusing a segment shows its name, count and interval', async () => {
    renderApp(<LevelBar counts={[0, 2, 0, 0, 0, 0]} />);
    await userEvent.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Bậc 1 · 2 từ · ôn lại sau 1 ngày');
  });

  it('English names the levels', () => {
    renderApp(<LevelBar counts={[1, 3, 0, 0, 0, 0]} />, { locale: 'en' });
    expect(screen.getByRole('figure', { name: 'Words by level' })).toBeInTheDocument();
    expect(screen.getAllByRole('img').map((s) => s.getAttribute('aria-label'))).toEqual(['New · 1 word', 'Level 1 · 3 words · review in 1 day']);
  });

  it('size lg is 12 px high, md 10 px', () => {
    const { unmount } = renderApp(<LevelBar counts={[1, 0, 0, 0, 0, 0]} size="lg" />);
    expect(screen.getByRole('img').parentElement).toHaveClass('h-3');
    unmount();
    renderApp(<LevelBar counts={[1, 0, 0, 0, 0, 0]} />);
    expect(screen.getByRole('img').parentElement).toHaveClass('h-2.5');
  });
});
