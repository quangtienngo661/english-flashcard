// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { problem } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { GroupListPage } from './GroupListPage';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/groups',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const cells = [1, 2, 3, 0, 0, 0].map((total, level) => ({ level, total, due: 0 }));
const deck = (i: number, waitingCards: number) => ({
  id: `g${i}`, name: `Nhóm ${i}`, version: 1, total: 10, today: { priority: 0, due: waitingCards, new: 0 }, cells, backlog: 0,
});
const base = {
  'GET /v1/topics/suggestions': () => Response.json({ items: [] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
};
const withGroups = (groups: unknown[], extra = {}) => ({ ...base, 'GET /v1/groups': () => Response.json({ items: groups }), ...extra });
const names = () => within(screen.getByRole('list', { name: 'Nhóm của bạn' })).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('GroupListPage (K/16, K/16b)', () => {
  it('filter: all · N decks, cards waiting, done today', async () => {
    renderApp(<GroupListPage />, { routes: withGroups([deck(1, 3), deck(2, 0), deck(3, 1)]) });
    await screen.findByText('Nhóm 1');
    expect(screen.getByRole('button', { name: /Tất cả · 3 nhóm/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Tất cả · 3 nhóm/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Xong hôm nay' }));
    expect(names()).toEqual(['Nhóm 2']);
    await userEvent.click(screen.getByRole('button', { name: /Xong hôm nay/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Còn thẻ chờ' }));
    expect(names()).toEqual(['Nhóm 1', 'Nhóm 3']);
  });

  it('K/16b: from 10 decks a search box filters by name', async () => {
    const many = Array.from({ length: 10 }, (_, i) => deck(i + 1, 1));
    renderApp(<GroupListPage />, { routes: withGroups(many) });
    const search = await screen.findByRole('searchbox', { name: 'Tìm trong 10 nhóm' });
    await userEvent.type(search, 'Nhóm 10');
    expect(names()).toEqual(['Nhóm 10']);
  });

  it('fewer than 10 decks: no search box', async () => {
    renderApp(<GroupListPage />, { routes: withGroups([deck(1, 1)]) });
    await screen.findByText('Nhóm 1');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});

describe('deck dialogs (K/17, K/14)', () => {
  it('K/17: create counts "12/60", stops at 60 characters, and a double click sends one request', async () => {
    let release!: () => void;
    const { count } = renderApp(<GroupListPage />, {
      routes: withGroups([deck(1, 1)], {
        'POST /v1/groups': () => new Promise<Response>((r) => (release = () => r(Response.json({ id: 'g9', name: 'Du lịch Nhật' }, { status: 201 })))),
      }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo nhóm' }));
    const field = await screen.findByRole('textbox', { name: 'Tên nhóm' });
    await userEvent.type(field, 'Du lịch Nhật');
    expect(screen.getByText('12/60')).toBeInTheDocument();
    await userEvent.clear(field);
    await userEvent.type(field, 'x'.repeat(61));
    expect(field).toHaveValue('x'.repeat(60));
    await userEvent.clear(field);
    await userEvent.type(field, 'Du lịch Nhật');
    await userEvent.dblClick(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo nhóm' }));
    expect(count('POST', '/v1/groups')).toBe(1);
    release();
  });

  it('a 409 group-limit-reached says the limit with the admin number', async () => {
    renderApp(<GroupListPage />, { routes: withGroups([deck(1, 1)], { 'POST /v1/groups': () => problem(409, 'group-limit-reached') }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo nhóm' }));
    await userEvent.type(await screen.findByRole('textbox', { name: 'Tên nhóm' }), 'Mới');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo nhóm' }));
    expect(await screen.findByText('Bạn đã có 100 nhóm, mức tối đa. Xóa bớt một nhóm để tạo nhóm mới.')).toBeInTheDocument();
  });

  it('a 409 group-name-taken shows under the name', async () => {
    renderApp(<GroupListPage />, { routes: withGroups([deck(1, 1)], { 'POST /v1/groups': () => problem(409, 'group-name-taken') }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo nhóm' }));
    await userEvent.type(await screen.findByRole('textbox', { name: 'Tên nhóm' }), 'Nhóm 1');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo nhóm' }));
    expect(await screen.findByText('Đã có nhóm tên này. Chọn tên khác.')).toBeInTheDocument();
  });

  it('K/14: delete says how many words leave learning (removable_items), then deletes', async () => {
    const { count } = renderApp(<GroupListPage />, {
      routes: withGroups([{ ...deck(1, 1), name: 'Công nghệ' }], {
        'GET /v1/groups/g1': () => Response.json({ id: 'g1', name: 'Công nghệ', version: 1, item_count: 18, removable_items: 12 }),
        'DELETE /v1/groups/g1': () => new Response(null, { status: 204 }),
      }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tùy chọn nhóm Công nghệ' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Xóa nhóm' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa nhóm “Công nghệ”?' });
    expect(within(dialog).getByText(/12 từ chỉ có trong nhóm này/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Giữ nhóm' })).toBeInTheDocument();
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Xóa nhóm và 12 từ' }));
    await waitFor(() => expect(count('DELETE', '/v1/groups/g1')).toBe(1));
  });

  it('English: "Delete deck" and "Cancel"', async () => {
    renderApp(<GroupListPage />, {
      locale: 'en',
      routes: withGroups([{ ...deck(1, 1), name: 'Tech' }], {
        'GET /v1/groups/g1': () => Response.json({ id: 'g1', name: 'Tech', version: 1, item_count: 5, removable_items: 0 }),
      }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Options for Tech' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete deck' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(await within(dialog).findByRole('button', { name: 'Delete deck' })).toBeInTheDocument();
  });
});
