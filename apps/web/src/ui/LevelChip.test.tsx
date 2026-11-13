// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelChip } from './LevelChip';

// Part 10 P.4 (mockup L161–173): a level filter chip; its name and count read as one toggle button.
describe('LevelChip', () => {
  it('reads "Bậc 3 11" as one button with aria-pressed', () => {
    render(<LevelChip tone={3} label="Bậc 3" count={11} pressed={false} onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Bậc 3 11' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('a pressed chip says so', () => {
    render(<LevelChip tone="all" label="Tất cả" count={40} pressed onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Tất cả 40' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('pressing calls onPress once, by click and by Enter', async () => {
    const onPress = vi.fn();
    render(<LevelChip tone="due" label="Đến hạn" count={2} pressed={false} onPress={onPress} />);
    await userEvent.click(screen.getByRole('button', { name: 'Đến hạn 2' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Enter}');
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});
