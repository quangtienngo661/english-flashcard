// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import ChromeLayout from '@/app/[locale]/app/(member)/(chrome)/layout.app';
import FocusLayout from '@/app/[locale]/app/(member)/(focus)/layout.app';
import { renderApp } from '@/app-ui/test-utils';
import { GroupPage } from '@/features/learner/groups/GroupPage';
import { SettingsPage } from '@/features/learner/settings/SettingsPage';
import { TodayPage } from '@/features/learner/today/TodayPage';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
let pathname = '/vi/app';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams('id=g1'),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// Review Focus 4 and 5 of the plan (design §5.4): an old screen inside the new chrome has one main, one header; N opens Thêm từ only
// under (chrome).
describe('member route-group layouts', () => {
  it.each([
    ['TodayPage', <TodayPage key="t" />],
    ['GroupPage', <GroupPage key="g" />],
    ['SettingsPage', <SettingsPage key="s" />],
  ])('%s inside the chrome has exactly one main and one banner', (_name, page) => {
    renderApp(page, { chrome: true });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
  });

  it('the (chrome) layout opens Thêm từ on the N key', async () => {
    renderApp(<ChromeLayout><p>trang</p></ChromeLayout>);
    await userEvent.keyboard('n');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  // e2e A14-7: before M1.10 each page had its own AddWordProvider, so leaving the page closed Thêm từ. The layout's provider outlives
  // the page; it must close the sheet itself when the path changes.
  it('the (chrome) layout closes Thêm từ when the page changes', async () => {
    pathname = '/vi/app/group';
    let navigate = () => {};
    function Harness() {
      const [, rerender] = useState(0);
      navigate = () => rerender((n) => n + 1);
      return <ChromeLayout><p>trang</p></ChromeLayout>;
    }
    renderApp(<Harness />);
    await userEvent.keyboard('n');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    pathname = '/vi/app/topic';
    act(() => navigate());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    pathname = '/vi/app';
  });

  it('the (focus) layout opens no dialog on the N key', async () => {
    renderApp(<FocusLayout><p>phiên luyện</p></FocusLayout>);
    await userEvent.keyboard('n');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
});
