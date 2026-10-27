// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { problem } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
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

describe('GroupPage (K/11–K/13)', () => {
  it('group page shows [Add word] and opens the sheet locked to this deck', async () => {
    renderApp(<GroupPage />, { routes: routes(), locale: 'en' });
    const main = screen.getByRole('main');
    await userEvent.click(await within(main).findByRole('button', { name: 'Add word' }, { timeout: 5000 }));
    expect(await screen.findByText('Saving to deck: Công nghệ', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save to deck/ })).not.toBeInTheDocument();
  });

  it('phone: the + button opens it locked', async () => {
    renderApp(<GroupPage />, { routes: routes() });
    await screen.findByRole('heading', { name: 'Công nghệ' }, { timeout: 5000 });
    const fab = screen.getAllByRole('button', { name: 'Thêm từ' }).find((button) => button.getAttribute('aria-label') === 'Thêm từ');
    expect(fab).toBeDefined();
    await userEvent.click(fab!);
    expect(await screen.findByText('Lưu vào nhóm: Công nghệ', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('group page sets the scope; leaving clears it', async () => {
    // Keep AppShell and its provider mounted when GroupBody leaves on an invalid id.
    function PersistentPage() {
      const [, refresh] = useState(0);
      return <><button onClick={() => { search = new URLSearchParams(); refresh((n) => n + 1); }}>Leave deck</button><GroupPage /></>;
    }
    renderApp(<PersistentPage />, { routes: routes() });
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
    renderApp(<GroupPage />, { routes: routes() });
    await screen.findByRole('heading', { name: 'Công nghệ' }, { timeout: 5000 });
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(await screen.findByText('Lưu vào nhóm: Công nghệ', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu vào nhóm/ })).not.toBeInTheDocument();
  });

  it('the stage chart is labelled Mới · 1 · 3 · 7 · 14 · 30', async () => {
    renderApp(<GroupPage />, { routes: routes() });
    const chart = await screen.findByRole('figure', { name: /số ngày giữa hai lần ôn/ });
    expect(within(chart).getAllByRole('listitem').map((li) => li.dataset.stage)).toEqual(['Mới', '1', '3', '7', '14', '30']);
  });

  it('English labels the first stage "New"', async () => {
    renderApp(<GroupPage />, { routes: routes(), locale: 'en' });
    const chart = await screen.findByRole('figure', { name: /New 1/ });
    expect(within(chart).getAllByRole('listitem')[0].dataset.stage).toBe('New');
  });

  it("the creation date is the learner's day, not UTC (review I7)", async () => {
    renderApp(<GroupPage />, {
      routes: routes({
        [`GET /v1/groups/${G}`]: () =>
          Response.json({ id: G, name: 'Công nghệ', version: 1, item_count: 4, removable_items: 3, created_at: '2026-10-22T23:30:00Z', updated_at: '2026-10-22T23:30:00Z' }),
      }),
    });
    expect(await screen.findByText(/tạo ngày .*23\/10/)).toBeInTheDocument();
  });

  it('M3: each word links to its word page', async () => {
    renderApp(<GroupPage />, { routes: routes() });
    const row = await screen.findByRole('listitem', { name: 'deploy' });
    expect(within(row).getByRole('link', { name: 'deploy' })).toHaveAttribute('href', '/vi/app/word?w=deploy');
  });

  it('review button and the long-overdue link', async () => {
    renderApp(<GroupPage />, { routes: routes() });
    expect(await screen.findByRole('link', { name: 'Ôn 3 thẻ' }, { timeout: 5000 })).toHaveAttribute('href', `/vi/app/review?group=${G}`);
    expect(screen.getByRole('link', { name: /3 từ lâu chưa ôn/ })).toHaveAttribute('href', `/vi/app/group/backlog?id=${G}`);
  });

  it('rows show the stage, priority and a changed meaning', async () => {
    renderApp(<GroupPage />, { routes: routes() });
    const list = await screen.findByRole('list', { name: 'Toàn bộ 4 từ' });
    const deploy = within(list).getByRole('listitem', { name: 'deploy' });
    expect(within(deploy).getByText('Ngăn 1 ngày · ưu tiên')).toBeInTheDocument();
    await waitFor(() => expect(within(within(list).getByRole('listitem', { name: 'release' })).getByText('nghĩa đã đổi')).toBeInTheDocument());
  });

  it('the filter lists every stage with its count and filters the rows', async () => {
    renderApp(<GroupPage />, { routes: routes() });
    await screen.findByRole('list', { name: 'Toàn bộ 4 từ' });
    await userEvent.click(screen.getByRole('button', { name: /Lọc từ trong nhóm/ }));
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(options).toEqual([
      'Tất cả4 từ', 'Ưu tiên1 từ', 'Đến hạn7 từ', 'Mới1 từ', 'Ngăn 1 ngày2 từ', 'Ngăn 3 ngày0 từ', 'Ngăn 7 ngày1 từ', 'Ngăn 14 ngày0 từ', 'Ngăn 30 ngày0 từ',
    ]);
    await userEvent.click(screen.getByRole('option', { name: /Ngăn 1 ngày/ }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Toàn bộ 4 từ' })).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['deploy', 'release']));
  });

  it('a section filter asks the server for that section (no whole-deck load)', async () => {
    const { count } = renderApp(<GroupPage />, { routes: routes() });
    await screen.findByRole('list', { name: 'Toàn bộ 4 từ' });
    await userEvent.click(screen.getByRole('button', { name: /Lọc từ trong nhóm/ }));
    await userEvent.click(await screen.findByRole('option', { name: /Đến hạn/ }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Toàn bộ 4 từ' })).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['release']));
    expect(count('GET', `${WORDS_URL}&section=due`)).toBe(1);
    expect(count('GET', `/v1/groups/${G}/queue?mode=all`)).toBe(0);
  });

  it('[Xem thêm từ] loads the next page with its token and appends it', async () => {
    renderApp(<GroupPage />, {
      routes: routes({
        [`GET ${WORDS_URL}`]: () => Response.json({ items: WORDS.slice(0, 2), next_page_token: 'p2' }),
        [`GET ${WORDS_URL}&page_token=p2`]: () => Response.json({ items: WORDS.slice(2), next_page_token: null }),
      }),
    });
    await screen.findByRole('listitem', { name: 'release' });
    expect(screen.queryByRole('listitem', { name: 'went' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xem thêm từ' }));
    expect(await screen.findByRole('listitem', { name: 'ship' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem thêm từ' })).not.toBeInTheDocument();
  });

  it('removing a word that is only in this deck asks first; one in two decks goes at once', async () => {
    const { count } = renderApp(<GroupPage />, {
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
    renderApp(<GroupPage />, {
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
    renderApp(<GroupPage />, {
      routes: routes({
        'GET /v1/groups/00000000-0000-4000-8000-000000000000': () => problem(404, 'not-found'),
        'GET /v1/groups/00000000-0000-4000-8000-000000000000/items?content=true&page_size=50': () => problem(404, 'not-found'),
      }),
    });
    expect(await screen.findByText('Không tìm thấy nhóm này.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về Danh sách nhóm' })).toHaveAttribute('href', '/vi/app/groups');
  });

  it('E17: a malformed id never reaches the API', async () => {
    search = new URLSearchParams({ id: '../../admin' });
    const { calls } = renderApp(<GroupPage />, { routes: routes() });
    expect(await screen.findByText('Không tìm thấy nhóm này.')).toBeInTheDocument();
    expect(calls.some((c) => c.path.includes('admin'))).toBe(false);
  });
});
