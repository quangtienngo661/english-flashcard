// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeMe } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { AppFooter } from './AppFooter';
import { AvatarMenu } from './AvatarMenu';
import { MobileTabBar } from './MobileTabBar';
import { PlanChip } from './PlanChip';
import { TopBar } from './TopBar';

// A marker on router links, so a test can tell them from plain anchors (the footer links that leave the app must be plain anchors, LB3E5).
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} data-router-link="" {...rest}>
      {children}
    </a>
  ),
}));

let pathname = '/vi/app';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

const entitlements = (plan: string) => ({ 'GET /v1/me/entitlements': () => Response.json({ plan, pools: {}, sources: [] }) });

beforeEach(() => {
  pathname = '/vi/app';
});

describe('app chrome', () => {
  it('TopBar marks the current tab with aria-current="page"', () => {
    pathname = '/vi/app/groups';
    renderApp(<TopBar features={{ addWord: false }} />, { routes: entitlements('free') });
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: /Nhóm/ })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: /Hôm nay/ })).not.toHaveAttribute('aria-current');
  });

  it('TopBar: the theme button switches light/dark at once instead of opening Cài đặt (owner 27/10/2026)', async () => {
    renderApp(<TopBar features={{ addWord: false }} />, { routes: entitlements('free') });
    await userEvent.click(screen.getByRole('button', { name: 'Chuyển sang giao diện tối' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    await userEvent.click(screen.getByRole('button', { name: 'Chuyển sang giao diện sáng' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
    expect(screen.queryByRole('link', { name: 'Cài đặt' })).not.toBeInTheDocument();
  });

  it('TopBar hides the Thêm từ button before M3', () => {
    renderApp(<TopBar features={{ addWord: false }} />, { routes: entitlements('free') });
    expect(screen.queryByRole('button', { name: /Thêm từ/ })).not.toBeInTheDocument();
  });

  it('PlanChip names the plan from GET /v1/me/entitlements', async () => {
    renderApp(<PlanChip />, { routes: entitlements('trial') });
    expect(await screen.findByText('Dùng thử')).toBeInTheDocument();
  });

  it('AvatarMenu (K/90): name, email, then Cài đặt · Gói học · Đăng xuất', async () => {
    renderApp(<AvatarMenu />, { me: makeMe({ given_name: 'Lan', family_name: 'Nguyễn' }), routes: entitlements('free') });
    await userEvent.click(await screen.findByRole('button', { name: 'Tài khoản của bạn' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Cài đặt', 'Gói họcMiễn phí', 'Đăng xuất']);
    expect(screen.getByText('Nguyễn Lan')).toBeInTheDocument();
    expect(screen.getByText('lan@example.com')).toBeInTheDocument();
  });

  it('AvatarMenu → Đăng xuất signs out', async () => {
    const { count } = renderApp(<AvatarMenu />, {
      routes: { ...entitlements('free'), 'POST /v1/auth/logout': () => new Response(null, { status: 204 }) },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tài khoản của bạn' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Đăng xuất' }));
    await waitFor(() => expect(count('POST', '/v1/auth/logout')).toBe(1));
  });

  it('LB3E5: the footer links that leave the app (the landing, the Terms, the Privacy Policy) are plain anchors, so leaving the app is a full page load; Gói học stays a router link', () => {
    renderApp(<AppFooter />);
    const byHref = (href: string) => screen.getAllByRole('link').filter((link) => link.getAttribute('href') === href);
    for (const href of ['/vi', '/vi/terms', '/vi/privacy', '/vi/sources']) {
      expect(byHref(href), href).toHaveLength(1);
      expect(byHref(href)[0], href).not.toHaveAttribute('data-router-link');
    }
    expect(byHref('/vi/app/plans')[0]).toHaveAttribute('data-router-link');
  });

  it('AppFooter (D7): Liên hệ is mailto; the three pages that do not exist yet are muted text, not links', () => {
    renderApp(<AppFooter />);
    expect(screen.getByRole('link', { name: 'Liên hệ' }).getAttribute('href')).toMatch(/^mailto:/);
    for (const name of ['Trợ giúp', 'Câu hỏi thường gặp', 'Gửi góp ý']) {
      const item = screen.getByText(name);
      expect(item.closest('a')).toBeNull();
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).not.toHaveAttribute('tabindex');
    }
    expect(screen.getByRole('link', { name: 'Điều khoản sử dụng' })).toHaveAttribute('href', '/vi/terms');
    expect(screen.getByRole('link', { name: 'Chính sách bảo mật' })).toHaveAttribute('href', '/vi/privacy');
    expect(screen.getByRole('link', { name: 'Nguồn dữ liệu' })).toHaveAttribute('href', '/vi/sources');
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  it('MobileTabBar shows only below 768px and marks the current tab', () => {
    pathname = '/vi/app/practice';
    renderApp(<MobileTabBar />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toMatch(/md:hidden/);
    expect(within(nav).getByRole('link', { name: 'Luyện tập' })).toHaveAttribute('aria-current', 'page');
  });
});
