import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BreakableEmail } from './BreakableEmail';

describe('BreakableEmail', () => {
  it('offers a line break before the @ and keeps the text unchanged', () => {
    const { container } = render(<BreakableEmail email="e2e-lan-60a2363d@example.com" />);
    expect(container.textContent).toBe('e2e-lan-60a2363d@example.com');
    expect(container.querySelectorAll('wbr')).toHaveLength(1);
    expect(container.querySelector('wbr')!.previousSibling?.textContent).toBe('e2e-lan-60a2363d');
  });

  it('leaves a label without an @ (a name such as "Hệ thống") as plain text', () => {
    const { container } = render(<BreakableEmail email="Hệ thống" />);
    expect(container.textContent).toBe('Hệ thống');
    expect(container.querySelector('wbr')).toBeNull();
  });
});
