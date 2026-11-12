// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { problem } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { hardReplace } from '@/app-shell/navigate';
import { GroupPage } from './GroupPage';

const G = '11111111-1111-4111-8111-111111111111';
let search = new URLSearchParams({ id: G });
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/group',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => search,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const content = (lemma: string, meaning: string) => ({
  sense_id: `s-${lemma}`, entry_id: `e-${lemma}`, scope: 'catalog', lemma, pos: 'verb', level: 'B1', context_label: null,
  meaning: { text: meaning, language: 'vi', translation_missing: false }, definition_en: null,
  examples: [`We ${lemma} it.`], topics: [], form_of: null, ai_suggested: false, sentences: [],
});
const card = (lemma: string, level: number, section: string, priority = false) => ({
  item_id: `i-${lemma}`, sense_id: `s-${lemma}`, level, due_date: '2026-10-18', priority, section, content: content(lemma, `nghĩa ${lemma}`),
});
const CARDS = [card('deploy', 1, 'priority', true), card('release', 1, 'due'), card('went', 0, 'new'), card('ship', 3, 'early')];
// GET /v1/groups/{id}/items?content=true rows (owner 27/10/2026): the item with its card content and its section.
const WORDS = CARDS.map((c) => ({
  ...c, group_count: c.item_id === 'i-ship' ? 2 : 1, sense_changed: c.item_id === 'i-release', added_at: '2026-10-02T00:00:00Z',
}));
const WORDS_URL = `/v1/groups/${G}/items?content=true&page_size=50`;
// The filter counts come from the summary, not from the rows loaded: `available.due` 7 has only one row on the page.
const SUMMARY = {
  id: G, name: 'Công nghệ', version: 1, total: 4, today: { priority: 1, due: 1, new: 1 },
  cells: [1, 2, 0, 1, 0, 0].map((total, level) => ({ level, total, due: level === 1 ? 2 : 0 })), backlog: 3,
  available: { due: 7, new: 1 },
};
const routes = (extra = {}) => ({
  [`GET /v1/groups/${G}`]: () => Response.json({ id: G, name: 'Công nghệ', version: 1, item_count: 4, removable_items: 3, created_at: '2026-10-02T03:00:00Z', updated_at: '2026-10-02T03:00:00Z' }),
  'GET /v1/groups': () => Response.json({ items: [SUMMARY] }),
  [`GET ${WORDS_URL}`]: () => Response.json({ items: WORDS, next_page_token: null }),
  [`GET ${WORDS_URL}&cell=1`]: () => Response.json({ items: WORDS.filter((w) => w.level === 1), next_page_token: null }),
  [`GET ${WORDS_URL}&section=due`]: () => Response.json({ items: WORDS.filter((w) => w.section === 'due'), next_page_token: null }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  ...extra,
});

beforeEach(() => {
  search = new URLSearchParams({ id: G });
});

describe('GroupPage (Figma 84:3552 / 84:3749)', () => {
  it('group page shows [Add word] and opens the sheet locked to this deck', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes(), locale: 'en' });
    const main = screen.getByRole('main');
    await userEvent.click(await within(main).findByRole('button', { name: 'Add word' }, { timeout: 5000 }));
    expect(await screen.findByText('Saving to deck: Công nghệ', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save to deck/ })).not.toBeInTheDocument();
  });

  it('the in-page [Thêm từ] opens it locked (the phone + is only on Hôm nay, giao diện mới §5.4)', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes() });
    const main = screen.getByRole('main');
    await within(main).findByRole('heading', { name: 'Công nghệ' }, { timeout: 5000 });
    await userEvent.click(within(main).getByRole('button', { name: 'Thêm từ' }));
    expect(await screen.findByText('Lưu vào nhóm: Công nghệ', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('group page sets the scope; leaving clears it', async () => {
    // Keep the chrome and its provider mounted when GroupBody leaves on an invalid id.
    function PersistentPage() {
      const [, refresh] = useState(0);
      return <><button onClick={() => { search = new URLSearchParams(); refresh((n) => n + 1); }}>Leave deck</button><GroupPage /></>;
    }
    renderApp(<PersistentPage />, { chrome: true, routes: routes() });
    await screen.findByRole('heading', { name: 'Công nghệ' }, { timeout: 5000 });
    fireEvent.keyDown(document.body, { key: 'n' });
    await screen.findByText('Lưu vào nhóm: Công nghệ', {}, { timeout: 5000 });
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    await userEvent.click(screen.getByRole('button', { name: 'Leave deck' }));
    await screen.findByText('Không tìm thấy nhóm này.', {}, { timeout: 5000 });
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(await screen.findByRole('button', { name: /Lưu vào nhóm/ }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByText('Lưu vào nhóm: Công nghệ')).not.toBeInTheDocument();
  });

  it('A14: the deck page scopes key N to its deck', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes() });
    await screen.findByRole('heading', { name: 'Công nghệ' }, { timeout: 5000 });
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(await screen.findByText('Lưu vào nhóm: Công nghệ', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu vào nhóm/ })).not.toBeInTheDocument();
  });

  it('"nhịp ôn": one segment per stage, filled with its waiting cards', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes() });
    const bar = await screen.findByRole('figure', { name: 'Nhịp ôn: mới → 30 ngày' });
    expect(within(bar).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual([
      'Mới: 0 thẻ chờ trong 1 từ', '1 ngày: 2 thẻ chờ trong 2 từ', '3 ngày: 0 thẻ chờ trong 0 từ',
      '7 ngày: 0 thẻ chờ trong 1 từ', '14 ngày: 0 thẻ chờ trong 0 từ', '30 ngày: 0 thẻ chờ trong 0 từ',
    ]);
  });

  it('English names the first stage "New"', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes(), locale: 'en' });
    const bar = await screen.findByRole('figure', { name: 'Review rhythm: new → 30 days' });
    expect(within(bar).getAllByRole('listitem')[0].getAttribute('aria-label')).toMatch(/^New: /);
  });

  it('the page head: the stack, the colour title and the three chips with their numbers', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes() });
    expect(await screen.findByRole('heading', { level: 1, name: 'Công nghệ' })).toBeInTheDocument();
    const chips = await screen.findByRole('list', { name: 'Hôm nay' });
    expect(within(chips).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['1 ưu tiên', '1 đến hạn', '1 mới']);
    expect(screen.getByRole('link', { name: 'Nhóm của bạn' })).toHaveAttribute('href', '/vi/app/groups');
  });

  it('the card preview is gone (owner QM3-1, "Bỏ như Figma")', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes() });
    await screen.findByRole('list', { name: 'Toàn bộ 4 từ' });
    expect(screen.queryByTestId('preview-slide')).toBeNull();
    expect(screen.queryByRole('button', { name: /Thẻ sau/ })).toBeNull();
  });

  it("the creation date is the learner's day, not UTC (review I7)", async () => {
    renderApp(<GroupPage />, { chrome: true,
      routes: routes({
        [`GET /v1/groups/${G}`]: () =>
          Response.json({ id: G, name: 'Công nghệ', version: 1, item_count: 4, removable_items: 3, created_at: '2026-10-22T23:30:00Z', updated_at: '2026-10-22T23:30:00Z' }),
      }),
    });
    expect(await screen.findByText(/tạo ngày .*23\/10/)).toBeInTheDocument();
  });

  it('M3: each word links to its word page', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes() });
    const row = await screen.findByRole('listitem', { name: 'deploy' });
    expect(within(row).getByRole('link', { name: 'deploy' })).toHaveAttribute('href', '/vi/app/word?w=deploy');
  });

  it('Học · Ôn (đợt C §4.1) and the long-overdue link', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes() });
    expect(await screen.findByRole('link', { name: 'Học' }, { timeout: 5000 })).toHaveAttribute('href', `/vi/app/review?group=${G}&mode=new`);
    expect(screen.getByRole('link', { name: 'Ôn' })).toHaveAttribute('href', `/vi/app/recall?group=${G}`);
    expect(screen.queryByRole('link', { name: /Ôn 3 thẻ/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /3 từ lâu chưa ôn/ })).toHaveAttribute('href', `/vi/app/group/backlog?id=${G}`);
  });

  it('the meta line counts the words mastered (stage 4 and 5) once there are some (DC11)', async () => {
    const summary = { ...SUMMARY, cells: [0, 0, 1, 1, 1, 1].map((total, level) => ({ level, total, due: 0 })) };
    renderApp(<GroupPage />, { chrome: true, routes: routes({ 'GET /v1/groups': () => Response.json({ items: [summary] }) }) });
    expect(await screen.findByText(/^4 từ · tạo ngày .* · 2 đã thuộc$/, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('rows show the part of speech, the stage, the status and a changed meaning', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes() });
    const list = await screen.findByRole('list', { name: 'Toàn bộ 4 từ' });
    const deploy = within(list).getByRole('listitem', { name: 'deploy' });
    expect(within(deploy).getByText('Ngăn 1 ngày')).toBeInTheDocument();
    expect(within(deploy).getByText('Ưu tiên')).toBeInTheDocument();
    expect(within(within(list).getByRole('listitem', { name: 'went' })).getByText('từ mới')).toBeInTheDocument();
    await waitFor(() => expect(within(within(list).getByRole('listitem', { name: 'release' })).getByText('Nghĩa đã đổi')).toBeInTheDocument());
  });

  it('filter chips show every stage with its count, press one at a time and filter the rows', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes() });
    await screen.findByRole('list', { name: 'Toàn bộ 4 từ' });
    const chips = within(screen.getByRole('group', { name: 'Lọc từ trong nhóm' })).getAllByRole('button');
    expect(chips.map((c) => c.textContent)).toEqual([
      'Tất cả4', 'Ưu tiên1', 'Đến hạn7', 'Mới1', 'Ngăn 1 ngày2', 'Ngăn 3 ngày0', 'Ngăn 7 ngày1', 'Ngăn 14 ngày0', 'Ngăn 30 ngày0',
    ]);
    expect(chips[0]).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Ngăn 1 ngày2' }));
    expect(screen.getByRole('button', { name: 'Ngăn 1 ngày2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tất cả4' })).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Toàn bộ 4 từ' })).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['deploy', 'release']));
  });

  it('a section filter asks the server for that section once (no whole-deck load)', async () => {
    const { count } = renderApp(<GroupPage />, { chrome: true, routes: routes() });
    await screen.findByRole('list', { name: 'Toàn bộ 4 từ' });
    await userEvent.click(screen.getByRole('button', { name: 'Đến hạn7' }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Toàn bộ 4 từ' })).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['release']));
    expect(count('GET', `${WORDS_URL}&section=due`)).toBe(1);
    expect(count('GET', `/v1/groups/${G}/queue?mode=all`)).toBe(0);
  });

  it('[Xem thêm từ] loads the next page with its token and appends it', async () => {
    renderApp(<GroupPage />, { chrome: true,
      routes: routes({
        [`GET ${WORDS_URL}`]: () => Response.json({ items: WORDS.slice(0, 2), next_page_token: 'p2' }),
        [`GET ${WORDS_URL}&page_token=p2`]: () => Response.json({ items: WORDS.slice(2), next_page_token: null }),
      }),
    });
    await screen.findByRole('listitem', { name: 'release' });
    expect(screen.queryByRole('listitem', { name: 'went' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xem thêm từ · còn 2 từ' }));
    expect(await screen.findByRole('listitem', { name: 'ship' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xem thêm từ/ })).not.toBeInTheDocument();
  });

  it('removing a word that is only in this deck asks first; one in two decks goes at once', async () => {
    const { count } = renderApp(<GroupPage />, { chrome: true,
      routes: routes({
        [`DELETE /v1/groups/${G}/items/i-deploy`]: () => Response.json({ removed_from_learning: true }),
        [`DELETE /v1/groups/${G}/items/i-ship`]: () => Response.json({ removed_from_learning: false }),
      }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ ship khỏi nhóm' }));
    await waitFor(() => expect(count('DELETE', `/v1/groups/${G}/items/i-ship`)).toBe(1));
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ deploy khỏi nhóm' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bỏ “deploy” khỏi nhóm?' });
    expect(count('DELETE', `/v1/groups/${G}/items/i-deploy`)).toBe(0);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bỏ khỏi nhóm' }));
    await waitFor(() => expect(count('DELETE', `/v1/groups/${G}/items/i-deploy`)).toBe(1));
  });

  it('E5: a failed card list shows the error with [Thử lại], not "Nhóm chưa có từ nào." (audit 26/10/2026 #5)', async () => {
    let loads = 0;
    renderApp(<GroupPage />, { chrome: true,
      routes: routes({ [`GET ${WORDS_URL}`]: () => (++loads === 1 ? problem(500, 'internal-error') : Response.json({ items: WORDS, next_page_token: null })) }),
    });
    const retry = await screen.findByRole('button', { name: 'Thử lại' }, { timeout: 5000 });
    expect(retry.closest('[role="alert"]')).not.toBeNull();
    expect(screen.queryByText('Nhóm chưa có từ nào.')).not.toBeInTheDocument();
    await userEvent.click(retry);
    expect(await screen.findByRole('list', { name: /Toàn bộ 4 từ/ }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('E17: an unknown or deleted deck shows not found with the way back', async () => {
    search = new URLSearchParams({ id: '00000000-0000-4000-8000-000000000000' });
    renderApp(<GroupPage />, { chrome: true,
      routes: routes({
        'GET /v1/groups/00000000-0000-4000-8000-000000000000': () => problem(404, 'not-found'),
        'GET /v1/groups/00000000-0000-4000-8000-000000000000/items?content=true&page_size=50': () => problem(404, 'not-found'),
      }),
    });
    expect(await screen.findByText('Không tìm thấy nhóm này.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về Danh sách nhóm' })).toHaveAttribute('href', '/vi/app/groups');
  });

  it('opened from the carousel (owner 10/11/2026): the head draws from the deck list at once, before the deck detail arrives', async () => {
    let release!: () => void;
    renderApp(<GroupPage />, { chrome: true,
      routes: routes({
        [`GET /v1/groups/${G}`]: () =>
          new Promise<Response>((r) => (release = () => r(Response.json({ id: G, name: 'Công nghệ', version: 1, item_count: 4, removable_items: 3, created_at: '2026-10-02T03:00:00Z', updated_at: '2026-10-02T03:00:00Z' })))),
      }),
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Công nghệ' })).toBeInTheDocument();
    expect(screen.queryByText(/tạo ngày/)).toBeNull();
    release();
    expect(await screen.findByText(/tạo ngày .*2\/10/)).toBeInTheDocument();
  });

  it('E17: a malformed id never reaches the API', async () => {
    search = new URLSearchParams({ id: '../../admin' });
    const { calls } = renderApp(<GroupPage />, { chrome: true, routes: routes() });
    expect(await screen.findByText('Không tìm thấy nhóm này.')).toBeInTheDocument();
    expect(calls.some((c) => c.path.includes('admin'))).toBe(false);
  });
});

describe('GroupPage: a deck with no words (owner 06/11/2026)', () => {
  const EMPTY = {
    ...SUMMARY, name: 'test3', total: 0, today: { priority: 0, due: 0, new: 0 },
    cells: SUMMARY.cells.map((c) => ({ ...c, total: 0, due: 0 })), backlog: 0, available: { due: 0, new: 0 },
  };
  const emptyRoutes = () =>
    routes({
      [`GET /v1/groups/${G}`]: () => Response.json({ id: G, name: 'test3', version: 1, item_count: 0, removable_items: 0, created_at: '2026-11-06T03:00:00Z', updated_at: '2026-11-06T03:00:00Z' }),
      'GET /v1/groups': () => Response.json({ items: [EMPTY] }),
      [`GET ${WORDS_URL}`]: () => Response.json({ items: [], next_page_token: null }),
      [`GET /v1/groups/${G}/queue?mode=all`]: () => Response.json({ cards: [] }),
    });

  it('the main action is [Thêm từ], locked to this deck; nothing offers to study 0 words, no 0-everywhere counts', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: emptyRoutes() });
    const main = screen.getByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Nhóm này chưa có từ nào' }, { timeout: 5000 })).toBeInTheDocument();
    expect(within(main).queryByRole('link', { name: /Học tất cả|^Ôn \d/ })).not.toBeInTheDocument();
    expect(within(main).queryByText('0 ưu tiên')).not.toBeInTheDocument();
    expect(within(main).queryByRole('figure')).not.toBeInTheDocument();
    expect(within(main).queryByRole('heading', { name: 'Toàn bộ 0 từ' })).not.toBeInTheDocument();
    expect(within(main).getByRole('link', { name: 'Chọn từ theo chủ đề' })).toHaveAttribute('href', '/vi/app/lookup');
    await userEvent.click(within(main).getByRole('button', { name: 'Thêm từ' }));
    expect(await screen.findByText('Lưu vào nhóm: test3', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('the ⋯ menu drops "Học tất cả 0 từ"', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: emptyRoutes() });
    await userEvent.click(await screen.findByRole('button', { name: 'Tùy chọn nhóm' }, { timeout: 5000 }));
    expect(within(await screen.findByRole('menu')).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Đổi tên nhóm', 'Xóa nhóm']);
  });

  it('control: a deck with words keeps its counts, chart and "Học tất cả N từ" in the menu', async () => {
    renderApp(<GroupPage />, { chrome: true, routes: routes() });
    const main = screen.getByRole('main');
    expect(await within(main).findByRole('list', { name: 'Hôm nay' }, { timeout: 5000 })).toHaveTextContent('1 ưu tiên');
    expect(within(main).getByRole('figure')).toBeInTheDocument();
    expect(within(main).queryByRole('heading', { name: 'Nhóm này chưa có từ nào' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tùy chọn nhóm' }));
    expect(within(await screen.findByRole('menu')).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Đổi tên nhóm', 'Học tất cả 4 từ', 'Xóa nhóm']);
  });
});

describe('GroupPage: rename and delete from the ⋯ menu (moved from the list, giao diện mới M3)', () => {
  it('E18: after a version conflict the name field shows the name saved elsewhere', async () => {
    let stored = { id: G, name: 'Công nghệ', version: 1, item_count: 4, removable_items: 3, created_at: '2026-10-02T03:00:00Z', updated_at: '2026-10-02T03:00:00Z' };
    renderApp(<GroupPage />, { chrome: true,
      routes: routes({
        [`GET /v1/groups/${G}`]: () => Response.json(stored),
        [`PATCH /v1/groups/${G}`]: () => {
          stored = { ...stored, name: 'Tên từ máy khác', version: 2 };
          return problem(409, 'version-conflict');
        },
      }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tùy chọn nhóm' }, { timeout: 5000 }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Đổi tên nhóm' }));
    const field = await screen.findByRole('textbox', { name: 'Tên nhóm' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Tên của tôi');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu tên mới' }));
    await waitFor(() => expect(field).toHaveValue('Tên từ máy khác'));
  });

  it('K/14: delete says how many words leave learning (removable_items), then deletes once', async () => {
    const { count } = renderApp(<GroupPage />, { chrome: true,
      routes: routes({
        [`GET /v1/groups/${G}`]: () => Response.json({ id: G, name: 'Công nghệ', version: 1, item_count: 18, removable_items: 12, created_at: '2026-10-02T03:00:00Z', updated_at: '2026-10-02T03:00:00Z' }),
        [`DELETE /v1/groups/${G}`]: () => new Response(null, { status: 204 }),
      }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tùy chọn nhóm' }, { timeout: 5000 }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Xóa nhóm' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa nhóm “Công nghệ”?' });
    expect(within(dialog).getByRole("note")).toHaveTextContent(/12 từ chỉ có trong nhóm này/);
    expect(within(dialog).getByRole('button', { name: 'Giữ nhóm' })).toBeInTheDocument();
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Xóa nhóm và 12 từ' }));
    await waitFor(() => expect(count('DELETE', `/v1/groups/${G}`)).toBe(1));
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/groups'));
  });

  it('English: "Delete deck" and "Cancel"', async () => {
    renderApp(<GroupPage />, { chrome: true, locale: 'en', routes: routes() });
    await userEvent.click(await screen.findByRole('button', { name: 'Deck options' }, { timeout: 5000 }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete deck' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(await within(dialog).findByRole('button', { name: /Delete deck/ })).toBeInTheDocument();
  });
});
