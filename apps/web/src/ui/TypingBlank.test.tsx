// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TypingBlank } from './TypingBlank';

describe('TypingBlank', () => {
  it('shows the typed letters once and reserves the full word in an invisible aria-hidden copy', () => {
    const { container } = render(<TypingBlank word="mitigate" typed={3} done={false} motion={false} />);
    expect(screen.getByText('mit')).toBeInTheDocument();
    const copy = container.querySelector('[aria-hidden="true"]');
    expect(copy).toHaveTextContent('mitigate');
    expect(copy).toHaveClass('invisible');
  });
  it('turns green when done and has no minimum width', () => {
    const { container } = render(<TypingBlank word="viable" typed={6} done motion />);
    expect(container.firstChild).toHaveClass('border-wm-pass');
    expect(container.firstChild).not.toHaveClass('min-w-21');
  });
  it('shows the caret only while typing with motion', () => {
    const { container, rerender } = render(<TypingBlank word="viable" typed={2} done={false} motion />);
    expect(container.querySelector('.animate-wm-showcase-caret')).not.toBeNull();
    rerender(<TypingBlank word="viable" typed={2} done={false} motion={false} />);
    expect(container.querySelector('.animate-wm-showcase-caret')).toBeNull();
  });
});
