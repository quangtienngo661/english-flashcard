// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { StatusDot } from './StatusDot';

describe('StatusDot', () => {
  it('shows its label, and the dot adds no text', () => {
    const { container } = render(<StatusDot tone="pass">Thành công</StatusDot>);
    expect(screen.getByText('Thành công')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveTextContent(/^Thành công$/);
  });

  it.each(['accent', 'muted', 'ghost', 'fail'] as const)('tone %s shows the same label', (tone) => {
    const { container } = render(<StatusDot tone={tone}>Đã hoàn tiền</StatusDot>);
    expect(container.textContent).toBe('Đã hoàn tiền');
  });
});
