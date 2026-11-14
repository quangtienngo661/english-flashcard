// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Tag } from './Tag';

describe('Tag', () => {
  it('sets its text in the label style, 12px / 500 (text-wm-meta)', () => {
    render(<Tag tone="accent">Câu AI</Tag>);
    expect(screen.getByText('Câu AI')).toHaveClass('text-wm-meta');
  });
});
