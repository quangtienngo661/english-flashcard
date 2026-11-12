// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { renderApp } from '@/test-utils/render-app';
import { Dialog } from '@/ui/Dialog';
import { TopBar } from './TopBar';
import { TopSearch } from './TopSearch';

// Giao diện mới M4.3: the word search moves from the strip under the header into the top bar (Figma 54:502).

let pathname = '/vi/app/groups';
let search = new URLSearchParams();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => search,
  useRouter: () => ({ replace: vi.fn(), push }),
}));

const entitlements = { 'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }) };

beforeEach(() => {
  pathname = '/vi/app/groups';
  search = new URLSearchParams();
  push.mockReset();
});

describe('TopSearch (giao diện mới M4.3)', () => {
  it('from Nhóm, "/" focuses the box; "left" + Enter goes to exactly /vi/app/lookup?q=left', async () => {
    renderApp(<TopSearch />);
    await userEvent.keyboard('/');
    const box = screen.getByRole('searchbox', { name: 'Tìm từ' });
    expect(box).toHaveFocus();
    await userEvent.type(box, 'left{Enter}');
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith('/vi/app/lookup?q=left');
  });

  it('has no level select and no submit button (Figma 54:502)', () => {
    renderApp(<TopSearch />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps typed text when ?id= changes and takes the URL query when ?q= changes', async () => {
    pathname = '/vi/app/group';
    search = new URLSearchParams('id=g1');
    function Harness() {
      const [, rerender] = useState(0);
      return (
        <>
          <button type="button" onClick={() => rerender((n) => n + 1)}>rerender</button>
          <TopSearch />
        </>
      );
    }
    renderApp(<Harness />);
    await userEvent.type(screen.getByRole('searchbox'), 'mitig');
    search = new URLSearchParams('id=g2');
    await userEvent.click(screen.getByRole('button', { name: 'rerender' }));
    expect(screen.getByRole('searchbox')).toHaveValue('mitig');
    search = new URLSearchParams('q=yield');
    await userEvent.click(screen.getByRole('button', { name: 'rerender' }));
    expect(screen.getByRole('searchbox')).toHaveValue('yield');
  });

  it('"/" while typing in another field types a slash there', async () => {
    renderApp(<><input aria-label="other" /><TopSearch /></>);
    await userEvent.click(screen.getByRole('textbox', { name: 'other' }));
    await userEvent.keyboard('/');
    expect(screen.getByRole('textbox', { name: 'other' })).toHaveValue('/');
    expect(screen.getByRole('searchbox')).not.toHaveFocus();
  });

  it('"/" inside an open dialog leaves focus in the dialog', async () => {
    renderApp(
      <>
        <TopSearch />
        <Dialog isOpen onOpenChange={() => {}} title="Hộp">
          <button type="button">trong hộp</button>
        </Dialog>
      </>,
    );
    const inside = screen.getByRole('button', { name: 'trong hộp' });
    inside.focus();
    await userEvent.keyboard('/');
    expect(screen.getByRole('searchbox', { hidden: true })).not.toHaveFocus();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
  });

  it('an empty search goes to Tra từ with no query', async () => {
    renderApp(<TopSearch />);
    await userEvent.type(screen.getByRole('searchbox'), '   {Enter}');
    expect(push).toHaveBeenCalledWith('/vi/app/lookup');
  });
});

describe('TopBar search box', () => {
  it('is in the top bar on Nhóm', () => {
    renderApp(<TopBar />, { routes: entitlements });
    expect(screen.getByRole('searchbox', { name: 'Tìm từ' })).toBeInTheDocument();
  });

  it('is not rendered on Tra từ (the page has its own big box)', () => {
    pathname = '/vi/app/lookup';
    renderApp(<TopBar />, { routes: entitlements });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});
