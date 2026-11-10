// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import type { Route } from '@/app-shell/session/test-support';
import { PracticePage } from './PracticePage';

const hardReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/practice',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => hardReplace.mockReset());

const TECH = '11111111-1111-4111-8111-111111111111';
const IELTS = '22222222-2222-4222-8222-222222222222';
const TRAVEL = '33333333-3333-4333-8333-333333333333';
const deck = (id: string, name: string, total: number, today: { priority: number; due: number; new: number }) => ({
  id, name, version: 1, total, today, cells: [], backlog: 0,
});
const GROUPS = [
  deck(TRAVEL, 'Du lịch', 20, { priority: 0, due: 0, new: 2 }),
  deck(TECH, 'Công nghệ', 18, { priority: 3, due: 12, new: 3 }),
  deck(IELTS, 'IELTS', 80, { priority: 1, due: 11, new: 2 }),
];
const RESETS = '2026-10-23T17:00:00.000Z'; // 0:00 on 24/10 in Asia/Ho_Chi_Minh
const pool = (limit: number, used: number, resets_at: string | null = RESETS) => ({ limit, used, remaining: Math.max(0, limit - used), resets_at });
const entitlements = (used = 1, limit = 3, plan = 'free') => ({
  plan, sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  features: { 'ai.practice': { allowed: false, reason: 'plan-required' }, 'ai.lookup': { allowed: false, reason: 'plan-required' } },
  pools: { practice_sessions: pool(limit, used), ai_practice: pool(0, 0, null), ai_lookup: pool(0, 0, null) },
});
const CONFIG = {
  practice: { max_questions_per_session: 20, default_questions_per_session: 12 },
  reminders: { send_time: '20:00' },
  learning: { backlog_after_days: 60, groups_per_user: 100 },
  plans: { free: { practice_sessions_per_day: 3, ai_practice_per_cycle: 15, ai_lookup_per_cycle: 5 }, trial: { ai_practice_per_cycle: 100, ai_lookup_per_cycle: 30 }, pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 } },
};
const WEAK = {
  items: [
    { sense_id: 's1', lemma: 'deploy', wrong: 3, counted: 5, level: 1, last_wrong_at: '2026-10-23T14:06:00Z', meaning: 'triển khai' },
    { sense_id: 's2', lemma: 'affect', wrong: 2, counted: 4, level: 2, last_wrong_at: '2026-10-23T13:00:00Z', meaning: 'ảnh hưởng' },
  ],
  next_page_token: 'n',
};
const session = (over: Record<string, unknown> = {}) => ({
  id: 'sess-1', source: 'group', group_id: TECH, group_filter: 'all', sort: 'queue', types: ['mcq_definition'], prompt_style: 'mixed',
  target_count: 10, status: 'active', round: 1, asked: 4, words: 10, ai_planned: 0, cloze_source: null, ...over,
});
const unanswered = { item_id: 'it-4', state: 'unanswered' };
const noSession: Route = () => Response.json({ type: 'http://x/problems/not-found', status: 404, title: 'Not found' }, { status: 404 });

const routes = (over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/groups': () => Response.json({ items: GROUPS }),
  'GET /v1/me/app-config': () => Response.json(CONFIG),
  'GET /v1/me/entitlements': () => Response.json(entitlements()),
  'GET /v1/practice/sessions/current': noSession,
  'GET /v1/practice/weak-words/groups': () => Response.json({ total: 6, items: [{ group_id: TECH, name: 'Công nghệ', count: 3 }] }),
  'GET /v1/practice/weak-words?page_size=2': () => Response.json(WEAK),
  'GET /v1/practice/history?page_size=3': () => Response.json({ items: [], next_page_token: null }),
  'GET /v1/groups/11111111-1111-4111-8111-111111111111': () => Response.json({ id: TECH, name: 'Công nghệ', version: 1, item_count: 18 }),
  'POST /v1/practice/sessions': () => Response.json({ session: session({ asked: 0 }) }, { status: 201 }),
  ...over,
});
const starts = (calls: Array<{ method: string; path: string; body: unknown; headers: Record<string, string> }>) =>
  calls.filter((c) => c.method === 'POST' && c.path === '/v1/practice/sessions');
const THREE = ['mcq_definition', 'true_false_definition', 'type_word'];

describe('PracticePage (K/51)', () => {
  it('the big card starts today\'s words: "Bắt đầu N câu" with N = default_questions_per_session', async () => {
    const view = renderApp(<PracticePage />, { routes: routes() });
    const hero = await screen.findByRole('region', { name: 'Hôm nay' });
    // Figma 99:3169: the count is big, then the questions and their types.
    expect(await within(hero).findByText((_, el) => el?.tagName === 'P' && el.textContent === '34 từ trong 3 nhóm')).toBeInTheDocument();
    expect(within(hero).getByText('12 câu, trộn ba kiểu: Trắc nghiệm, Đúng/sai, Gõ từ.')).toBeInTheDocument();
    await userEvent.click(within(hero).getByRole('button', { name: 'Bắt đầu 12 câu' }));
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/practice/session'));
    const [start] = starts(view.calls);
    expect(start.body).toEqual({ source: 'today', types: THREE, count: 12 });
    expect(start.headers['Idempotency-Key']).toBeTruthy();
  });

  it('a second press while the start is pending sends nothing more (Review Focus 1)', async () => {
    let release!: () => void;
    const view = renderApp(<PracticePage />, {
      routes: routes({
        'POST /v1/practice/sessions': () => new Promise((resolve) => {
          release = () => resolve(Response.json({ session: session({ asked: 0 }) }, { status: 201 }));
        }),
      }),
    });
    const hero = await screen.findByRole('region', { name: 'Hôm nay' });
    const start = await within(hero).findByRole('button', { name: 'Bắt đầu 12 câu' });
    await userEvent.click(start);
    await userEvent.click(start);
    release();
    await waitFor(() => expect(hardReplace).toHaveBeenCalled());
    expect(starts(view.calls)).toHaveLength(1);
  });

  it('four other sources, each with its own start and [Tùy chỉnh]', async () => {
    renderApp(<PracticePage />, { routes: routes() });
    const list = await screen.findByRole('list', { name: 'Luyện theo nguồn khác' });
    const names = within(list).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Theo nhóm', 'Từ hay sai', 'Đang ưu tiên', 'Luyện tất cả']);
    for (const name of names) expect(within(list).getByRole('button', { name: `Tùy chỉnh: ${name}` })).toBeInTheDocument();
  });

  it('Theo nhóm (owner 27/10/2026): decks are shown but not buttons; the only action is a visible [Tùy chỉnh]', async () => {
    const view = renderApp(<PracticePage />, { routes: routes() });
    const card = await screen.findByRole('listitem', { name: 'Theo nhóm' });
    expect(await within(card).findByText('Công nghệ · 18')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /Công nghệ/ })).not.toBeInTheDocument();
    expect(within(card).getAllByRole('button').map((b) => b.textContent)).toEqual(['Tùy chỉnh']);
    await userEvent.click(within(card).getByRole('button', { name: 'Tùy chỉnh: Theo nhóm' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(starts(view.calls)).toHaveLength(0);
  });

  it('each other row shows a boxed [Tùy chỉnh] with its word next to its start (owner 10/11/2026, was icon-only)', async () => {
    renderApp(<PracticePage />, { routes: routes() });
    const card = await screen.findByRole('listitem', { name: 'Từ hay sai' });
    const start = await within(card).findByRole('button', { name: 'Luyện 6 từ' });
    const customize = within(card).getByRole('button', { name: 'Tùy chỉnh: Từ hay sai' });
    expect(start.parentElement).toContainElement(customize);
    expect(customize).toHaveTextContent('Tùy chỉnh');
    expect(customize).toHaveAttribute('data-variant', 'secondary');
  });

  it('Từ hay sai: the two newest weak words, "+N từ", and the start sends source weak', async () => {
    const view = renderApp(<PracticePage />, { routes: routes() });
    const card = await screen.findByRole('listitem', { name: 'Từ hay sai' });
    expect(await within(card).findByText('deploy · sai 3/5')).toBeInTheDocument();
    expect(within(card).getByText('affect · sai 2/4')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: '+4 từ' })).toHaveAttribute('href', '/vi/app/practice/weak');
    await userEvent.click(within(card).getByRole('button', { name: 'Luyện 6 từ' }));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toEqual({ source: 'weak', types: THREE, count: 12 });
  });

  it('Đang ưu tiên and Luyện tất cả count from the decks', async () => {
    renderApp(<PracticePage />, { routes: routes() });
    const priority = await screen.findByRole('listitem', { name: 'Đang ưu tiên' });
    expect(await within(priority).findByRole('button', { name: 'Luyện 4 từ' })).toBeInTheDocument();
    const all = screen.getByRole('listitem', { name: 'Luyện tất cả' });
    expect(within(all).getByText('118 từ trong 3 nhóm')).toBeInTheDocument();
    expect(within(all).getByRole('button', { name: 'Luyện 12 câu' })).toBeInTheDocument();
  });

  it('409 practice-no-words: the reason is told where the learner pressed', async () => {
    renderApp(<PracticePage />, {
      routes: routes({
        'POST /v1/practice/sessions': () =>
          Response.json({ type: 'http://x/problems/practice-no-words', status: 409, title: 'n', reason: 'source-empty' }, { status: 409 }),
      }),
    });
    const card = await screen.findByRole('listitem', { name: 'Đang ưu tiên' });
    await userEvent.click(await within(card).findByRole('button', { name: 'Luyện 4 từ' }));
    expect(await within(card).findByRole('alert')).toHaveTextContent('Chưa có từ nào để luyện ở nguồn này.');
    expect(hardReplace).not.toHaveBeenCalled();
  });

  it('the side card: plan, "đã dùng 1/3", and when sessions refill in the learner\'s zone (D15)', async () => {
    renderApp(<PracticePage />, { routes: routes() });
    const card = await screen.findByRole('region', { name: 'Phiên luyện hôm nay' });
    expect(await within(card).findByText('Gói Miễn phí')).toBeInTheDocument();
    expect(within(card).getByText('đã dùng 1/3')).toBeInTheDocument();
    expect(within(card).getByText('Một phiên chỉ tính khi bạn trả lời câu đầu tiên. Mở lại lúc 0:00.')).toBeInTheDocument();
  });

  it('the shortcuts box lists the session keys with [Kiểm tra] wording (copy doc §17)', async () => {
    renderApp(<PracticePage />, { routes: routes() });
    const box = await screen.findByRole('region', { name: 'Phím tắt trong phiên' });
    expect(within(box).getByText('Kiểm tra, rồi nút đậm')).toBeInTheDocument();
  });
});

describe('Out of sessions (K/55, E25)', () => {
  it('no session left today: the big card says so, with the refill time and [Ôn thẻ]; no plans button (D7)', async () => {
    renderApp(<PracticePage />, { routes: routes({ 'GET /v1/me/entitlements': () => Response.json(entitlements(3)) }) });
    const hero = await screen.findByRole('region', { name: 'Mai luyện tiếp nhé' });
    expect(within(hero).getByText('Hết phiên luyện hôm nay')).toBeInTheDocument();
    expect(within(hero).getByText('Gói Miễn phí có 3 phiên luyện mỗi ngày, mở lại lúc 0:00. Trong lúc chờ, ôn thẻ không giới hạn.')).toBeInTheDocument();
    expect(within(hero).getByRole('link', { name: 'Ôn thẻ' })).toHaveAttribute('href', '/vi/app');
    expect(screen.queryByText(/Xem gói học/i)).not.toBeInTheDocument();
    const theme = screen.getByRole('listitem', { name: 'Theo nhóm' });
    expect(within(theme).getByText('Mở lại lúc 0:00')).toBeInTheDocument();
    expect(within(theme).queryByRole('button', { name: /^Luyện / })).not.toBeInTheDocument();
    const side = screen.getByRole('region', { name: 'Phiên luyện hôm nay' });
    expect(within(side).getByText('đã dùng 3/3')).toBeInTheDocument();
  });

  it('E25: a start refused with 403 quota-exhausted turns the page into K/55 and reads the pools again', async () => {
    let used = 1;
    const view = renderApp(<PracticePage />, {
      routes: routes({
        'GET /v1/me/entitlements': () => Response.json(entitlements(used)),
        'POST /v1/practice/sessions': () => {
          used = 3;
          return Response.json({ type: 'http://x/problems/quota-exhausted', status: 403, title: 'q', resets_at: RESETS }, { status: 403 });
        },
      }),
    });
    const hero = await screen.findByRole('region', { name: 'Hôm nay' });
    await userEvent.click(await within(hero).findByRole('button', { name: 'Bắt đầu 12 câu' }));
    expect(await screen.findByRole('region', { name: 'Mai luyện tiếp nhé' })).toBeInTheDocument();
    await waitFor(() => expect(view.count('GET', '/v1/me/entitlements')).toBeGreaterThan(1));
    expect(hardReplace).not.toHaveBeenCalled();
  });
});

describe('A session left open (D9, E34, E35)', () => {
  const withCurrent = (over: Record<string, Route> = {}) =>
    routes({ 'GET /v1/practice/sessions/current': () => Response.json({ session: session(), item: unanswered, preparing: false }), ...over });

  it('E34: the side card names the deck and how far the learner got; [Làm tiếp câu 4] opens the session', async () => {
    renderApp(<PracticePage />, { routes: withCurrent() });
    const card = await screen.findByRole('region', { name: 'Phiên đang dở' });
    expect(await within(card).findByText('Nhóm Công nghệ, đã làm 3/10 câu. Bắt đầu phiên mới sẽ đóng phiên này.')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Làm tiếp câu 4' })).toHaveAttribute('href', '/vi/app/practice/session');
  });

  it('E35: starting while one is open asks first (K/77); [Làm tiếp] goes back without a new session', async () => {
    const view = renderApp(<PracticePage />, { routes: withCurrent() });
    await screen.findByRole('region', { name: 'Phiên đang dở' });
    const hero = screen.getByRole('region', { name: 'Hôm nay' });
    await userEvent.click(await within(hero).findByRole('button', { name: 'Bắt đầu 12 câu' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bạn có phiên đang dở 3/10' });
    expect(within(dialog).getByText('Nhóm Công nghệ, đã làm 3/10 câu. Mở phiên mới sẽ đóng phiên này.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Làm tiếp' }));
    expect(hardReplace).toHaveBeenCalledWith('/vi/app/practice/session');
    expect(starts(view.calls)).toHaveLength(0);
  });

  it('E35: [Mở phiên mới] starts the session the learner asked for', async () => {
    const view = renderApp(<PracticePage />, { routes: withCurrent() });
    await screen.findByRole('region', { name: 'Phiên đang dở' });
    const hero = screen.getByRole('region', { name: 'Hôm nay' });
    await userEvent.click(await within(hero).findByRole('button', { name: 'Bắt đầu 12 câu' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bạn có phiên đang dở 3/10' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mở phiên mới' }));
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/practice/session'));
    expect(starts(view.calls)).toHaveLength(1);
    expect(starts(view.calls)[0].body).toMatchObject({ source: 'today' });
  });

  it('out of sessions, the open session can still go on (K/55 card text)', async () => {
    renderApp(<PracticePage />, { routes: withCurrent({ 'GET /v1/me/entitlements': () => Response.json(entitlements(3)) }) });
    const card = await screen.findByRole('region', { name: 'Phiên đang dở' });
    expect(await within(card).findByText('Nhóm Công nghệ, đã làm 3/10 câu. Phiên này đã tính vào hôm nay nên bạn vẫn làm tiếp được.')).toBeInTheDocument();
  });
});

// The customise dialog's tests live in customize-dialog.test.tsx (M5.3, round 14).

describe('English (design §7.1–§7.2)', () => {
  it('practice home in English', async () => {
    renderApp(<PracticePage />, { locale: 'en', routes: routes() });
    const hero = await screen.findByRole('region', { name: 'Today' });
    expect(await within(hero).findByRole('button', { name: 'Start 12 questions' })).toBeInTheDocument();
    const side = screen.getByRole('region', { name: 'Practice sessions today' });
    expect(await within(side).findByText('1/3 used')).toBeInTheDocument();
    expect(within(side).getByText('Free plan')).toBeInTheDocument();
  });

  it('M4 review: a day with only new words still offers the start, and counts them', async () => {
    const fresh = [deck(TECH, 'Công nghệ', 18, { priority: 0, due: 0, new: 5 })];
    renderApp(<PracticePage />, { routes: routes({ 'GET /v1/groups': () => Response.json({ items: fresh }) }) });
    const hero = await screen.findByRole('region', { name: 'Hôm nay' });
    expect(await within(hero).findByText((_, el) => el?.tagName === 'P' && el.textContent === '5 từ trong 1 nhóm')).toBeInTheDocument();
    expect(within(hero).getByRole('button', { name: 'Bắt đầu 12 câu' })).toBeInTheDocument();
  });
});

describe('PracticePage — Recent (K/51)', () => {
  const recent = (over: Record<string, unknown>) => ({
    item_id: 'r1', session_id: 'x', sense_id: 's1', lemma: 'vital', type: 'cloze', prompt_style: 'sentence', prompt: { kind: 'cloze', sentence: 'Sleep is ___ for good health.' },
    answer: 'crucial', correct: { lemma: 'vital', text: 'vital', choice_index: null, is_true: null }, result: 'correct', skipped: false, tries: 1, hint_level: 0,
    review_action: null, answered_at: '2026-11-07T03:00:00Z', local_date: '2026-11-07', translation: null, alternative: true, ...over,
  });

  it('Recent: an alternative answer says what was typed and the asked word', async () => {
    renderApp(<PracticePage />, { routes: routes({
      'GET /v1/practice/history?page_size=3': () => Response.json({ items: [recent({}), recent({ item_id: 'r2', lemma: 'habit', answer: 'habit', correct: { lemma: 'habit', text: 'habit', choice_index: null, is_true: null }, alternative: false })], next_page_token: null }),
    }) });
    const section = await screen.findByRole('region', { name: 'Gần đây' });
    expect(await within(section).findByText('bạn gõ crucial, đáp án thay thế cho vital')).toBeInTheDocument();
    // A plain right answer keeps today's line.
    expect(within(section).getByText('đúng')).toBeInTheDocument();
  });
});
