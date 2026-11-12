// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Tabs } from './Tabs';

// Part 10 P.4 (mockup L174–177): underline tabs; a tablist of buttons, or a nav of links when hrefs are given.
const ITEMS = [
  { id: 'all', label: 'Tất cả', count: 12 },
  { id: 'due', label: 'Đến hạn', count: 3 },
  { id: 'new', label: 'Mới' },
];

function Harness({ onSelect }: { onSelect?: (id: string) => void }) {
  const [selected, setSelected] = useState('all');
  return <Tabs label="Lọc" items={ITEMS} selected={selected} onSelect={(id) => { onSelect?.(id); setSelected(id); }} />;
}

describe('Tabs', () => {
  it('is a tablist whose selected tab has aria-selected; the count is part of the name', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Lọc' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tất cả 12' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Đến hạn 3' })).toHaveAttribute('aria-selected', 'false');
  });

  it('arrow keys move the selection and the focus, and wrap at the ends', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'Tất cả 12' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Đến hạn 3' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Đến hạn 3' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Tất cả 12' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Mới' })).toHaveAttribute('aria-selected', 'true');
    expect(onSelect.mock.calls.map(([id]) => id)).toEqual(['due', 'new', 'all', 'new']);
  });

  it('only the selected tab is in the tab order', () => {
    render(<Harness />);
    expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  });

  it('clicking a tab selects it', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('tab', { name: 'Mới' }));
    expect(screen.getByRole('tab', { name: 'Mới' })).toHaveAttribute('aria-selected', 'true');
  });

  it('with hrefs it is a nav of links; the selected one is aria-current', () => {
    render(<Tabs label="Mục" items={ITEMS} selected="all" hrefs={{ all: '#nghia', due: '#cau', new: '#dang' }} />);
    expect(screen.getByRole('navigation', { name: 'Mục' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tất cả 12' })).toHaveAttribute('href', '#nghia');
    expect(screen.getByRole('link', { name: 'Tất cả 12' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Mới' })).not.toHaveAttribute('aria-current');
  });
});
