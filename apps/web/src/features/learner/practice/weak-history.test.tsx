// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import type { Route } from '@/app-shell/session/test-support';
import { HistoryPage } from './HistoryPage';
import { WeakWordsPage } from './WeakWordsPage';

let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/practice/history',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => search,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => {
  search = new URLSearchParams();
});

const TECH = '11111111-1111-4111-8111-111111111111';
const NOW = new Date().toISOString();
const weak = (lemma: string, wrong: number, counted: number, level: number, meaning: string | null = `nghĩa ${lemma}`) => ({
  sense_id: `s-${lemma}`, lemma, wrong, counted, level, last_wrong_at: NOW, meaning,
});
const CONFIG = {
  practice: { max_questions_per_session: 20, default_questions_per_session: 10 },
  reminders: { send_time: '20:00' }, learning: { backlog_after_days: 60, groups_per_user: 100 },
  plans: { free: { practice_sessions_per_day: 3 }, trial: { ai_practice_per_cycle: 100, ai_lookup_per_cycle: 30 }, pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 } },
};
const ENT = {
  plan: 'free', sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  features: { 'ai.practice': { allowed: false, reason: 'plan-required' }, 'ai.lookup': { allowed: false, reason: 'plan-required' } },
  pools: {
    practice_sessions: { limit: 3, used: 1, remaining: 2, resets_at: '2026-10-23T17:00:00.000Z' },
    ai_practice: { limit: 0, used: 0, remaining: 0, resets_at: null }, ai_lookup: { limit: 0, used: 0, remaining: 0, resets_at: null },
  },
};
const notFound: Route = () => Response.json({ type: 'http://x/problems/not-found', status: 404, title: 'n' }, { status: 404 });
const base = (over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/groups': () => Response.json({ items: [{ id: TECH, name: 'Công nghệ', version: 1, total: 18, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 }] }),
  'GET /v1/me/app-config': () => Response.json(CONFIG),
  'GET /v1/me/entitlements': () => Response.json(ENT),
  'GET /v1/practice/sessions/current': notFound,
  'GET /v1/practice/weak-words/groups': () => Response.json({ total: 6, items: [{ group_id: TECH, name: 'Công nghệ', count: 3 }] }),
  'GET /v1/practice/weak-words?page_size=50': () =>
    Response.json({ items: [weak('cache', 2, 3, 1), weak('deploy', 3, 5, 1), weak('release', 2, 5, 2)], next_page_token: null }),
  [`GET /v1/practice/weak-words?group_id=${TECH}&page_size=50`]: () =>
    Response.json({ items: [weak('cache', 2, 3, 1), weak('deploy', 3, 5, 1), weak('release', 2, 5, 2)], next_page_token: null }),
  'POST /v1/practice/sessions': () => Response.json({ session: {} }, { status: 201 }),
  ...over,
});
const posts = (calls: Array<{ method: string; path: string; body: unknown }>, path: string) => calls.filter((c) => c.method === 'POST' && c.path === path);

describe('WeakWordsPage (K/56)', () => {
  it('all decks first: the count, each word with its meaning, "sai x/y", stage and when it was last wrong', async () => {
    renderApp(<WeakWordsPage />, { routes: base() });
    expect(await screen.findByRole('heading', { name: '6 từ hay sai' })).toBeInTheDocument();
    const row = (await screen.findByText('deploy')).closest('li')!;
    expect(within(row).getByText('nghĩa deploy')).toBeInTheDocument();
    expect(within(row).getByText('sai 3/5')).toBeInTheDocument();
    expect(within(row).getByText('1 ngày')).toBeInTheDocument();
    expect(within(row).getByText(/hôm nay$/)).toBeInTheDocument();
    expect(screen.getByText('Vào: sai 2 lần trong 5 câu gần nhất, ở mọi kiểu câu.')).toBeInTheDocument();
  });

  it('API (b): the deck list counts weak words; a deck narrows the list and the start sends its group_id', async () => {
    const view = renderApp(<WeakWordsPage />, { routes: base() });
    await screen.findByRole('heading', { name: '6 từ hay sai' });
    await userEvent.click(screen.getByRole('button', { name: /Nhóm/ }));
    expect(await screen.findByRole('option', { name: 'Tất cả nhóm · 6' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Công nghệ · 3' }));
    expect(await screen.findByRole('heading', { name: '3 từ trong nhóm Công nghệ' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Luyện 3 từ của nhóm Công nghệ' }));
    await waitFor(() => expect(posts(view.calls, '/v1/practice/sessions')).toHaveLength(1));
    expect(posts(view.calls, '/v1/practice/sessions')[0].body).toEqual({
      source: 'weak', group_id: TECH, types: ['mcq_definition', 'true_false_definition', 'type_word'], count: 10,
    });
  });

  it('no weak word yet: an empty state and no start', async () => {
    renderApp(<WeakWordsPage />, {
      routes: base({
        'GET /v1/practice/weak-words/groups': () => Response.json({ total: 0, items: [] }),
        'GET /v1/practice/weak-words?page_size=50': () => Response.json({ items: [], next_page_token: null }),
      }),
    });
    expect(await screen.findByText('Chưa có từ nào hay sai.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Luyện/ })).not.toBeInTheDocument();
  });
});

const historyItem = (over: Record<string, unknown>) => ({
  item_id: 'h1', session_id: 'x', sense_id: 's1', lemma: 'cache', type: 'type_word', prompt_style: 'meaning',
  prompt: { kind: 'type_meaning', meaning: 'bộ nhớ đệm' }, answer: 'cash', correct: { lemma: 'cache', text: 'cache', choice_index: null, is_true: null },
  result: 'wrong', skipped: true, tries: 2, hint_level: 0, review_action: 'needs_review', answered_at: '2026-10-20T14:10:00Z', local_date: '2026-10-20',
  translation: null, ...over,
});
const HISTORY = {
  items: [
    historyItem({}),
    historyItem({ item_id: 'h2', lemma: 'server', type: 'true_false_definition', prompt: { kind: 'true_false', lemma: 'server', meaning: 'máy chủ' }, answer: 'true', correct: { lemma: 'server', text: 'máy chủ', choice_index: null, is_true: true }, result: 'correct', skipped: false, tries: 1, review_action: 'known' }),
    historyItem({ item_id: 'h3', lemma: 'update', prompt_style: 'sentence', prompt: { kind: 'type_sentence', sentence: 'We ___ the app.' }, answer: 'update', correct: { lemma: 'update', text: 'update', choice_index: null, is_true: null }, result: 'correct', skipped: false, tries: 1, hint_level: 1, review_action: null }),
  ],
  next_page_token: null,
};
const REPORTS = {
  items: [
    { id: 'r1', item_id: 'i1', sense_id: 's-deploy', reason_label: 'Có hơn một đáp án đúng', status: 'open', refunded: null, created_at: '2026-10-18T03:00:00Z', resolved_at: null },
    { id: 'r2', item_id: 'i2', sense_id: 's-cache', reason_label: 'Câu sai ngữ pháp hoặc không tự nhiên', status: 'confirmed', refunded: true, created_at: '2026-10-17T03:00:00Z', resolved_at: '2026-10-18T03:00:00Z' },
    { id: 'r3', item_id: 'i3', sense_id: 's-gone', reason_label: 'Khác', status: 'confirmed', refunded: false, created_at: '2026-10-12T03:00:00Z', resolved_at: '2026-10-13T03:00:00Z' },
  ],
  next_page_token: null,
};
const historyRoutes = (over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/practice/history?page_size=50': () => Response.json(HISTORY),
  'GET /v1/practice/reports?page_size=20': () => Response.json(REPORTS),
  'GET /v1/senses/s-deploy': () => Response.json({ sense_id: 's-deploy', lemma: 'deploy' }),
  'GET /v1/senses/s-cache': () => Response.json({ sense_id: 's-cache', lemma: 'cache' }),
  'GET /v1/senses/s-gone': notFound,
  ...over,
});

describe('HistoryPage (K/57, K/57b, K/82, K/83)', () => {
  it('Câu đã làm: type with style, answer, right answer, result and what was pressed', async () => {
    renderApp(<HistoryPage />, { routes: historyRoutes() });
    expect(screen.getByRole('tab', { name: 'Câu đã làm', selected: true })).toBeInTheDocument();
    const cache = (await screen.findByText('cache', { selector: '[data-col="word"]' })).closest('li')!;
    expect(within(cache).getByText('Gõ từ · theo nghĩa')).toBeInTheDocument();
    expect(within(cache).getByText('Sai · bỏ qua')).toBeInTheDocument();
    expect(within(cache).getByText('Cần ôn lại')).toBeInTheDocument();
    const server = screen.getByText('server', { selector: '[data-col="word"]' }).closest('li')!;
    expect(within(server).getByText('Đã biết')).toBeInTheDocument();
    const update = screen.getByText('update', { selector: '[data-col="word"]' }).closest('li')!;
    expect(within(update).getByText('Gõ từ · theo câu')).toBeInTheDocument();
    expect(within(update).getByText('Đúng · có gợi ý')).toBeInTheDocument();
    expect(screen.getByText('3 câu')).toBeInTheDocument();
    expect(screen.getByText('2 đúng')).toBeInTheDocument();
  });

  it('K/57b: nothing answered yet', async () => {
    renderApp(<HistoryPage />, { routes: historyRoutes({ 'GET /v1/practice/history?page_size=50': () => Response.json({ items: [], next_page_token: null }) }) });
    expect(await screen.findByText('Bạn chưa làm câu nào.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về Luyện tập' })).toHaveAttribute('href', '/vi/app/practice');
  });

  it('the day filter asks the API for that local date', async () => {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const view = renderApp(<HistoryPage />, {
      routes: historyRoutes({ [`GET /v1/practice/history?date=${day}&page_size=50`]: () => Response.json({ items: [], next_page_token: null }) }),
    });
    await screen.findByText('cache', { selector: '[data-col="word"]' });
    await userEvent.click(screen.getByRole('button', { name: /Ngày/ }));
    await userEvent.click(await screen.findByRole('option', { name: /^Hôm nay/ }));
    expect(await screen.findByText('Ngày này bạn chưa làm câu nào.')).toBeInTheDocument();
    expect(view.calls.some((c) => c.path === `/v1/practice/history?date=${day}&page_size=50`)).toBe(true);
  });

  it('K/82: my reports with their outcome and what became of the AI credit', async () => {
    search = new URLSearchParams({ tab: 'reports' });
    renderApp(<HistoryPage />, { routes: historyRoutes() });
    expect(screen.getByRole('tab', { name: 'Báo lỗi của tôi', selected: true })).toBeInTheDocument();
    const first = (await screen.findByText('Có hơn một đáp án đúng')).closest('li')!;
    expect(await within(first).findByText('deploy')).toBeInTheDocument();
    expect(within(first).getByText('Đang xem')).toBeInTheDocument();
    const second = screen.getByText('Câu sai ngữ pháp hoặc không tự nhiên').closest('li')!;
    expect(within(second).getByText('Đã xác nhận lỗi')).toBeInTheDocument();
    expect(within(second).getByText('Đã trả lại 1 lượt câu AI')).toBeInTheDocument();
    const third = screen.getByText('Khác').closest('li')!;
    expect(within(third).getByText('Lượt câu AI này không trả lại được')).toBeInTheDocument();
    expect(await within(third).findByText('—')).toBeInTheDocument();
  });

  it('K/83: no report yet', async () => {
    search = new URLSearchParams({ tab: 'reports' });
    renderApp(<HistoryPage />, { routes: historyRoutes({ 'GET /v1/practice/reports?page_size=20': () => Response.json({ items: [], next_page_token: null }) }) });
    expect(await screen.findByText('Bạn chưa báo lỗi câu nào.')).toBeInTheDocument();
  });

  it('switching tabs shows the other list', async () => {
    renderApp(<HistoryPage />, { routes: historyRoutes() });
    await screen.findByText('cache', { selector: '[data-col="word"]' });
    await userEvent.click(screen.getByRole('tab', { name: 'Báo lỗi của tôi' }));
    expect(await screen.findByText('Có hơn một đáp án đúng')).toBeInTheDocument();
  });
});
