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
    expect(en).not.toHaveAttribute('aria-current');
    expect(en).toHaveAttribute('href', '/en/privacy');
    expect(vi).toHaveAttribute('lang', 'vi');
    expect(en).toHaveAttribute('lang', 'en');
  });
});
