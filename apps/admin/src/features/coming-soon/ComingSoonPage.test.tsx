import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'use-intl';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { NAV, type NavEntry } from '../../app/nav';
import { ComingSoonPage } from './ComingSoonPage';

const item = (path: string) => NAV.find((n) => n.path === path)!;
const show = (path: string, over: Partial<NavEntry> = {}) =>
  render(
    <IntlProvider locale="vi" messages={vi}>
      <ComingSoonPage item={{ ...item(path), ...over }} />
    </IntlProvider>,
  );

describe('ComingSoonPage', () => {
  it('shows "Tính năng chưa có", the purpose line and "Dự kiến: Bước 5" for an entry with a planned step', () => {
    show('/dashboard', { plannedStep: '5' });
    expect(screen.getByText('Tính năng chưa có')).toBeInTheDocument();
    expect(screen.getByText(vi.comingSoon.purpose.dashboard)).toBeInTheDocument();
    expect(screen.getByText('Dự kiến: Bước 5')).toBeInTheDocument();
  });

  it('an item with no planned step says so', () => {
    show('/dashboard');
    expect(screen.getByText('Dự kiến: chưa xếp bước')).toBeInTheDocument();
  });

  it('an entry whose API is ready says so', () => {
    show('/dashboard', { etaNote: 'apiReady' });
    expect(screen.getByText('Dự kiến: chưa xếp bước (API đã có từ Bước 2)')).toBeInTheDocument();
  });

  it('every unavailable entry has a purpose in both languages', async () => {
    const en = (await import('../../../messages/en.json')).default;
    for (const n of NAV.filter((x) => !x.available)) {
      const id = n.labelKey.replace('nav.', '');
      expect((vi.comingSoon.purpose as Record<string, string>)[id], id).toBeTruthy();
      expect((en.comingSoon.purpose as Record<string, string>)[id], id).toBeTruthy();
    }
  });
});
