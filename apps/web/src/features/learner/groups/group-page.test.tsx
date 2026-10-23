// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const ITEMS = CARDS.map((c) => ({
  item_id: c.item_id, sense_id: c.sense_id, level: c.level, due_date: c.due_date, priority: c.priority,
  group_count: c.item_id === 'i-ship' ? 2 : 1, sense_changed: c.item_id === 'i-release', added_at: '2026-10-02T00:00:00Z',
}));
const SUMMARY = {
  id: G, name: 'Công nghệ', version: 1, total: 4, today: { priority: 1, due: 1, new: 1 },
  cells: [1, 2, 0, 1, 0, 0].map((total, level) => ({ level, total, due: level === 1 ? 2 : 0 })), backlog: 3,
};
const routes = (extra = {}) => ({
  [`GET /v1/groups/${G}`]: () => Response.json({ id: G, name: 'Công nghệ', version: 1, item_count: 4, removable_items: 3, created_at: '2026-10-02T03:00:00Z', updated_at: '2026-10-02T03:00:00Z' }),
  'GET /v1/groups': () => Response.json({ items: [SUMMARY] }),
  [`GET /v1/groups/${G}/queue?mode=all`]: () => Response.json({ cards: CARDS }),
  [`GET /v1/groups/${G}/items?page_size=100`]: () => Response.json({ items: ITEMS, next_page_token: null }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  ...extra,
});

beforeEach(() => {
  search = new URLSearchParams({ id: G });
});

describe('GroupPage (K/11–K/13)', () => {
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
      'Tất cả4 từ', 'Ưu tiên1 từ', 'Đến hạn1 từ', 'Mới1 từ', 'Ngăn 1 ngày2 từ', 'Ngăn 3 ngày0 từ', 'Ngăn 7 ngày1 từ', 'Ngăn 14 ngày0 từ', 'Ngăn 30 ngày0 từ',
    ]);
    await userEvent.click(screen.getByRole('option', { name: /Ngăn 1 ngày/ }));
    const list = screen.getByRole('list', { name: 'Toàn bộ 4 từ' });
    expect(within(list).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['deploy', 'release']);
  });

  it('removing a word that is only in this deck asks first; one in two decks goes at once', async () => {
    const { count } = renderApp(<GroupPage />, {
      routes: routes({
        [`DELETE /v1/groups/${G}/items/i-deploy`]: () => Response.json({ removed_from_learning: true }),
        [`DELETE /v1/groups/${G}/items/i-ship`]: () => Response.json({ removed_from_learning: false }),
      }),
    });
    await waitFor(() => expect(count('GET', `/v1/groups/${G}/items?page_size=100`)).toBe(1));
    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ ship khỏi nhóm' }));
    await waitFor(() => expect(count('DELETE', `/v1/groups/${G}/items/i-ship`)).toBe(1));
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ deploy khỏi nhóm' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bỏ “deploy” khỏi nhóm?' });
    expect(count('DELETE', `/v1/groups/${G}/items/i-deploy`)).toBe(0);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bỏ khỏi nhóm' }));
    await waitFor(() => expect(count('DELETE', `/v1/groups/${G}/items/i-deploy`)).toBe(1));
  });

  it('E17: an unknown or deleted deck shows not found with the way back', async () => {
    search = new URLSearchParams({ id: '00000000-0000-4000-8000-000000000000' });
    renderApp(<GroupPage />, {
      routes: routes({
        'GET /v1/groups/00000000-0000-4000-8000-000000000000': () => problem(404, 'not-found'),
        'GET /v1/groups/00000000-0000-4000-8000-000000000000/queue?mode=all': () => problem(404, 'not-found'),
        'GET /v1/groups/00000000-0000-4000-8000-000000000000/items?page_size=100': () => problem(404, 'not-found'),
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
