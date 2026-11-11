// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeMe } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { AddWordProvider } from '@/features/learner/add-word/add-word-context';
import { AvatarMenu } from './AvatarMenu';
import { BackLink } from './BackLink';
import { MobileTabBar } from './MobileTabBar';
import { PlanChip } from './PlanChip';
import { TopBar } from './TopBar';

// A marker on router links, so a test can tell them from plain anchors.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} data-router-link="" {...rest}>
      {children}
    </a>
  ),
}));

let pathname = '/vi/app';
let search = new URLSearchParams();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => search,
  useRouter: () => ({ replace: vi.fn(), push }),
}));

const entitlements = (plan: string) => ({ 'GET /v1/me/entitlements': () => Response.json({ plan, pools: {}, sources: [] }) });

beforeEach(() => {
  pathname = '/vi/app';
  search = new URLSearchParams();
});

function currentLinks(nav: HTMLElement) {
  return within(nav).getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page').map((l) => l.textContent);
}

describe('app chrome (giao diện mới M1.9)', () => {
  it.each([
    ['/vi/app/groups', ['Nhóm']],
    ['/vi/app/word', ['Tra từ']],
    ['/vi/app/settings', []],
  ])('on %s the current tab is %j in the top bar and the tab bar', (path, expected) => {
    pathname = path;
    renderApp(<><TopBar /><MobileTabBar /></>, { routes: entitlements('free') });
    const [top, bottom] = screen.getAllByRole('navigation', { name: 'Điều hướng chính' });
    expect(currentLinks(top!)).toEqual(expected);
    expect(currentLinks(bottom!)).toEqual(expected);
  });

  it('"Thêm từ" opens the add-word dialog inside AddWordProvider', async () => {
    renderApp(<AddWordProvider><TopBar /></AddWordProvider>, { routes: entitlements('free') });
    await userEvent.click(screen.getByRole('button', { name: /Thêm từ/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('PlanChip names the plan from GET /v1/me/entitlements', async () => {
    renderApp(<PlanChip />, { routes: entitlements('trial') });
    expect(await screen.findByText('Dùng thử')).toBeInTheDocument();
  });

  it('AvatarMenu (Figma 181:316): name, email, then the items in order', async () => {
    renderApp(<AvatarMenu />, { me: makeMe({ given_name: 'Lan', family_name: 'Nguyễn' }), routes: entitlements('free') });
    await userEvent.click(await screen.findByRole('button', { name: 'Tài khoản của bạn' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Tài khoản', 'Cài đặt', 'Lịch sử giao dịch', 'Báo lỗi của tôi', 'Chuyển sang giao diện tối', 'Đăng xuất',
    ]);
    expect(within(menu).getByRole('menuitem', { name: 'Báo lỗi của tôi' })).toHaveAttribute('href', '/vi/app/settings/reports');
    expect(screen.getByText('Nguyễn Lan')).toBeInTheDocument();
    expect(screen.getByText('lan@example.com')).toBeInTheDocument();
  });

  it('AvatarMenu on /vi/app/settings marks "Cài đặt" as the open page (Figma 181:316)', async () => {
    pathname = '/vi/app/settings';
    renderApp(<AvatarMenu />, { routes: entitlements('free') });
    await userEvent.click(await screen.findByRole('button', { name: 'Tài khoản của bạn' }));
    const menu = await screen.findByRole('menu');
    const current = within(menu).getAllByRole('menuitem').filter((i) => i.getAttribute('aria-current') === 'page').map((i) => i.textContent);
    expect(current).toEqual(['Cài đặt']);
  });

  it('AvatarMenu → Đăng xuất signs out', async () => {
    const { count } = renderApp(<AvatarMenu />, {
      routes: { ...entitlements('free'), 'POST /v1/auth/logout': () => new Response(null, { status: 204 }) },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tài khoản của bạn' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Đăng xuất' }));
    await waitFor(() => expect(count('POST', '/v1/auth/logout')).toBe(1));
  });

  it('AvatarMenu → the theme item switches light/dark at once', async () => {
    renderApp(<AvatarMenu />, { routes: entitlements('free') });
    await userEvent.click(await screen.findByRole('button', { name: 'Tài khoản của bạn' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Chuyển sang giao diện tối' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
  });

  it('BackLink is a link with its label', () => {
    renderApp(<BackLink href="/vi/app/groups" label="Nhóm" />);
    expect(screen.getByRole('link', { name: /Nhóm/ })).toHaveAttribute('href', '/vi/app/groups');
  });
});
