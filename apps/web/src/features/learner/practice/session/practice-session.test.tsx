// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installSpeech, makeVoice } from '@/app-ui/speech-test-support';
import { renderApp } from '@/app-ui/test-utils';
import { ToastRegion } from '@/app-ui/Toast';
import type { Route } from '@/app-shell/session/test-support';
import type { PracticeSessionView } from '../practice-api';
import { PracticeSession } from './PracticeSession';
import { againBody } from './SessionSummary';

const hardReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/practice/session',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => hardReplace.mockReset());

const TECH = '11111111-1111-4111-8111-111111111111';
const SESSION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const view = (over: Record<string, unknown> = {}) => ({
  id: SESSION, source: 'group', group_id: TECH, group_filter: 'all', sort: 'queue',
  types: ['mcq_definition', 'true_false_definition', 'type_word'], prompt_style: 'mixed', target_count: 10, status: 'active', round: 1,
  asked: 4, words: 10, ai_planned: 0, cloze_source: null, ...over,
});
const hints = (level1 = true, level2 = true) => ({ level1, level2, level3: false });
const mcq = (id = 'item-4', over: Record<string, unknown> = {}) => ({
  item_id: id, round: 1, position: 4, type: 'mcq_definition', prompt_style: 'meaning',
  prompt: { kind: 'mcq', meaning: 'triển khai', meaning_language: 'vi', context_label: 'phần mềm', options: ['deploy', 'delay', 'deliver', 'defend'] },
  hints_available: hints(), hint_level: 0, state: 'unanswered', tries: 0, reportable: true, ...over,
});
const trueFalse = (id = 'item-5') => ({
  item_id: id, round: 1, position: 5, type: 'true_false_definition', prompt_style: 'meaning',
  prompt: { kind: 'true_false', lemma: 'server', meaning: 'máy chủ', meaning_language: 'vi', context_label: null },
  hints_available: hints(false, false), hint_level: 0, state: 'unanswered', tries: 0, reportable: true,
});
const typed = (id = 'item-6') => ({
  item_id: id, round: 1, position: 6, type: 'type_word', prompt_style: 'meaning',
  prompt: { kind: 'type_meaning', meaning: 'bộ nhớ đệm', meaning_language: 'vi', context_label: 'máy tính' },
  hints_available: hints(), hint_level: 0, state: 'unanswered', tries: 0, reportable: true,
});
const result = (over: Record<string, unknown> = {}) => ({
  result: 'wrong', skipped: false, tries: 1, hint_level: 0,
  correct: { lemma: 'deploy', text: 'deploy', choice_index: 0, is_true: null },
  meaning: 'triển khai (phần mềm)', definition_en: 'to start using a new system', show_known: false, highlight_needs_review: true,
  translation: null, ...over,
});
const GROUPS = [{ id: TECH, name: 'Công nghệ', version: 1, total: 18, today: { priority: 0, due: 3, new: 0 }, cells: [], backlog: 0 }];
const ENT = {
  plan: 'free', sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  features: { 'ai.practice': { allowed: false, reason: 'plan-required' }, 'ai.lookup': { allowed: false, reason: 'plan-required' } },
  pools: {
    practice_sessions: { limit: 3, used: 2, remaining: 1, resets_at: '2026-10-23T17:00:00.000Z' },
    ai_practice: { limit: 0, used: 0, remaining: 0, resets_at: null }, ai_lookup: { limit: 0, used: 0, remaining: 0, resets_at: null },
  },
};
const REASONS = {
  items: [
    { code: 'meaning_wrong', label: 'Nghĩa sai', detail_hint: null, note_required: false },
    { code: 'graded_wrong', label: 'Đáp án đúng mà bị chấm sai', detail_hint: null, note_required: false },
    { code: 'hint_wrong', label: 'Gợi ý sai', detail_hint: null, note_required: false },
    { code: 'other', label: 'Khác', detail_hint: 'Ghi rõ lỗi', note_required: true },
  ],
};
const SUMMARY = {
  session: view({ status: 'finished', asked: 10 }), asked: 10, correct: 7, wrong: 3,
  words: [
    { sense_id: 's1', lemma: 'deploy', meaning: 'triển khai', item_id: 'item-4', action: 'needs_review' },
    { sense_id: 's2', lemma: 'release', meaning: 'phát hành', item_id: 'item-8', action: null },
    { sense_id: 's3', lemma: 'update', meaning: 'cập nhật', item_id: 'item-9', action: null },
  ],
};
const problem = (status: number, slug: string, extra: Record<string, unknown> = {}) =>
  Response.json({ type: `http://x/problems/${slug}`, status, title: slug, ...extra }, { status });

const routes = (over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/practice/sessions/current': () => Response.json({ session: view(), item: mcq(), preparing: false }),
  'GET /v1/groups': () => Response.json({ items: GROUPS }),
  'GET /v1/me/entitlements': () => Response.json(ENT),
  [`POST /v1/practice/items/item-4/answer`]: () => Response.json(result()),
  'POST /v1/practice/items/item-4/review': () => Response.json({ action: 'needs_review', item_id: 'item-4', level: 1 }),
  [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view({ asked: 5 }), item: trueFalse() }),
  [`POST /v1/practice/sessions/${SESSION}/finish`]: () => Response.json({ session: view({ status: 'finished' }) }),
  [`GET /v1/practice/sessions/${SESSION}/summary`]: () => Response.json(SUMMARY),
  'GET /v1/practice/report-reasons?kind=non_ai': () => Response.json(REASONS),
  ...over,
});
type Call = { method: string; path: string; body: unknown; headers: Record<string, string> };
const posts = (calls: Call[], path: string) => calls.filter((c) => c.method === 'POST' && c.path === path);

describe('PracticeSession (K/60–K/67)', () => {
  const cases = [
    { id: 1, title: 'A16-1: case 1, Enter → review known, then next', answer: { result: 'correct', show_known: true, highlight_needs_review: false }, primary: 'Đã biết', action: 'known', note: 'Nhấn Enter là Đã biết: deploy lên một ngăn. Chưa chắc thì bấm Cần ôn lại.' },
    { id: 2, title: 'A16-4: case 2, Enter → next only', answer: { result: 'correct', show_known: false, hint_level: 0, highlight_needs_review: false }, primary: 'Câu tiếp', action: null, note: 'deploy chưa tới hạn ôn nên lịch ôn giữ nguyên.' },
    { id: 3, title: 'A16-4: case 3, Enter → next only', answer: { result: 'correct', show_known: false, hint_level: 1, highlight_needs_review: false }, primary: 'Câu tiếp', action: null, note: 'Dùng gợi ý vẫn được chấm như thường, nhưng câu đúng nhờ gợi ý không có nút Đã biết.' },
    { id: 4, title: 'A16-2: case 4, Enter → review needs_review, then next', answer: { result: 'wrong', show_known: false, highlight_needs_review: true }, primary: 'Cần ôn lại', action: 'needs_review', note: 'Nhấn Enter để đưa deploy lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn.' },
  ];

  it.each(cases)('$title', async ({ id, answer, primary, action, note }) => {
    const v = renderApp(<PracticeSession />, { routes: routes({
      'POST /v1/practice/items/item-4/answer': () => Response.json(result(answer)),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText(note)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button').filter((b) => /^(Cần ôn lại|Đã biết|Câu tiếp)/.test(b.textContent ?? ''));
    expect(buttons.map((b) => b.textContent)).toEqual(id === 1 ? ['Cần ôn lại1', 'Đã biếtEnter'] : id === 4 ? ['Cần ôn lạiEnter', 'Câu tiếp'] : ['Cần ôn lại1', 'Câu tiếpEnter']);
    const bold = screen.getByRole('button', { name: new RegExp(primary) });
    expect(bold.querySelector('kbd')).toHaveTextContent('Enter');
    expect(bold).toHaveAttribute('data-variant', 'sticker');
    expect(bold).toHaveClass('font-bold');
    expect(buttons.find((b) => b !== bold)).toHaveAttribute('data-variant', 'quiet');
    expect(bold.parentElement).toHaveClass('sm:grid-cols-2');
    await userEvent.keyboard('{Enter}');
    await screen.findByText('server');
    const reviewPath = '/v1/practice/items/item-4/review';
    const nextPath = `/v1/practice/sessions/${SESSION}/next`;
    expect(posts(v.calls, reviewPath).map((c) => c.body)).toEqual(action ? [{ action }] : []);
    expect(posts(v.calls, nextPath)).toHaveLength(1);
    expect(v.calls.filter((c) => c.method === 'POST' && [reviewPath, nextPath].includes(c.path)).map((c) => c.path)).toEqual(action ? [reviewPath, nextPath] : [nextPath]);
  });

  it.each([
    { answer: { result: 'correct', show_known: true, highlight_needs_review: false }, note: 'Enter means Know: deploy moves up a stage. Not sure? Choose Still learning.' },
    { answer: { result: 'correct', show_known: false, highlight_needs_review: false, hint_level: 0 }, note: "deploy isn't due yet, so its schedule stays the same." },
    { answer: { result: 'correct', show_known: false, highlight_needs_review: false, hint_level: 1 }, note: "Hints don't change the grading, but a right answer after a hint has no Know button." },
    { answer: { result: 'wrong', show_known: false, highlight_needs_review: true }, note: 'Enter moves deploy to the top of its deck, back to stage 1. Next question keeps its schedule.' },
  ])('English result note: $note', async ({ answer, note }) => {
    renderApp(<PracticeSession />, { locale: 'en', routes: routes({ 'POST /v1/practice/items/item-4/answer': () => Response.json(result(answer)) }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText(note)).toHaveClass('text-caption', 'text-muted');
  });

  it.each([
    { name: 'A16-3: case 4, [Next question] → next only', answer: {}, secondary: 'Câu tiếp', action: null, keyboard: false },
    { name: 'A16-7: case 4, focus secondary + Enter → next only', answer: {}, secondary: 'Câu tiếp', action: null, keyboard: true },
    { name: 'A16-7: case 1, focus secondary + Enter → needs_review', answer: { result: 'correct', show_known: true, highlight_needs_review: false }, secondary: 'Cần ôn lại', action: 'needs_review', keyboard: true },
  ])('$name', async ({ answer, secondary, action, keyboard }) => {
    const v = renderApp(<PracticeSession />, { routes: routes({ 'POST /v1/practice/items/item-4/answer': () => Response.json(result(answer)) }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    const button = await screen.findByRole('button', { name: new RegExp(secondary) });
    if (keyboard) {
      button.focus();
      await userEvent.keyboard('{Enter}');
    } else await userEvent.click(button);
    await screen.findByText('server');
    expect(posts(v.calls, '/v1/practice/items/item-4/review').map((c) => c.body)).toEqual(action ? [{ action }] : []);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1);
  });

  it('wrong while not in learning → only Next question; Enter → next only', async () => {
    const v = renderApp(<PracticeSession />, { routes: routes({
      'POST /v1/practice/items/item-4/answer': () => Response.json(result({ highlight_needs_review: false })),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    const next = await screen.findByRole('button', { name: /Câu tiếp/ });
    expect(next).toHaveAttribute('data-variant', 'sticker');
    expect(screen.queryByRole('button', { name: /Cần ôn lại|Đã biết/ })).not.toBeInTheDocument();
    expect(screen.getByText('deploy · triển khai (phần mềm)')).toBeInTheDocument();
    expect(next.parentElement?.nextElementSibling).toBeNull();
    await userEvent.keyboard('12');
    expect(posts(v.calls, '/v1/practice/items/item-4/review')).toHaveLength(0);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
    await userEvent.keyboard('{Enter}');
    await screen.findByText('server');
    expect(posts(v.calls, '/v1/practice/items/item-4/review')).toHaveLength(0);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1);
  });

  it.each(cases.flatMap((c) => ['1', '2'].map((key) => ({ ...c, key }))))('case $id: key $key follows its available review action', async ({ id, answer, key }) => {
    const v = renderApp(<PracticeSession />, { routes: routes({ 'POST /v1/practice/items/item-4/answer': () => Response.json(result(answer)) }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    await screen.findByRole('button', { name: /Cần ôn lại/ });
    // Repeats of either shortcut must be inert too.
    fireEvent.keyDown(document.body, { key: '1', repeat: true });
    fireEvent.keyDown(document.body, { key: '2', repeat: true });
    expect(posts(v.calls, '/v1/practice/items/item-4/review')).toHaveLength(0);
    await userEvent.keyboard(key);
    if (key === '2' && id !== 1) {
      expect(posts(v.calls, '/v1/practice/items/item-4/review')).toHaveLength(0);
      expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
      return;
    }
    await screen.findByText('server');
    expect(posts(v.calls, '/v1/practice/items/item-4/review').map((c) => c.body)).toEqual([{ action: key === '2' ? 'known' : 'needs_review' }]);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1);
  });

  it('held Enter (repeat) → one review and one next per question', async () => {
    let release!: () => void;
    let nextCount = 0;
    const v = renderApp(<PracticeSession />, { routes: routes({
      'POST /v1/practice/items/item-4/review': () => new Promise((resolve) => { release = () => resolve(Response.json({ action: 'needs_review' })); }),
      'POST /v1/practice/items/item-5/answer': () => Response.json(result()),
      'POST /v1/practice/items/item-5/review': () => Response.json({ action: 'needs_review' }),
      [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view(), item: ++nextCount === 1 ? trueFalse() : typed() }),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    await screen.findByText('Chưa đúng');
    fireEvent.keyDown(document.body, { key: 'Enter' });
    await waitFor(() => expect(posts(v.calls, '/v1/practice/items/item-4/review')).toHaveLength(1));
    for (let i = 0; i < 3; i++) fireEvent.keyDown(document.body, { key: 'Enter', repeat: true });
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
    await act(async () => release());
    await screen.findByText('server');
    for (let i = 0; i < 3; i++) fireEvent.keyDown(document.body, { key: 'Enter', repeat: true });
    await userEvent.keyboard('1');
    await screen.findByText('Chưa đúng');
    for (let i = 0; i < 3; i++) fireEvent.keyDown(document.body, { key: 'Enter', repeat: true });
    expect(posts(v.calls, '/v1/practice/items/item-4/review')).toHaveLength(1);
    expect(posts(v.calls, '/v1/practice/items/item-5/review')).toHaveLength(0);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1);
    fireEvent.keyDown(document.body, { key: 'Enter' });
    await screen.findByText('bộ nhớ đệm');
    expect(posts(v.calls, '/v1/practice/items/item-5/review')).toHaveLength(1);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(2);
  });

  it('A16-5: network error on review keeps the result, shows failed, and permits a safe retry', async () => {
    let attempts = 0;
    const v = renderApp(<PracticeSession />, { routes: routes({
      'POST /v1/practice/items/item-4/review': () => {
        if (++attempts === 1) throw new TypeError('network');
        return Response.json({ action: 'needs_review' });
      },
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    await screen.findByText('Chưa đúng');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được câu trả lời. Kiểm tra mạng rồi bấm lại.');
    expect(screen.getByText('Chưa đúng')).toBeInTheDocument();
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
    await userEvent.keyboard('{Enter}');
    await screen.findByText('server');
    expect(posts(v.calls, '/v1/practice/items/item-4/review').map((c) => c.body)).toEqual([{ action: 'needs_review' }, { action: 'needs_review' }]);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1);
  });

  it('A16-6: 409 known-not-allowed stays on the result and shows the existing error', async () => {
    const v = renderApp(<PracticeSession />, { routes: routes({
      'POST /v1/practice/items/item-4/answer': () => Response.json(result({ result: 'correct', show_known: true, highlight_needs_review: false })),
      'POST /v1/practice/items/item-4/review': () => problem(409, 'known-not-allowed'),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    await screen.findByText('Đúng rồi');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Có lỗi xảy ra. Thử lại sau.');
    expect(screen.getByRole('button', { name: /Đã biết/ })).toBeEnabled();
    expect(posts(v.calls, '/v1/practice/items/item-4/review').map((c) => c.body)).toEqual([{ action: 'known' }]);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
  });

  it('Review Focus 4: a reload resumes through GET current — position, progress and the open question', async () => {
    renderApp(<PracticeSession />, { routes: routes() });
    expect(await screen.findByText('triển khai')).toBeInTheDocument();
    expect(screen.getByText('Câu 4/10')).toBeInTheDocument();
    expect(screen.getByText('Luyện tập · Nhóm Công nghệ')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Câu 4/10' })).toBeInTheDocument();
    expect(screen.getByText('Chọn từ có nghĩa này')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^[1-4] / }).map((b) => b.textContent)).toEqual(['1 deploy', '2 delay', '3 deliver', '4 defend']);
  });

  it('K/61: key 2 answers option 2 with an Idempotency-Key; the result marks the right and the chosen option', async () => {
    const view_ = renderApp(<PracticeSession />, { routes: routes() });
    await screen.findByText('triển khai');
    await userEvent.keyboard('2');
    expect(await screen.findByText('Chưa đúng')).toBeInTheDocument();
    const [answer] = posts(view_.calls, '/v1/practice/items/item-4/answer');
    expect(answer.body).toEqual({ choice: 1 });
    expect(answer.headers['Idempotency-Key']).toBeTruthy();
    expect(screen.getByRole('button', { name: /1 deploy/ })).toHaveTextContent('Đáp án đúng');
    expect(screen.getByRole('button', { name: /2 delay/ })).toHaveTextContent('Bạn chọn');
    expect(screen.getByText('deploy · triển khai (phần mềm)')).toBeInTheDocument();
    expect(screen.getByText('to start using a new system')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cần ôn lại/ })).toHaveAttribute('data-variant', 'sticker');
    expect(screen.queryByRole('button', { name: /Đã biết/ })).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('server')).toBeInTheDocument();
    expect(screen.getByText('Câu 5/10')).toBeInTheDocument();
  });

  it('Review Focus 1: a second press while the answer is pending sends nothing more', async () => {
    let release!: () => void;
    const v = renderApp(<PracticeSession />, {
      routes: routes({
        'POST /v1/practice/items/item-4/answer': () => new Promise((resolve) => (release = () => resolve(Response.json(result())))),
      }),
    });
    await screen.findByText('triển khai');
    await userEvent.click(screen.getByRole('button', { name: /1 deploy/ }));
    await userEvent.click(screen.getByRole('button', { name: /2 delay/ }));
    release();
    await screen.findByText('Chưa đúng');
    expect(posts(v.calls, '/v1/practice/items/item-4/answer')).toHaveLength(1);
  });

  it('K/62: true/false right → [Đã biết] (show_known); pressing it reviews the word and goes on', async () => {
    const v = renderApp(<PracticeSession />, {
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 5 }), item: trueFalse(), preparing: false }),
        'POST /v1/practice/items/item-5/answer': () =>
          Response.json(result({ result: 'correct', correct: { lemma: 'server', text: 'máy chủ', choice_index: null, is_true: true }, meaning: 'máy chủ', show_known: true, highlight_needs_review: false })),
        'POST /v1/practice/items/item-5/review': () => Response.json({ action: 'known', item_id: 'item-5', level: 3, due_date: '2026-10-26', priority: false }),
        [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view({ asked: 6 }), item: typed() }),
      }),
    });
    expect(await screen.findByText('Từ và nghĩa này có khớp không?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /1 Đúng/ }));
    expect(await screen.findByText('Đúng rồi')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-5/answer')[0].body).toEqual({ is_true: true });
    await userEvent.click(screen.getByRole('button', { name: /Đã biết/ }));
    expect(await screen.findByText('bộ nhớ đệm')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-5/review')[0].body).toEqual({ action: 'known' });
  });

  it('TV12, K/64: [Kiểm tra] sends the typed word; try_again keeps the question with [Làm lại]; [Xem đáp án] skips', async () => {
    const v = renderApp(<PracticeSession />, {
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 6 }), item: typed(), preparing: false }),
        'POST /v1/practice/items/item-6/answer': () => Response.json({ result: 'try_again', tries: 1 }),
        'POST /v1/practice/items/item-6/skip': () =>
          Response.json(result({ skipped: true, correct: { lemma: 'cache', text: 'cache', choice_index: null, is_true: null }, meaning: 'bộ nhớ đệm' })),
      }),
    });
    const input = await screen.findByRole('textbox', { name: 'Câu trả lời' });
    expect(screen.getByRole('button', { name: 'Kiểm tra' })).toBeDisabled();
    await userEvent.type(input, 'cash');
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    expect(await screen.findByText('Kiểm tra chính tả rồi gõ lại. Wordmet chưa hiện đáp án.')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-6/answer')[0].body).toEqual({ text: 'cash' });
    expect(screen.getByText('Lần 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm lại/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Xem đáp án/ }));
    expect(await screen.findByText('cache · bộ nhớ đệm')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-6/skip')).toHaveLength(1);
  });

  it('K/63: H opens the next hint; vi says "Gợi ý 1/2"', async () => {
    const v = renderApp(<PracticeSession />, {
      routes: routes({
        'POST /v1/practice/items/item-4/hint': () => Response.json({ level: 1, hint: { kind: 'definition', text: 'to start using a new system' } }),
      }),
    });
    await screen.findByText('triển khai');
    await userEvent.keyboard('h');
    expect(await screen.findByText('to start using a new system')).toBeInTheDocument();
    expect(screen.getByText('Gợi ý 1/2')).toBeInTheDocument();
    expect(screen.getByText('Định nghĩa')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-4/hint')[0].body).toEqual({ level: 1 });
    expect(screen.getByRole('button', { name: /Mở gợi ý 2/ })).toBeInTheDocument();
  });

  it('design §7.1: in English the hint shows no total', async () => {
    renderApp(<PracticeSession />, {
      locale: 'en',
      routes: routes({
        'POST /v1/practice/items/item-4/hint': () => Response.json({ level: 1, hint: { kind: 'definition', text: 'to start using a new system' } }),
      }),
    });
    await screen.findByText('triển khai');
    await userEvent.keyboard('h');
    await screen.findByText('to start using a new system');
    expect(screen.getByText('Hint')).toBeInTheDocument();
    expect(screen.queryByText(/Hint 1\/2/)).not.toBeInTheDocument();
  });

  it('K/65: the round prompt continues the session', async () => {
    const v = renderApp(<PracticeSession />, {
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ status: 'waiting_continue', asked: 5, words: 5 }), item: null, preparing: false }),
        [`GET /v1/practice/sessions/${SESSION}/summary`]: () => Response.json({ ...SUMMARY, asked: 5, correct: 3, wrong: 2 }),
        [`POST /v1/practice/sessions/${SESSION}/continue`]: () => Response.json({ session: view({ status: 'active', asked: 5, round: 2 }) }),
      }),
    });
    expect(await screen.findByText('Bạn đã làm hết 5 từ')).toBeInTheDocument();
    expect(await screen.findByText('3 đúng')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Luyện lại thêm 5 câu/ }));
    expect(await screen.findByText('server')).toBeInTheDocument();
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/continue`)[0].body).toEqual({ continue: true });
  });

  it('K/67: Esc ends the session into the summary; [Cần ôn lại] per word and for the rest', async () => {
    let reviewed = false;
    const v = renderApp(<PracticeSession />, {
      routes: routes({
        [`GET /v1/practice/sessions/${SESSION}/summary`]: () =>
          Response.json({ ...SUMMARY, words: SUMMARY.words.map((w) => (reviewed && w.item_id === 'item-8' ? { ...w, action: 'needs_review' } : w)) }),
        'POST /v1/practice/items/item-8/review': () => {
          reviewed = true;
          return Response.json({ action: 'needs_review', item_id: 'item-8', level: 1, due_date: '2026-10-23', priority: true });
        },
        [`POST /v1/practice/sessions/${SESSION}/review-all`]: () => Response.json({ added: 1 }),
      }),
    });
    await screen.findByText('triển khai');
    await userEvent.keyboard('{Escape}');
    expect(await screen.findByRole('heading', { name: 'Xong 10 câu.' })).toBeInTheDocument();
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/finish`)).toHaveLength(1);
    expect(screen.getByText('Nhóm Công nghệ, trộn 3 kiểu câu. Hôm nay còn 1/3 phiên luyện.')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Cần ôn lại · 3 từ' });
    expect(within(list).getByText('Đã đưa vào ưu tiên')).toBeInTheDocument();
    await userEvent.click(within(list).getAllByRole('button', { name: 'Cần ôn lại' })[0]);
    await waitFor(() => expect(posts(v.calls, '/v1/practice/items/item-8/review')).toHaveLength(1));
    await userEvent.click(await screen.findByRole('button', { name: 'Đưa 1 từ còn lại vào ưu tiên' }));
    await waitFor(() => expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/review-all`)).toHaveLength(1));
    expect(screen.getByRole('link', { name: /Về Luyện tập/ })).toHaveAttribute('href', '/vi/app/practice');
  });

  it('E36: already answered elsewhere → the result the API sends is shown, no error', async () => {
    renderApp(<PracticeSession />, {
      routes: routes({ 'POST /v1/practice/items/item-4/answer': () => problem(409, 'already-answered', { result: result({ result: 'correct', highlight_needs_review: false }) }) }),
    });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText('Đúng rồi')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('E37: session-closed → "Phiên này đã kết thúc." and a way back to Practice', async () => {
    renderApp(<PracticeSession />, { routes: routes({ 'POST /v1/practice/items/item-4/answer': () => problem(409, 'session-closed') }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText('Phiên này đã kết thúc.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về Luyện tập' })).toHaveAttribute('href', '/vi/app/practice');
  });

  it('no open session (404) → says so, with a way back', async () => {
    renderApp(<PracticeSession />, { routes: routes({ 'GET /v1/practice/sessions/current': () => problem(404, 'not-found') }) });
    expect(await screen.findByText('Không có phiên luyện nào đang mở.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về Luyện tập' })).toBeInTheDocument();
  });

  it('K/66: reasons in API order (Khác last), a required note, one report; then the button says it was sent', async () => {
    const v = renderApp(
      <>
        <PracticeSession />
        <ToastRegion />
      </>,
      { routes: routes({ 'POST /v1/practice/items/item-4/report': () => Response.json({ id: 'r1' }, { status: 201 }) }) },
    );
    await screen.findByText('triển khai');
    await userEvent.click(screen.getByRole('button', { name: 'Báo lỗi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Báo lỗi câu này' });
    const radios = await within(dialog).findAllByRole('radio');
    expect(radios.map((r) => r.closest('label')?.textContent)).toEqual(['Nghĩa sai', 'Đáp án đúng mà bị chấm sai', 'Gợi ý sai', 'Khác']);
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Khác' }));
    expect(within(dialog).getByText('bắt buộc · 0/300')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo lỗi' }));
    expect(within(dialog).getByText('Ghi rõ lỗi để gửi báo lỗi này.')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-4/report')).toHaveLength(0);
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Ghi chú/ }), 'deliver cũng đúng');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo lỗi' }));
    expect(await screen.findByText('Đã gửi báo lỗi. Xem kết quả trong Lịch sử → Báo lỗi của tôi.')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-4/report')[0].body).toEqual({ reason: 'other', note: 'deliver cũng đúng' });
    expect(screen.getByRole('button', { name: 'Đã báo lỗi' })).toBeDisabled();
  });

  it('E34: leaving the page (no Esc, no ×) sends nothing; the session stays open on the server', async () => {
    const v = renderApp(<PracticeSession />, { routes: routes() });
    await screen.findByText('triển khai');
    v.unmount();
    expect(v.calls.filter((c) => c.method === 'POST' && c.path !== '/v1/auth/refresh')).toHaveLength(0);
  });

  it('Review Focus 4: a reload with a hint already opened shows its text again', async () => {
    renderApp(<PracticeSession />, {
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view(), item: mcq('item-4', { hint_level: 1 }), preparing: false }),
        'POST /v1/practice/items/item-4/hint': () => Response.json({ level: 1, hint: { kind: 'first_letter', text: 'd…' } }),
      }),
    });
    expect(await screen.findByText('d…')).toBeInTheDocument();
    expect(screen.getByText('Chữ cái đầu')).toBeInTheDocument();
  });

  it('after a typed answer is graded, Enter (focus still in the field) reviews known and goes to the next question', async () => {
    const v = renderApp(<PracticeSession />, {
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 6 }), item: typed(), preparing: false }),
        'POST /v1/practice/items/item-6/answer': () =>
          Response.json(result({ result: 'correct', correct: { lemma: 'cache', text: 'cache', choice_index: null, is_true: null }, meaning: 'bộ nhớ đệm', show_known: true, highlight_needs_review: false })),
        'POST /v1/practice/items/item-6/review': () => Response.json({ action: 'known', item_id: 'item-6', level: 3 }),
      }),
    });
    const input = await screen.findByRole('textbox', { name: 'Câu trả lời' });
    await userEvent.type(input, 'cache{Enter}');
    expect(await screen.findByText('Đúng rồi')).toBeInTheDocument();
    expect(input).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1));
    expect(posts(v.calls, '/v1/practice/items/item-6/review').map((c) => c.body)).toEqual([{ action: 'known' }]);
  });

  it('M4 review: Esc in the answer field leaves the field first; it does not end the session', async () => {
    const v = renderApp(<PracticeSession />, {
      routes: routes({ 'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 6 }), item: typed(), preparing: false }) }),
    });
    const input = await screen.findByRole('textbox', { name: 'Câu trả lời' });
    await userEvent.type(input, 'cac');
    await userEvent.keyboard('{Escape}');
    expect(input).not.toHaveFocus();
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/finish`)).toHaveLength(0);
  });

  it('M4 review: a right answer without a hint and without [Đã biết] does not blame hints', async () => {
    renderApp(<PracticeSession />, {
      routes: routes({ 'POST /v1/practice/items/item-4/answer': () => Response.json(result({ result: 'correct', show_known: false, highlight_needs_review: false, hint_level: 0 })) }),
    });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText('Đúng rồi')).toBeInTheDocument();
    expect(screen.queryByText(/nhờ gợi ý/)).not.toBeInTheDocument();
  });

  it('M4 review: on a retry screen only [Làm lại] is yellow', async () => {
    renderApp(<PracticeSession />, {
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 6 }), item: typed(), preparing: false }),
        'POST /v1/practice/items/item-6/answer': () => Response.json({ result: 'try_again', tries: 1 }),
      }),
    });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Câu trả lời' }), 'cash{Enter}');
    await screen.findByRole('button', { name: /Làm lại/ });
    const yellow = screen.getAllByRole('button').filter((b) => b.getAttribute('data-variant') === 'sticker');
    expect(yellow.map((b) => b.textContent)).toEqual(['Làm lạiEnter']);
  });

  it('M4 review: changing the choice after a lost answer sends a new Idempotency-Key', async () => {
    let first = true;
    const v = renderApp(<PracticeSession />, {
      routes: routes({
        'POST /v1/practice/items/item-4/answer': () => {
          if (first) {
            first = false;
            throw new TypeError('network');
          }
          return Response.json(result());
        },
      }),
    });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.keyboard('2');
    await screen.findByText('Chưa đúng');
    const keys = posts(v.calls, '/v1/practice/items/item-4/answer').map((c) => c.headers['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });
});

describe('PracticeSession pronunciation (đợt cải thiện A, C1)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('no speak button on the question; UK · US by the word after grading; 1 on a focused speak button does not review', async () => {
    const synth = installSpeech([makeVoice('en-GB'), makeVoice('en-US')]);
    const view_ = renderApp(<PracticeSession />, { routes: routes() });
    await screen.findByText('triển khai');
    expect(screen.queryByRole('button', { name: /Nghe giọng/ })).not.toBeInTheDocument();
    await userEvent.keyboard('2');
    await screen.findByText('Chưa đúng');
    const uk = screen.getByRole('button', { name: 'Nghe giọng Anh' });
    expect(screen.getByRole('button', { name: 'Nghe giọng Mỹ' })).toBeInTheDocument();
    await userEvent.click(uk);
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'deploy', lang: 'en-GB' }));
    uk.focus();
    await userEvent.keyboard('1');
    expect(posts(view_.calls, '/v1/practice/items/item-4/review')).toHaveLength(0);
    expect(screen.getByText('Chưa đúng')).toBeInTheDocument();
  });
});

describe('[Luyện thêm một phiên] (audit 26/10/2026 #2)', () => {
  const view = (cloze_source: PracticeSessionView['cloze_source']): PracticeSessionView => ({
    id: 's-1', source: 'group', group_id: 'g-1', group_filter: 'all', sort: 'queue', types: ['cloze'], prompt_style: 'meaning',
    target_count: 10, status: 'finished', round: 1, asked: 10, words: 10, ai_planned: 0, cloze_source,
  });

  it('after an own-sentence session it sends cloze_source: own, so no AI credit is spent', () => {
    expect(againBody(view('own'))).toMatchObject({ types: ['cloze'], cloze_source: 'own' });
  });

  it('after an AI or rule session it sends no cloze_source (the API default stays)', () => {
    expect(againBody(view('ai'))).not.toHaveProperty('cloze_source');
    expect(againBody(view(null))).not.toHaveProperty('cloze_source');
  });
});
