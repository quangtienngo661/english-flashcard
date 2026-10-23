// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import type { Route } from '@/app-shell/session/test-support';
import { PracticeSession } from './PracticeSession';

const hardReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/practice/session',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => hardReplace.mockReset());
afterEach(() => vi.useRealTimers());

const SESSION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PRIVATE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const LATER = '2026-11-14T17:00:00.000Z'; // 0:00 on 15/11 in Asia/Ho_Chi_Minh
const view = (over: Record<string, unknown> = {}) => ({
  id: SESSION, source: 'all', group_id: null, group_filter: null, sort: 'least_practiced',
  types: ['mcq_definition', 'cloze', 'meaning_in_sentence'], prompt_style: 'mixed', target_count: 10, status: 'active', round: 1,
  asked: 4, words: 10, ai_planned: 5, cloze_source: 'ai', ...over,
});
const mcq = (id = 'item-4') => ({
  item_id: id, round: 1, position: 4, type: 'mcq_definition', prompt_style: 'meaning',
  prompt: { kind: 'mcq', meaning: 'triển khai', meaning_language: 'vi', context_label: null, options: ['deploy', 'delay', 'deliver', 'defend'] },
  hints_available: { level1: false, level2: false, level3: false }, hint_level: 0, state: 'unanswered', tries: 0, reportable: true,
});
const ENT = {
  plan: 'pro', sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  features: { 'ai.practice': { allowed: true, reason: null }, 'ai.lookup': { allowed: true, reason: null } },
  pools: {
    practice_sessions: { limit: 30, used: 2, remaining: 28, resets_at: '2026-10-23T17:00:00.000Z' },
    ai_practice: { limit: 300, used: 300, remaining: 0, resets_at: LATER }, ai_lookup: { limit: 100, used: 0, remaining: 100, resets_at: LATER },
  },
};
const NEXT = `POST /v1/practice/sessions/${SESSION}/next`;
const PREPARE = `POST /v1/practice/sessions/${SESSION}/prepare`;
const noItem: Route = () => Response.json({ session: view(), item: null, preparing: true });
const routes = (over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/practice/sessions/current': () => Response.json({ session: view(), item: mcq(), preparing: false }),
  'GET /v1/groups': () => Response.json({ items: [] }),
  'GET /v1/me/entitlements': () => Response.json(ENT),
  [PREPARE]: () => Response.json({ prepared: 1, already_ready: 0 }),
  ...over,
});
type Call = { method: string; path: string; body: unknown };
const posts = (calls: Call[], path: string) => calls.filter((c) => c.method === 'POST' && c.path === path);
const nextAnswers = (...answers: unknown[]): Route => {
  let i = 0;
  return () => Response.json(answers[Math.min(i++, answers.length - 1)]);
};
const unavailable = (reason: string, extra: Record<string, unknown> = {}) => ({ state: 'ai_unavailable', session: view(), reason, ...extra });

describe('AI states in the practice session (K/73–K/76, E29–E33, D11)', () => {
  it('K/73: "Đang tạo câu…" while preparing, the next call after retry_after_seconds, then the question', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const r = renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': noItem,
      [NEXT]: nextAnswers({ state: 'preparing', session: view(), retry_after_seconds: 2 }, { state: 'question', session: view({ asked: 5 }), item: mcq('item-5') }),
    }) });
    expect(await screen.findByText('Đang tạo câu…')).toBeInTheDocument();
    expect(screen.getByText('Thường mất vài giây.')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(2_100));
    expect(await screen.findByText('triển khai')).toBeInTheDocument();
    expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(2);
  });

  it('E29: still preparing after 60 s → "Hệ thống đang gặp lỗi." with [Thử lại] (retry_ai) and [Để sau]', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const r = renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': noItem,
      [NEXT]: nextAnswers({ state: 'preparing', session: view(), retry_after_seconds: 20 }),
    }) });
    await screen.findByText('Đang tạo câu…');
    await act(() => vi.advanceTimersByTimeAsync(61_000));
    expect(await screen.findByText('Hệ thống đang gặp lỗi.')).toBeInTheDocument();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`).at(-1)?.body).toEqual({ retry_ai: true }));
  });

  it('Bước 7 §6.4: after a question shows, POST …/prepare fires once and is not awaited', async () => {
    let release: () => void = () => {};
    const r = renderApp(<PracticeSession />, { routes: routes({
      [PREPARE]: () => new Promise<Response>((resolve) => { release = () => resolve(Response.json({ prepared: 1, already_ready: 0 })); }),
    }) });
    expect(await screen.findByText('triển khai')).toBeInTheDocument();
    await waitFor(() => expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/prepare`)).toHaveLength(1));
    expect(screen.getByRole('button', { name: /1 deploy/ })).toBeEnabled();
    release();
  });

  it('a session without AI types never calls prepare', async () => {
    const r = renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': () => Response.json({ session: view({ types: ['mcq_definition'], ai_planned: 0, cloze_source: null }), item: mcq(), preparing: false }),
    }) });
    await screen.findByText('triển khai');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/prepare`)).toHaveLength(0);
  });

  it.each(['ai-failed', 'ai-unavailable'])('E30, D11: ai_unavailable %s → the general line, [Thử lại] sends retry_ai, [Để sau] goes back to Luyện tập', async (reason) => {
    const r = renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': noItem,
      [NEXT]: nextAnswers(unavailable(reason), { state: 'question', session: view({ asked: 5 }), item: mcq('item-5') }),
    }) });
    expect(await screen.findByText('Hệ thống đang gặp lỗi.')).toBeInTheDocument();
    expect(screen.getByText('Dừng thì phiên vẫn đang dở, bạn làm tiếp sau được.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('triển khai')).toBeInTheDocument();
    expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`).at(-1)?.body).toEqual({ retry_ai: true });
  });

  it('[Để sau] leaves the session open and goes back to Luyện tập', async () => {
    renderApp(<PracticeSession />, { routes: routes({ 'GET /v1/practice/sessions/current': noItem, [NEXT]: nextAnswers(unavailable('ai-failed')) }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Để sau' }));
    expect(hardReplace).toHaveBeenCalledWith('/vi/app/practice');
  });

  it('E31: quota-exhausted → K/74b with the refill date and only [Để sau]', async () => {
    renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': noItem, [NEXT]: nextAnswers(unavailable('quota-exhausted', { resets_at: LATER })),
    }) });
    expect(await screen.findByText('Hết lượt câu AI')).toBeInTheDocument();
    expect(screen.getByText('Lượt câu AI mới có vào 15/11.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Để sau' })).toBeInTheDocument();
  });

  it('E31: plan-required → K/74c, only [Để sau]', async () => {
    renderApp(<PracticeSession />, { routes: routes({ 'GET /v1/practice/sessions/current': noItem, [NEXT]: nextAnswers(unavailable('plan-required')) }) });
    expect(await screen.findByText('Gói của bạn chưa có câu AI')).toBeInTheDocument();
    expect(screen.getByText('Gói của bạn đã hết hạn nên các câu AI còn lại không tạo được.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull();
  });

  it('K/74a + word-not-recognized: names the learner\'s word and links to it', async () => {
    renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': noItem,
      [NEXT]: nextAnswers(unavailable('ai-failed', { notice: 'word-not-recognized', sense_id: PRIVATE, lemma: 'rizz' })),
    }) });
    expect(await screen.findByText('AI chưa nhận ra từ “rizz” bạn tự thêm.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem lại từ trong Từ của tôi' })).toHaveAttribute('href', '/vi/app/word?w=rizz');
  });

  it('E32: notice ai-fallback over the question → "Câu này chuyển sang kiểu câu thường.", closable', async () => {
    renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': noItem,
      [NEXT]: nextAnswers({ state: 'question', session: view(), item: mcq(), notice: 'ai-fallback', ai_reason: 'ai-failed' }),
    }) });
    expect(await screen.findByText('Câu này chuyển sang kiểu câu thường.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(screen.queryByText('Câu này chuyển sang kiểu câu thường.')).toBeNull();
    expect(screen.getByText('triển khai')).toBeInTheDocument();
  });

  it('K/75b: ai-fallback because credits ran out tells when they refill', async () => {
    renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': noItem,
      [NEXT]: nextAnswers({ state: 'question', session: view(), item: mcq(), notice: 'ai-fallback', ai_reason: 'quota-exhausted', resets_at: LATER }),
    }) });
    expect(await screen.findByText('Hết lượt câu AI. Các câu còn lại của phiên dùng kiểu câu khác. Lượt câu AI mới có vào 15/11.')).toBeInTheDocument();
  });

  it('review I3, E33, K/76: the band never names the word before the answer; the word and its link come with the result', async () => {
    renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': noItem,
      [NEXT]: nextAnswers({ state: 'question', session: view(), item: mcq(), notice: 'word-not-recognized', sense_id: PRIVATE, lemma: 'rizz' }),
      'POST /v1/practice/items/item-4/answer': () => Response.json({
        result: 'correct', skipped: false, tries: 1, hint_level: 0, correct: { lemma: 'rizz', text: 'rizz', choice_index: 0, is_true: null },
        meaning: 'sức hút', definition_en: null, show_known: true, highlight_needs_review: false, translation: null,
      }),
    }) });
    expect(await screen.findByText('AI chưa nhận ra một từ bạn tự thêm, nên câu này dùng kiểu câu khác.')).toBeInTheDocument();
    expect(screen.queryByText(/rizz/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Xem lại từ trong Từ của tôi' })).toBeNull();
    await userEvent.keyboard('1');
    expect(await screen.findByRole('link', { name: 'Xem lại từ trong Từ của tôi' })).toHaveAttribute('href', '/vi/app/word?w=rizz');
  });

  it('review I1: a /next that fails while preparing leaves "Đang tạo câu…" for the general error with [Thử lại]', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let calls = 0;
    renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': noItem,
      [NEXT]: () => (++calls === 1
        ? Response.json({ state: 'preparing', session: view(), retry_after_seconds: 2 })
        : Response.json({ type: 'http://x/problems/internal', status: 500, title: 'x' }, { status: 500 })),
    }) });
    await screen.findByText('Đang tạo câu…');
    await act(() => vi.advanceTimersByTimeAsync(2_100));
    expect(await screen.findByText('Hệ thống đang gặp lỗi.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.queryByText('Đang tạo câu…')).toBeNull();
  });

  it('review I1: [Thử lại] that fails again says so instead of doing nothing', async () => {
    let calls = 0;
    renderApp(<PracticeSession />, { routes: routes({
      'GET /v1/practice/sessions/current': noItem,
      [NEXT]: () => (++calls === 1
        ? Response.json(unavailable('ai-failed'))
        : Response.json({ type: 'http://x/problems/internal', status: 500, title: 'x' }, { status: 500 })),
    }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(calls).toBe(2));
    expect(await screen.findByText('Có lỗi xảy ra. Thử lại sau.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeEnabled();
  });
});
