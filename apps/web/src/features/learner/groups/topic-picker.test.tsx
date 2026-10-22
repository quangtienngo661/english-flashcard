// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import { ToastRegion } from '@/app-ui/Toast';
import { TopicPickerPage } from './TopicPickerPage';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/topic',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ code: 'business', level: 'B1' }),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sense = (n: number) => ({
  sense_id: id(n), entry_id: `e${n}`, lemma: `word${n}`, pos: 'noun', level: 'B1', is_function_word: false, context_label: null,
  meaning: { text: `nghĩa ${n}`, language: 'vi', translation_missing: false }, definition_en: null, examples: [],
  topics: [{ code: 'business', name: 'Kinh doanh' }],
});
const DECK = '33333333-3333-4333-8333-333333333333';
const base = (total: number, learning: number[] = [1, 2]) => {
  const senses = Array.from({ length: total }, (_, i) => sense(i + 1));
  const pages = [senses.slice(0, 100), senses.slice(100)];
  const ids = senses.map((s) => s.sense_id);
  const routes: Record<string, (c: { path: string }) => Response> = {
    'GET /v1/senses?topic=business&level=B1&exclude_function_words=true&page_size=100': () =>
      Response.json({ items: pages[0], next_page_token: pages[1].length ? 'p2' : null }),
    'GET /v1/senses?topic=business&level=B1&exclude_function_words=true&page_size=100&page_token=p2': () =>
      Response.json({ items: pages[1], next_page_token: null }),
    'GET /v1/groups': () => Response.json({ items: [{ id: DECK, name: 'Công việc', version: 1, total: 2, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 }] }),
    'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
    'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
    'POST /v1/groups': () => Response.json({ id: 'new-deck', name: 'Kinh doanh · B1' }, { status: 201 }),
    'POST /v1/groups/new-deck/items/bulk': () => Response.json({ added: 3, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 0, skipped_not_found: 0 }),
  };
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    routes[`GET /v1/items?sense_ids=${chunk.join(',')}`] = () =>
      Response.json({ items: learning.filter((n) => chunk.includes(id(n))).map((n) => ({ sense_id: id(n), item_id: `i${n}`, level: 1, due_date: '2026-10-20', priority: false, group_ids: [DECK] })) });
  }
  return routes;
};

describe('TopicPickerPage (K/18)', () => {
  it('counts suggested, unlearned and selected words; learning rows cannot be ticked', async () => {
    renderApp(<TopicPickerPage />, { routes: base(52) });
    expect(await screen.findByRole('heading', { name: 'Kinh doanh · B1' })).toBeInTheDocument();
    expect(screen.getByText('52 từ gợi ý. Chọn từ bạn muốn học, hoặc thêm cả chủ đề.')).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: 'Chọn tất cả (50 từ chưa học)' })).toBeInTheDocument();
    const row1 = screen.getByRole('listitem', { name: 'word1' });
    expect(within(row1).getByText('Đang học · Công việc')).toBeInTheDocument();
    expect(within(row1).queryByRole('checkbox')).not.toBeInTheDocument();
    for (const n of [3, 4, 5]) await userEvent.click(screen.getByRole('checkbox', { name: `Chọn word${n}` }));
    expect(screen.getByText('Đã chọn 3 từ')).toBeInTheDocument();
  });

  it('"Thêm 3 từ đã chọn" creates the new deck first, then sends exactly those sense_ids', async () => {
    const { calls } = renderApp(
      <>
        <TopicPickerPage />
        <ToastRegion />
      </>,
      { routes: base(52) },
    );
    for (const n of [3, 4, 5]) await userEvent.click(await screen.findByRole('checkbox', { name: `Chọn word${n}` }));
    expect(screen.getByRole('button', { name: /Nhóm mới “Kinh doanh · B1”/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm 3 từ đã chọn' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/v1/groups/new-deck/items/bulk')).toBe(true));
    const order = calls.filter((c) => c.method === 'POST' && c.path.startsWith('/v1/groups')).map((c) => c.path);
    expect(order).toEqual(['/v1/groups', '/v1/groups/new-deck/items/bulk']);
    expect(calls.find((c) => c.method === 'POST' && c.path === '/v1/groups')!.body).toEqual({ name: 'Kinh doanh · B1' });
    expect(calls.find((c) => c.path.endsWith('/bulk'))!.body).toEqual({ sense_ids: [id(3), id(4), id(5)] });
    expect(await screen.findByText('Đã thêm 3 từ vào nhóm “Kinh doanh · B1”.')).toBeInTheDocument();
  });

  it('"Thêm cả 50 từ" sends the 50 unlearned ids when there are 100 or fewer', async () => {
    const { calls } = renderApp(<TopicPickerPage />, { routes: base(52) });
    await userEvent.click(await screen.findByRole('button', { name: 'Thêm cả 50 từ' }));
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/bulk'))).toBe(true));
    const body = calls.find((c) => c.path.endsWith('/bulk'))!.body as { sense_ids: string[] };
    expect(body.sense_ids).toHaveLength(50);
    expect(body.sense_ids).not.toContain(id(1));
  });

  it('over 100 unlearned words, "Thêm cả" sends the topic filter instead', async () => {
    const { calls } = renderApp(<TopicPickerPage />, { routes: base(130) });
    await userEvent.click(await screen.findByRole('button', { name: 'Thêm cả 128 từ' }));
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/bulk'))).toBe(true));
    expect(calls.find((c) => c.path.endsWith('/bulk'))!.body).toEqual({ topic: 'business', level: 'B1' });
  });
});
