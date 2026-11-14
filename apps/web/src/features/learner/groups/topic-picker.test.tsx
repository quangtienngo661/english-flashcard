// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { problem, rateLimited, type Route } from '@/app-shell/session/test-support';
import { renderApp } from '@/test-utils/render-app';
import { ToastRegion } from '@/ui/Toast';
import { TopicPickerPage } from './TopicPickerPage';

let search = new URLSearchParams({ code: 'business', level: 'B1' });
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/topic',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => search,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sense = (n: number, level: string) => ({
  sense_id: id(n), entry_id: id(n + 1000), lemma: `word${n}`, pos: 'noun', level, is_function_word: false, context_label: null,
  meaning: { text: `nghĩa ${n}`, language: 'vi', translation_missing: false }, definition_en: null, examples: [],
  topics: [{ code: 'business', name: 'Kinh doanh' }],
});
const DECK = id(500);
const NEW = id(600);
const SAME = id(700);
const title = 'Kinh doanh · B1';
const deck = (deckId: string, name: string) => ({
  id: deckId, name, version: 1, total: 2, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0, available: { due: 0, new: 0 },
});
const ITEM_STATE = (senseId: string) => ({
  sense_id: senseId, item_id: id(1100), level: 1, due_date: '2026-10-20', priority: false, group_ids: [DECK],
});
const first = (level = 'B1') => `/v1/senses?topic=business&level=${level}&exclude_function_words=true&page_size=20`;
const second = `${first()}&page_token=p2`;
const summaryPath = (level = 'B1') => `/v1/items/topic-summary?topic=business&level=${level}`;
const action = '/v1/items/topic-add';
const scope = { topic: 'business', level: 'B1' };
const all = (target = { new_group_name: title }) => ({ ...scope, mode: 'all_unlearned', target });
const selected = (target: { group_id: string } | { new_group_name: string }, ...ids: string[]) => ({ ...scope, mode: 'selected', target, sense_ids: ids });
const firstItems = '/v1/items?sense_ids=' + Array.from({ length: 20 }, (_, i) => id(i + 1)).join(',');
const allCheckbox = () => screen.getByRole('checkbox', { name: /^Chọn tất cả .* trên trang này$/ });
const next = () => screen.getByRole('button', { name: 'Trang sau' });
const prev = () => screen.getByRole('button', { name: 'Trang trước' });

function base(count: number, { level = 'B1', start = 1, total = count, learned = [1, 2] }: { level?: string; start?: number; total?: number; learned?: number[] } = {}) {
  const learning = new Set(learned.map(id));
  const routes: Record<string, Route> = {
    'GET /v1/groups': () => Response.json({ items: [deck(DECK, 'Công việc')] }),
    [`GET ${summaryPath(level)}`]: () => Response.json({ total, learning: learning.size, unlearned: total - learning.size }),
  };
  for (let i = 0; i < count; i += 20) {
    const page = Array.from({ length: Math.min(count - i, 20) }, (_, j) => sense(start + i + j, level));
    const ids = page.map((s) => s.sense_id);
    routes[`GET ${first(level)}${i ? `&page_token=p${i / 20 + 1}` : ''}`] = () =>
      Response.json({ items: page, next_page_token: i + 20 < count ? `p${i / 20 + 2}` : null });
    routes[`GET /v1/items?sense_ids=${ids.join(',')}`] = () =>
      Response.json({ items: ids.filter((sid) => learning.has(sid)).map(ITEM_STATE) });
  }
  return { routes, learning };
}

const allReceipt = (added: number, groupId = NEW, full = 0) => ({
  mode: 'all_unlearned', group_id: groupId, eligible: added + full, added, skipped_group_full: full,
});
const selectedReceipt = (added: string[], { groupId = NEW, full = [], already = [], unavailable = [] }: { groupId?: string | null; full?: string[]; already?: string[]; unavailable?: string[] } = {}) => ({
  ...allReceipt(added.length, groupId ?? NEW, full.length), group_id: groupId, mode: 'selected',
  added_ids: added, group_full_ids: full, unavailable_ids: unavailable, already_learning_ids: already,
});

beforeEach(() => { search = new URLSearchParams({ code: 'business', level: 'B1' }); });

describe('TopicPickerPage', () => {
  it('requests only the first 20 rows, uses the separate topic total, and preserves selection across pages', async () => {
    const { routes } = base(21, { total: 2694 });
    const { count } = renderApp(<TopicPickerPage />, { routes });
    const user = userEvent.setup();
    await screen.findByRole('checkbox', { name: 'Chọn word3' });
    expect(screen.getAllByRole('listitem')).toHaveLength(20);
    expect(await screen.findByText(/2\.694 từ gợi ý/)).toBeInTheDocument();
    expect(count('GET', first())).toBe(1);
    expect(count('GET', firstItems)).toBe(1);
    expect(count('GET', second)).toBe(0);
    expect(within(screen.getByRole('listitem', { name: 'word1' })).getByText('đang học · Công việc')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Chọn word1' })).toBeNull();

    expect(screen.queryByRole('button', { name: 'Thêm 1 từ đã chọn' })).toBeNull();
    for (const n of [3, 4, 5, 6, 7]) await user.click(screen.getByRole('checkbox', { name: `Chọn word${n}` }));
    expect(allCheckbox()).toBePartiallyChecked();
    await user.click(next());
    await screen.findByRole('checkbox', { name: 'Chọn word21' });
    expect(count('GET', second)).toBe(1);
    expect(count('GET', `/v1/items?sense_ids=${id(21)}`)).toBe(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    await user.click(allCheckbox());
    expect(screen.getByRole('button', { name: 'Thêm 6 từ đã chọn' })).toBeVisible();
    await user.click(allCheckbox());
    expect(screen.getByRole('button', { name: 'Thêm 5 từ đã chọn' })).toBeVisible();
    await user.click(prev());
    expect(await screen.findByRole('checkbox', { name: 'Chọn word3' })).toBeChecked();
    expect(count('GET', first())).toBe(1);
  });

  it.each(['error', 'empty'] as const)('keeps the current rows and selection while the next cursor is pending then %s, and allows retry', async (failure) => {
    const { routes } = base(21);
    let finish!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { finish = resolve; });
    const success = routes[`GET ${second}`];
    let retried = false;
    routes[`GET ${second}`] = (request) => retried ? success(request) : pending;
    renderApp(<TopicPickerPage />, { routes });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('checkbox', { name: 'Chọn word3' }));
    await user.click(next());
    expect(screen.getByRole('checkbox', { name: 'Chọn word3' })).toBeChecked();
    expect(next()).toBeDisabled();
    retried = true;
    await act(async () => finish(failure === 'error' ? problem(503, 'provider-unavailable') : Response.json({ items: [], next_page_token: null })));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Chọn word3' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('checkbox', { name: 'Chọn word21' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Thêm 1 từ đã chọn' })).toBeVisible();
  });

  it('resets the cursor and selection when the address changes level', async () => {
    const { routes } = base(21);
    function LevelNavigation() {
      const [, redraw] = useState(false);
      return <><button onClick={() => { search.set('level', 'B2'); redraw(true); }}>B2</button><TopicPickerPage /></>;
    }
    const { count } = renderApp(<LevelNavigation />, { routes: { ...routes, ...base(3, { level: 'B2', start: 91, learned: [] }).routes } });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('checkbox', { name: 'Chọn word3' }));
    await user.click(next());
    await screen.findByRole('checkbox', { name: 'Chọn word21' });
    await user.click(screen.getByRole('button', { name: 'B2' }));
    expect(await screen.findByRole('checkbox', { name: 'Chọn word91' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Thêm 1 từ đã chọn' })).toBeNull();
    expect(count('GET', first('B2'))).toBe(1);
    expect(count('GET', `${first('B2')}&page_token=p2`)).toBe(0);
  });

  it('waits for the URL group, submits to that group, and asks for a new target on 404 without losing selection', async () => {
    search.set('group', SAME.toUpperCase());
    const { routes } = base(21);
    let finish!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { finish = resolve; });
    const { calls } = renderApp(<TopicPickerPage />, { routes: {
      ...routes,
      'GET /v1/groups': () => pending,
      [`POST ${action}`]: () => problem(404, 'not-found'),
    } });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('checkbox', { name: 'Chọn word3' }));
    expect(screen.getByRole('button', { name: 'Thêm 1 từ đã chọn' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Thêm tất cả từ chưa học/ })).toBeDisabled();
    const send = () => calls.filter((c) => c.path === action);
    expect(send()).toHaveLength(0);
    await act(async () => finish(Response.json({ items: [deck(DECK, title), deck(SAME, 'Đúng nhóm')] })));
    await waitFor(() => expect(screen.getByRole('button', { name: /Thêm vào/i })).toHaveTextContent('Đúng nhóm'));
    await user.click(screen.getByRole('button', { name: 'Thêm 1 từ đã chọn' }));
    await screen.findByText(/Nhóm đích không còn khả dụng/);
    expect(send().map((c) => c.body)).toEqual([selected({ group_id: SAME }, id(3))]);
    expect(screen.getByRole('checkbox', { name: 'Chọn word3' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Thêm 1 từ đã chọn' })).toBeDisabled();
  });

  it.each([id(999), '../../bad'])('does not default to a different group for a missing URL target (%s)', async (group) => {
    search.set('group', group);
    const { routes } = base(5);
    renderApp(<TopicPickerPage />, { routes });
    expect(await screen.findByText(/Nhóm đích không còn khả dụng/)).toBeVisible();
    expect(screen.getByRole('button', { name: /^Thêm tất cả từ chưa học/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Thêm vào/i }));
    await userEvent.click(screen.getByRole('option', { name: 'Công việc' }));
    expect(screen.getByRole('button', { name: /^Thêm tất cả từ chưa học/ })).toBeEnabled();
  });

  it('sends one scope-only all request even if some checkboxes are on, then clears the draft', async () => {
    const { routes, learning } = base(21, { total: 2694 });
    const { calls, count } = renderApp(<><TopicPickerPage /><ToastRegion /></>, { routes: {
      ...routes,
      [`POST ${action}`]: () => {
        learning.add(id(3));
        return Response.json(allReceipt(100, NEW, 2592));
      },
    } });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Chọn word3' }));
    await userEvent.click(await screen.findByRole('button', { name: /^Thêm tất cả từ chưa học/ }));
    expect(await screen.findByText(/Đã thêm 100 từ vào nhóm “Kinh doanh · B1”/)).toHaveTextContent('2.592 từ không vừa');
    expect(calls.filter((c) => c.path === action).map((c) => c.body)).toEqual([all()]);
    expect(calls.some((c) => c.method === 'POST' && c.path.startsWith('/v1/groups'))).toBe(false);
    expect(screen.queryByRole('button', { name: 'Thêm 1 từ đã chọn' })).toBeNull();
    expect(count('GET', second)).toBe(0);
  });

  it('uses the existing topic-named group and keeps only still-eligible IDs after a full group receipt', async () => {
    const { routes, learning } = base(21);
    const { calls, count } = renderApp(<><TopicPickerPage /><ToastRegion /></>, { routes: {
      ...routes,
      'GET /v1/groups': () => Response.json({ items: [deck(SAME, title)] }),
      [`POST ${action}`]: () => {
        learning.add(id(3)).add(id(4));
        return Response.json(selectedReceipt([id(3)], { groupId: SAME, already: [id(4)], unavailable: [id(5)], full: [id(21)] }));
      },
    } });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('checkbox', { name: 'Chọn word5' }));
    await user.click(screen.getByRole('checkbox', { name: 'Chọn word4' }));
    await user.click(screen.getByRole('checkbox', { name: 'Chọn word3' }));
    await user.click(next());
    await user.click(await screen.findByRole('checkbox', { name: 'Chọn word21' }));
    await user.click(screen.getByRole('button', { name: 'Thêm 4 từ đã chọn' }));
    expect(await screen.findByText(/Đã thêm 1 từ vào nhóm/)).toBeVisible();
    expect(calls.find((c) => c.path === action)?.body).toEqual(selected({ group_id: SAME }, id(3), id(4), id(5), id(21)));
    expect(screen.getByRole('checkbox', { name: 'Chọn word21' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Thêm 1 từ đã chọn' })).toBeVisible();
    expect(count('GET', first())).toBe(1);
    await waitFor(() => expect(count('GET', second)).toBe(2));
  });

  it.each(['network', '5xx', '429'] as const)('resumes an unconfirmed batch after %s with the same body and key', async (failure) => {
    const { routes, learning } = base(201, { learned: [] });
    let attempt = 0;
    const { calls } = renderApp(<><TopicPickerPage /><ToastRegion /></>, { routes: {
      ...routes,
      'GET /v1/groups': () => Response.json({ items: [deck(DECK, 'Công việc'), ...(attempt > 0 ? [deck(NEW, title)] : [])] }),
      [`POST ${action}`]: ({ body }) => {
        const { sense_ids: ids } = body as { sense_ids: string[] };
        attempt += 1;
        if (attempt === 2) {
          if (failure === 'network') throw new TypeError('connection lost');
          return failure === '429' ? rateLimited(1) : problem(502, '');
        }
        for (const sid of ids) learning.add(sid);
        return Response.json(selectedReceipt(ids));
      },
    } });
    const user = userEvent.setup();
    await screen.findByRole('checkbox', { name: 'Chọn word1' });
    for (const n of [21, 41, 61, 81, 101, 121, 141, 161, 181, 201]) {
      fireEvent.click(allCheckbox());
      fireEvent.click(next());
      await screen.findByText(`word${n}`, { exact: true });
    }
    await user.click(allCheckbox());
    await user.click(screen.getByRole('button', { name: 'Thêm 201 từ đã chọn' }));
    expect(await screen.findByText(/Đã xác nhận.*100 từ/)).toBeVisible();
    const retry = screen.getByRole('button', { name: 'Tiếp tục thêm' });
    if (failure === '429') {
      expect(retry).toBeDisabled();
      await waitFor(() => expect(retry).toBeEnabled(), { timeout: 3000 });
    }
    await user.click(retry);
    expect(await screen.findByText(/Đã thêm 201 từ vào nhóm/)).toBeVisible();
    const batches = calls.filter((c) => c.path === action);
    expect(batches).toHaveLength(4);
    expect(batches.map((c) => c.body)).toEqual([
      selected({ new_group_name: title }, ...Array.from({ length: 100 }, (_, i) => id(1 + i))),
      selected({ group_id: NEW }, ...Array.from({ length: 100 }, (_, i) => id(101 + i))),
      selected({ group_id: NEW }, ...Array.from({ length: 100 }, (_, i) => id(101 + i))),
      selected({ group_id: NEW }, id(201)),
    ]);
    expect(batches[1].headers['Idempotency-Key']).toBeTruthy();
    expect(batches[1].headers['Idempotency-Key']).toBe(batches[2].headers['Idempotency-Key']);
    expect(new Set([0, 1, 3].map((i) => batches[i].headers['Idempotency-Key'])).size).toBe(3);
  });

  it('provides English labels for the page checkbox and topic-wide action', async () => {
    renderApp(<TopicPickerPage />, { locale: 'en', routes: base(21).routes });
    expect(await screen.findByRole('checkbox', { name: /Select all 18 .* on this page/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Add all words not yet learned/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeVisible();
  });
});
