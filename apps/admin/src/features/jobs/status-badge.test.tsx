import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'use-intl';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { StatusBadge } from './StatusBadge';

const wrap = (ui: React.ReactNode) => render(<IntlProvider locale="vi" messages={vi}>{ui}</IntlProvider>);

describe('StatusBadge', () => {
  it('partial uses the warning tone', () => {
    wrap(<StatusBadge status="partial" />);
    expect(screen.getByText(vi.status.partial).className).toEqual(expect.stringContaining('bg-accent-soft'));
    expect(screen.getByText(vi.status.partial).className).toEqual(expect.stringContaining('text-warning'));
  });

  it('running with progress 1200/3200 draws a 37.5% bar hidden from screen readers', () => {
    const { container } = wrap(<StatusBadge status="running" progress={{ done: 1200, total: 3200 }} />);
    const bar = container.querySelector('[aria-hidden="true"] > span') as HTMLElement | null;
    expect(bar?.style.width).toBe('37.5%');
  });

  it('a finished status draws no bar', () => {
    const { container } = wrap(<StatusBadge status="succeeded" progress={{ done: 3200, total: 3200 }} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
