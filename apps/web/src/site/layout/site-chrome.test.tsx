// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import vi_ from '../../../messages/vi.json';
import { ThemeProvider } from '@/app-shell/theme/ThemeProvider';
import { THEME_STORAGE_KEY } from '@/app-shell/theme/theme';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** The public chrome reads `Nav`, `Footer` and `App.chrome.brand` (the logo) on the server; here the intl provider stands in for it. */
function renderChrome(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="vi" messages={{ App: vi_.App, Nav: vi_.Nav, Footer: vi_.Footer }} timeZone="UTC">
      <ThemeProvider>{ui}</ThemeProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('js');
  document.documentElement.removeAttribute('data-wm-motion');
  delete document.documentElement.dataset.theme;
  vi.useRealTimers();
});

describe('SiteHeader', () => {
  it('QM8-1a Đăng nhập then Đăng ký, each a plain anchor into the app (a full page load, LB3E6)', () => {
    renderChrome(<SiteHeader locale="vi" />);
    const header = within(screen.getByRole('banner'));
    const login = header.getByRole('link', { name: 'Đăng nhập' });
    const signup = header.getByRole('link', { name: 'Đăng ký' });
    expect(login.getAttribute('href')).toBe('/vi/app/login');
    expect(signup.getAttribute('href')).toBe('/vi/app/register');
    expect(login.compareDocumentPosition(signup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // fireEvent returns false when a handler (next/link) called preventDefault.
    expect(fireEvent.click(login)).toBe(true);
    expect(fireEvent.click(signup)).toBe(true);
  });

  it('QM8-1a′ Đăng ký is the navy primary button, Đăng nhập the white secondary one', () => {
    renderChrome(<SiteHeader locale="vi" />);
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('data-variant', 'primary');
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('data-variant', 'secondary');
  });

  it('the logo goes home and the three page links point at the home page sections, so they work from the legal pages too', () => {
    renderChrome(<SiteHeader locale="vi" />);
    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('link', { name: 'Wordmet' }).getAttribute('href')).toBe('/vi');
    const nav = within(header.getByRole('navigation'));
    expect(nav.getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Nhóm từ', '/vi#nhom-tu'],
      ['Cách học', '/vi#cach-hoc'],
      ['Giá', '/vi#gia'],
    ]);
  });

  it('QM8-1b the header holds the theme switch, labelled for the switch it would make', () => {
    renderChrome(<SiteHeader locale="vi" />);
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Chuyển sang giao diện tối' })).toBeInTheDocument();
  });
});

describe('SiteFooter', () => {
  it('has the four links of Figma 7:209 and the year from the clock', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T08:00:00Z'));
    renderChrome(<SiteFooter locale="vi" />);
    const footer = within(screen.getByRole('contentinfo'));
    // The logo is a link home: AppLogo's aria-label needs a link around it (axe aria-prohibited-attr on a bare span, LR27).
    expect(footer.getByRole('link', { name: 'Wordmet' }).getAttribute('href')).toBe('/vi');
    expect(footer.getAllByRole('link').slice(1).map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Chính sách bảo mật', '/vi/privacy'],
      ['Điều khoản sử dụng', '/vi/terms'],
      ['Nguồn dữ liệu', '/vi/sources'],
      ['Liên hệ', 'mailto:contact@wordmet.com'],
    ]);
    expect(footer.getByText('© 2026 Wordmet')).toBeInTheDocument();
  });

  it('QM8-1b′ the phone theme control switches data-theme and stores the choice under wordmet-web.theme', async () => {
    const user = userEvent.setup();
    renderChrome(<SiteFooter locale="vi" />);
    const group = within(screen.getByRole('radiogroup', { name: 'Giao diện' }));
    expect(group.getByRole('radio', { name: 'Sáng' })).toBeChecked();

    await user.click(group.getByRole('radio', { name: 'Tối' }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(group.getByRole('radio', { name: 'Tối' })).toBeChecked();

    await user.click(group.getByRole('radio', { name: 'Sáng' }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  // T10 (QA7): a way to stop the landing's loops for readers who have not set reduced motion on their device (WCAG 2.2.2).
  it('the motion switch turns the site motion off and on and remembers the choice under wordmet-web.motion', async () => {
    const user = userEvent.setup();
    document.documentElement.classList.add('js');
    renderChrome(<SiteFooter locale="vi" />);
    const group = within(screen.getByRole('radiogroup', { name: 'Chuyển động' }));
    expect(group.getByRole('radio', { name: 'Bật' })).toBeChecked();

    await user.click(group.getByRole('radio', { name: 'Tắt' }));
    expect(localStorage.getItem('wordmet-web.motion')).toBe('off');
    expect(document.documentElement.classList.contains('js')).toBe(false);
    expect(document.documentElement.getAttribute('data-wm-motion')).toBe('off');
    expect(group.getByRole('radio', { name: 'Tắt' })).toBeChecked();

    await user.click(group.getByRole('radio', { name: 'Bật' }));
    expect(localStorage.getItem('wordmet-web.motion')).toBe('on');
    expect(document.documentElement.classList.contains('js')).toBe(true);
    expect(document.documentElement.hasAttribute('data-wm-motion')).toBe(false);
    expect(group.getByRole('radio', { name: 'Bật' })).toBeChecked();
  });

  it('a page loaded with motion off shows "Tắt" chosen', () => {
    document.documentElement.setAttribute('data-wm-motion', 'off');
    renderChrome(<SiteFooter locale="vi" />);
    expect(within(screen.getByRole('radiogroup', { name: 'Chuyển động' })).getByRole('radio', { name: 'Tắt' })).toBeChecked();
  });

  it('with reduced motion set on the device the switch shows "Tắt", is disabled and says why', () => {
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    renderChrome(<SiteFooter locale="vi" />);
    const radiogroup = screen.getByRole('radiogroup', { name: 'Chuyển động' });
    const group = within(radiogroup);
    expect(group.getByRole('radio', { name: 'Tắt' })).toBeChecked();
    expect(group.getByRole('radio', { name: 'Bật' })).toBeDisabled();
    expect(group.getByRole('radio', { name: 'Tắt' })).toBeDisabled();
    expect(radiogroup).toHaveAccessibleDescription('Theo cài đặt máy');
  });
});
