// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LanguageSwitch } from './LanguageSwitch';

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/privacy',
  Link: ({ href, locale, children, ...rest }: { href: string; locale: string; children: ReactNode }) => (
    <a href={`/${locale}${href}`} {...rest}>
      {children}
    </a>
  ),
}));

describe('LanguageSwitch', () => {
  it('marks the current locale with aria-current and links the other locale to the same path', () => {
    render(<LanguageSwitch current="vi" label="Ngôn ngữ" />);
    const group = screen.getByRole('group', { name: 'Ngôn ngữ' });
    const vi = screen.getByRole('link', { name: 'VI' });
    const en = screen.getByRole('link', { name: 'EN' });
    expect(group).toContainElement(vi);
    expect(vi).toHaveAttribute('aria-current', 'true');
    expect(vi).toHaveClass('bg-ink');
    expect(en).not.toHaveAttribute('aria-current');
    // White, not on-primary-muted: on the 15% white wash over blue the muted tone measured 4.1:1 (axe, LP25).
    expect(en).toHaveClass('text-on-primary');
    expect(en).not.toHaveClass('text-on-primary-muted');
    expect(en).toHaveAttribute('href', '/en/privacy');
    expect(vi).toHaveAttribute('lang', 'vi');
    expect(en).toHaveAttribute('lang', 'en');
  });
});
