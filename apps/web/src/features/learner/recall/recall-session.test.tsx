// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Route } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { RecallSession } from './RecallSession';

const G = '11111111-1111-4111-8111-111111111111';
const S = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const params = { current: new URLSearchParams({ group: G }) };
const hardReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/recall',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => params.current,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => {
  params.current = new URLSearchParams({ group: G });
  hardReplace.mockReset();
});

const view = (over: Record<string, unknown> = {}) => ({
  id: S, kind: 'recall', source: 'group', group_id: G, group_filter: null, sort: 'queue', types: ['mcq_definition', 'type_word'],
  prompt_style: 'meaning', target_count: 8, status: 'active', round: 1, asked: 1, words: 8, ai_planned: 0, cloze_source: null, ...over,
});
const mcq = {
  item_id: 'r-1', round: 1, position: 1, type: 'mcq_definition', prompt_style: 'meaning',
  prompt: { kind: 'mcq', meaning: 'hành lý', meaning_language: 'vi', context_label: null, options: ['luggage', 'ticket', 'delay', 'gate'] },
  hints_available: { level1: true, level2: true, level3: false }, hint_level: 0, state: 'unanswered', tries: 0, reportable: true,
};
const answer = (over: Record<string, unknown> = {}) => ({
  result: 'correct', skipped: false, tries: 1, hint_level: 0, correct: { lemma: 'luggage', text: 'luggage', choice_index: 0, is_true: null },
  meaning: 'hành lý', definition_en: null, show_known: false, highlight_needs_review: false, translation: null, alternative: null,
  schedule: { level: 4, due_date: '2026-11-21', outcome: 'leveled_up' }, streak: null, ...over,
});
const deck = (today: { priority: number; due: number; new: number }) => ({
  id: G, name: 'Du lịch', version: 1, total: 40, today, cells: [5, 3, 8, 12, 7, 5].map((total, level) => ({ level, total, due: 0 })),
  backlog: 0, available: { due: today.due, new: today.new },
});
const SUMMARY = {
  session: view({ status: 'finished', asked: 8 }), asked: 8, correct: 5, wrong: 3, recall: { leveled_up: 5, correct_kept: 0 },
  words: [
    { sense_id: 's1', lemma: 'luggage', meaning: 'hành lý', item_id: 'r-1', action: null },
    { sense_id: 's2', lemma: 'delay', meaning: 'trễ', item_id: 'r-2', action: 'needs_review' },
  ],
};
const problem = (status: number, slug: string, extra: Record<string, unknown> = {}) =>
  Response.json({ type: `http://x/problems/${slug}`, status, title: slug, ...extra }, { status });

const routes = (over: Record<string, Route> = {}): Record<string, Route> => ({
  'POST /v1/practice/sessions': () => Response.json({ session: view({ asked: 0 }) }),
  [`POST /v1/practice/sessions/${S}/next`]: () => Response.json({ state: 'question', session: view(), item: mcq }),
  'POST /v1/practice/items/r-1/answer': () => Response.json(answer()),
  'POST /v1/practice/items/r-1/review': () => Response.json({ action: 'needs_review', item_id: 'r-1', level: 1 }),
  [`POST /v1/practice/sessions/${S}/finish`]: () => Response.json({ session: view({ status: 'finished', asked: 8 }) }),
  [`GET /v1/practice/sessions/${S}/summary`]: () => Response.json(SUMMARY),
  'GET /v1/groups': () => Response.json({ items: [deck({ priority: 0, due: 0, new: 5 })] }),
  [`GET /v1/groups/${G}`]: () => Response.json({ id: G, name: 'Du lịch', version: 1, item_count: 40, removable_items: 0, created_at: '', updated_at: '' }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  'GET /v1/practice/report-reasons?kind=non_ai': () => Response.json({ items: [] }),
  ...over,
});
type Call = { method: string; path: string; body: unknown; headers: Record<string, string> };

describe('RecallSession (đợt C §4.3, §4.4)', () => {
  it('starts a recall session of the deck with an Idempotency-Key, never reads the open practice session', async () => {
    const { calls, count } = renderApp(<RecallSession />, { routes: routes() });
    expect(await screen.findByText('hành lý')).toBeInTheDocument();
    const start = (calls as Call[]).filter((c) => c.method === 'POST' && c.path === '/v1/practice/sessions');
    expect(start).toHaveLength(1);
    expect(start[0].body).toEqual({ kind: 'recall', source: 'group', group_id: G });
    expect(start[0].headers['Idempotency-Key']).toBeTruthy();
    expect(count('GET', '/v1/practice/sessions/current')).toBe(0);
    expect(screen.getByText('Ôn · Du lịch')).toBeInTheDocument();
  });

  it('a right answer says what happened to the schedule; no Đã biết, Cần ôn lại stays', async () => {
    renderApp(<RecallSession />, { routes: routes() });
    await screen.findByText('hành lý');
    await userEvent.keyboard('1');
    expect(await screen.findByText('luggage lên ngăn 14 ngày.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đã biết/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cần ôn lại/ })).toBeInTheDocument();
  });

  it('a right answer that keeps the stage says so', async () => {
    renderApp(<RecallSession />, { routes: routes({
      'POST /v1/practice/items/r-1/answer': () => Response.json(answer({ schedule: { level: 2, due_date: '2026-11-08', outcome: 'kept' } })),
    }) });
    await screen.findByText('hành lý');
    await userEvent.keyboard('1');
    expect(await screen.findByText('luggage giữ ngăn 3 ngày.')).toBeInTheDocument();
  });

  it('the summary: right and moved up, wrong, Cần ôn lại; new words left → [Học] and the way home', async () => {
    renderApp(<RecallSession />, { routes: routes({
      [`POST /v1/practice/sessions/${S}/next`]: () => Response.json({ state: 'finished', session: view({ status: 'finished', asked: 8 }) }),
    }) });
    expect(await screen.findByRole('heading', { name: 'Xong 8 từ.' })).toBeInTheDocument();
    const tile = (label: string) => screen.getByText(label).parentElement!;
    expect(within(tile('Đúng, lên ngăn')).getByText('5')).toBeInTheDocument();
    expect(within(tile('Sai, giữ ngăn')).getByText('3')).toBeInTheDocument();
    expect(within(tile('Cần ôn lại')).getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('Đúng, giữ ngăn')).not.toBeInTheDocument();
    expect(await screen.findByText('Còn 5 từ mới trong nhóm này')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Học' })).toHaveAttribute('href', `/vi/app/review?group=${G}&mode=new`);
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/vi/app');
  });

  it('the summary shows "Đúng, giữ ngăn" when a right answer kept its stage; due words left → [Ôn tiếp]', async () => {
    renderApp(<RecallSession />, { routes: routes({
      [`POST /v1/practice/sessions/${S}/next`]: () => Response.json({ state: 'finished', session: view({ status: 'finished', asked: 8 }) }),
      [`GET /v1/practice/sessions/${S}/summary`]: () => Response.json({ ...SUMMARY, recall: { leveled_up: 3, correct_kept: 2 } }),
      'GET /v1/groups': () => Response.json({ items: [deck({ priority: 0, due: 12, new: 0 })] }),
    }) });
    expect(await screen.findByText('Đúng, giữ ngăn')).toBeInTheDocument();
    expect(within(screen.getByText('Đúng, giữ ngăn').parentElement!).getByText('2')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Ôn tiếp' })).toHaveAttribute('href', `/vi/app/recall?group=${G}`);
    expect(screen.queryByText(/từ mới trong nhóm này/)).not.toBeInTheDocument();
  });

  it('a deck with no learned word: says so and offers Học', async () => {
    renderApp(<RecallSession />, { routes: routes({
      'POST /v1/practice/sessions': () => problem(409, 'practice-no-words', { reason: 'nothing-learned' }),
    }) });
    expect(await screen.findByText('Nhóm này chưa có từ nào đã học.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Học' })).toHaveAttribute('href', `/vi/app/review?group=${G}&mode=new`);
  });

  it('Esc ends the session into its summary; the close link of the summary goes back to the deck', async () => {
    renderApp(<RecallSession />, { routes: routes() });
    await screen.findByText('hành lý');
    await userEvent.keyboard('{Escape}');
    expect(await screen.findByRole('heading', { name: 'Xong 8 từ.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đóng' })).toHaveAttribute('href', `/vi/app/group?id=${G}`);
  });

  it('a malformed deck id never reaches the API', async () => {
    params.current = new URLSearchParams({ group: 'nope' });
    const { calls } = renderApp(<RecallSession />, { routes: routes() });
    expect(await screen.findByText('Không tìm thấy nhóm này.')).toBeInTheDocument();
    expect((calls as Call[]).filter((c) => c.path === '/v1/practice/sessions')).toHaveLength(0);
  });
});
