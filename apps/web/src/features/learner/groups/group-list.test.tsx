// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { problem } from '@/app-shell/session/test-support';
import { renderApp } from '@/test-utils/render-app';
import { GroupListPage } from './GroupListPage';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/groups',
  useRouter: () => ({ replace: vi.fn(), push }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const cells = [1, 2, 3, 0, 0, 0].map((total, level) => ({ level, total, due: 0 }));
const deck = (id: string, name: string, due: number, total = 10) => ({
  id, name, version: 1, total, today: { priority: 0, due, new: 0 }, cells: total ? cells : cells.map((c) => ({ ...c, total: 0 })), backlog: 0,
  available: { due, new: 0 },
});
// carouselOrder: most waiting first, then done, then empty.
const FIVE = [
  deck('g-12', 'Đề 12 · Writing', 24),
  deck('g-9', 'Đề 9 · Listening', 18),
  deck('g-14', 'Đề 14 · Reading', 11),
  deck('g-11', 'Đề 11 · Speaking', 0),
  deck('g-jp', 'Du lịch Nhật', 0, 0),
];
const base = {
  'GET /v1/topics/suggestions': () => Response.json({ items: [] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
};
const withGroups = (groups: unknown[], extra = {}) => ({ ...base, 'GET /v1/groups': () => Response.json({ items: groups }), ...extra });
const region = () => screen.findByRole('region', { name: 'Các nhóm của bạn' });
const centre = async () => within(await region()).getByRole('link');
const key = (k: string, target: Element = document.body) => act(() => void fireEvent.keyDown(target, { key: k }));

describe('GroupListPage: carousel (Figma 82:3213, motion doc §3, design §8.5)', () => {
  it('starts on the first group of the carousel order; the only link inside the region is the centre stack', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups([FIVE[3], FIVE[4], FIVE[1], FIVE[0], FIVE[2]]) });
    const link = await centre();
    expect(link).toHaveTextContent('Đề 12 · Writing');
    expect(link).toHaveAttribute('href', '/vi/app/group?id=g-12');
    const r = await region();
    expect(within(r).getAllByRole('link')).toHaveLength(1);
    // Side stacks stay inert and hidden from screen readers (design §8.5); a press on them still reaches the track.
    const sides = r.querySelectorAll('[inert]');
    expect(sides.length).toBe(4);
    sides.forEach((s) => expect(s).toHaveAttribute('aria-hidden', 'true'));
  });

  it('pressing a side stack brings it to the centre (owner 10/11/2026, motion prototype), without opening it', async () => {
    push.mockClear();
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    const r = await region();
    await userEvent.click(within(r).getByText('Đề 14 · Reading'));
    expect(await centre()).toHaveTextContent('Đề 14 · Reading');
    expect(screen.getByText('Đề 14 · Reading, 11 thẻ chờ')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('→ makes the next group the centre and the live line reads its name and waiting cards', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    await centre();
    key('ArrowRight');
    expect(await centre()).toHaveTextContent('Đề 9 · Listening');
    expect(screen.getByText('Đề 9 · Listening, 18 thẻ chờ')).toBeInTheDocument();
  });

  it('five → presses in a row (Review Focus 5): five steps on is the centre, one link, no stack left without its transition', async () => {
    const SEVEN = [...FIVE.slice(0, 4), deck('g-10', 'Đề 10 · Writing', 3), deck('g-b1', 'Công việc · B1', 0), FIVE[4]];
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(SEVEN) });
    await centre();
    for (let i = 0; i < 5; i += 1) key('ArrowRight');
    // Order: 12, 9, 14, 10 (waiting), Công việc, Đề 11 (done, by name), Du lịch Nhật (empty); five steps on from the first.
    expect(await centre()).toHaveTextContent('Đề 11 · Speaking');
    const r = await region();
    expect(within(r).getAllByRole('link')).toHaveLength(1);
    // A stack that wraps from one end of the arc to the other jumps without a transition for one frame, then gets it back.
    r.querySelectorAll<HTMLElement>('[data-k]').forEach((slot) => expect(slot.style.transition).toBe(''));
  });

  it('← from the first group wraps to the last', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    await centre();
    key('ArrowLeft');
    expect(await centre()).toHaveTextContent('Du lịch Nhật');
  });

  it('the arrow buttons step too', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    await centre();
    await userEvent.click(screen.getByRole('button', { name: 'Nhóm sau' }));
    expect(await centre()).toHaveTextContent('Đề 9 · Listening');
    await userEvent.click(screen.getByRole('button', { name: 'Nhóm trước' }));
    expect(await centre()).toHaveTextContent('Đề 12 · Writing');
  });

  it('↓ opens the centre group after the carousel fades out (motion doc §3, 170 ms)', async () => {
    push.mockClear();
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    await centre();
    key('ArrowDown');
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vi/app/group?id=g-12'));
  });

  it('pressing the centre stack opens it the same way', async () => {
    push.mockClear();
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    await userEvent.click(await centre());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vi/app/group?id=g-12'));
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('with reduced motion ↓ opens the group at once', async () => {
    push.mockClear();
    const media = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    try {
      renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
      await centre();
      key('ArrowDown');
      expect(push).toHaveBeenCalledWith('/vi/app/group?id=g-12');
    } finally {
      window.matchMedia = media;
    }
  });

  it('below the carousel: the "nhịp ôn" eyebrow, the level bar, Học · Ôn and "Xem nhóm →" of the centre group', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    await centre();
    expect(screen.getByText('nhịp ôn: Mới → Bậc 5')).toBeInTheDocument();
    const bar = screen.getByRole('figure', { name: 'Số từ theo bậc' });
    expect(within(bar).getByRole('img', { name: 'Bậc 2 · 3 từ · ôn lại sau 3 ngày' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ôn' })).toHaveAttribute('href', '/vi/app/recall?group=g-12');
    expect(screen.getByRole('link', { name: 'Xem nhóm' })).toHaveAttribute('href', '/vi/app/group?id=g-12');
  });

  it('F opens the picker; "de 9" leaves Đề 9; Enter makes it the centre and closes the picker', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    await centre();
    key('f');
    const search = await screen.findByRole('combobox', { name: 'Tìm trong 5 nhóm' });
    await userEvent.type(search, 'de 9');
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Đề 9 · Listening18 chờ']);
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(await centre()).toHaveTextContent('Đề 9 · Listening');
  });

  it('the picker groups the rows by state and marks the centre group', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    await userEvent.click(await screen.findByRole('button', { name: /Đề 12 · Writing/ }));
    const list = await screen.findByRole('listbox');
    expect(within(list).getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['Còn thẻ chờ', 'Xong hôm nay', 'Chưa có từ']);
    expect(within(list).getByRole('option', { selected: true })).toHaveTextContent('Đề 12 · Writing');
    expect(within(list).getByRole('option', { name: /Du lịch Nhật/ })).toHaveTextContent('Trống');
    expect(within(list).getByRole('option', { name: /Đề 11/ })).toHaveTextContent('10 từ');
  });

  it('↓ ↓ Enter in the picker picks the third row; Esc closes and gives focus back to the button', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    const button = await screen.findByRole('button', { name: /Đề 12 · Writing/ });
    await userEvent.click(button);
    await screen.findByRole('listbox');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(await centre()).toHaveTextContent('Đề 14 · Reading');
    const again = screen.getByRole('button', { name: /Đề 14 · Reading/ });
    await userEvent.click(again);
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    await waitFor(() => expect(again).toHaveFocus());
  });

  it('F typed into the picker search does not reopen or close it; ← there does not move the carousel', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    await centre();
    key('f');
    const search = await screen.findByRole('combobox');
    await userEvent.type(search, 'f');
    expect(search).toHaveValue('f');
    key('ArrowLeft', search);
    expect(screen.getAllByRole('listbox')).toHaveLength(1);
    await userEvent.keyboard('{Escape}');
    expect(await centre()).toHaveTextContent('Đề 12 · Writing');
  });

  it('← typed in the top-bar search box does not move the carousel', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups(FIVE) });
    await centre();
    const box = screen.getAllByRole('searchbox')[0] ?? screen.getAllByRole('textbox')[0];
    key('ArrowLeft', box);
    key('f', box);
    expect(await centre()).toHaveTextContent('Đề 12 · Writing');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('one group: no arrow buttons, ← → do nothing', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups([FIVE[0]]) });
    await centre();
    expect(screen.queryByRole('button', { name: 'Nhóm sau' })).toBeNull();
    key('ArrowRight');
    expect(await centre()).toHaveTextContent('Đề 12 · Writing');
    expect((await region()).querySelectorAll('[inert]').length).toBe(0);
  });

  it('two groups: exactly two stacks, never the same group on both sides', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups([FIVE[0], FIVE[1]]) });
    const r = await region();
    expect(within(r).getAllByText(/^Đề (12|9) · /)).toHaveLength(2);
  });

  it('no group yet: the empty block invites the first group', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups([]) });
    expect(await screen.findByText('Chưa có nhóm nào')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo nhóm đầu tiên' })).toBeInTheDocument();
  });
});

describe('deck dialogs from the list (K/17)', () => {
  it('"+ Tạo nhóm" opens "Tạo nhóm": counts "12/60", stops at 60 characters, and a double click sends one request', async () => {
    let release!: () => void;
    const { count } = renderApp(<GroupListPage />, { chrome: true,
      routes: withGroups([FIVE[0]], {
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
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups([FIVE[0]], { 'POST /v1/groups': () => problem(409, 'group-limit-reached') }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo nhóm' }));
    await userEvent.type(await screen.findByRole('textbox', { name: 'Tên nhóm' }), 'Mới');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo nhóm' }));
    expect(await screen.findByText('Bạn đã có 100 nhóm, mức tối đa. Xóa bớt một nhóm để tạo nhóm mới.')).toBeInTheDocument();
  });

  it('a 409 group-name-taken shows under the name', async () => {
    renderApp(<GroupListPage />, { chrome: true, routes: withGroups([FIVE[0]], { 'POST /v1/groups': () => problem(409, 'group-name-taken') }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo nhóm' }));
    await userEvent.type(await screen.findByRole('textbox', { name: 'Tên nhóm' }), 'Nhóm 1');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo nhóm' }));
    expect(await screen.findByText('Đã có nhóm tên này. Chọn tên khác.')).toBeInTheDocument();
  });
});
