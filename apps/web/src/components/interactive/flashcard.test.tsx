// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Flashcard } from './Flashcard';

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('Flashcard', () => {
  it('LP22 click and Enter flip the card and toggle aria-pressed', async () => {
    mockReducedMotion(false);
    const user = userEvent.setup();
    render(<Flashcard word="deploy" meaning="triển khai" hint="Chạm để lật" />);
    const card = screen.getByRole('button', { name: /deploy/ });
    expect(card).toHaveAttribute('aria-pressed', 'false');
    await user.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    card.focus();
    await user.keyboard('{Enter}');
    expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  it('LP26 with reduced motion the card has no flip transition', () => {
    mockReducedMotion(true);
    render(<Flashcard word="deploy" meaning="triển khai" hint="Chạm để lật" />);
    expect(screen.getByTestId('flashcard-inner')).not.toHaveClass('transition-transform');
  });
});
