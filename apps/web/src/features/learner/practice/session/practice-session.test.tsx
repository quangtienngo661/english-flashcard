// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installSpeech, makeVoice } from '@/lib/speech/speech-test-support';
import { renderApp } from '@/test-utils/render-app';
import { testRoute } from '@/test-utils/route-locale';
import { ToastRegion } from '@/ui/Toast';
import { StreakToast } from '@/ui/StreakToast';
import { SessionIntl } from '@/app-shell/SessionIntl';
import type { Route } from '@/app-shell/session/test-support';
import type { PracticeSessionView } from '../practice-api';
import { STREAK_KEY } from '../../calendar/calendar-api';
import { PracticeSession } from './PracticeSession';
import { againBody } from './SessionSummary';

const hardReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: testRoute.locale }),
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
    { id: 1, title: 'A16-1: case 1, Enter → review known, then next', answer: { result: 'correct', show_known: true, highlight_needs_review: false }, primary: 'Know', action: 'known', note: 'Enter means Know: deploy moves up a level. Not sure? Choose Review again.' },
    { id: 2, title: 'A16-4: case 2, Enter → next only', answer: { result: 'correct', show_known: false, hint_level: 0, highlight_needs_review: false }, primary: 'Next', action: null, note: "deploy isn't due yet, so its schedule stays the same." },
    { id: 3, title: 'A16-4: case 3, Enter → next only', answer: { result: 'correct', show_known: false, hint_level: 1, highlight_needs_review: false }, primary: 'Next', action: null, note: "Hints don't change the grading, but a right answer after a hint has no Know button." },
    { id: 4, title: 'A16-2: case 4, Enter → review needs_review, then next', answer: { result: 'wrong', show_known: false, highlight_needs_review: true }, primary: 'Review again', action: 'needs_review', note: 'Press Enter to put deploy at the top of its deck, back to Level 1. Next keeps its schedule.' },
  ];

  it('M6.2: an answer carrying streak writes the streak cache; no GET /v1/me/streak follows', async () => {
    const v = renderApp(<PracticeSession />, { session: true, routes: routes({
      'POST /v1/practice/items/item-4/answer': () => Response.json(result({ streak: { days: 6 } })),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    await waitFor(() => expect(v.client.getQueryData(STREAK_KEY)).toEqual({ days: 6, studied_today: true }));
    expect(v.count('GET', '/v1/me/streak')).toBe(0);
  });

  it('L-B-5: on a /vi route an answer that earns a streak shows "6-day streak" once, in English, at the session corner', async () => {
    // AppProviders' bottom toast is mounted too, outside SessionIntl, as in production; the session's corner toast replaces it.
    renderApp(<><SessionIntl><PracticeSession /></SessionIntl><StreakToast /></>, { locale: 'vi', routes: routes({
      'POST /v1/practice/items/item-4/answer': () => Response.json(result({ streak: { days: 6 } })),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText('6-day streak')).toBeInTheDocument();
    expect(screen.getAllByText(/streak/)).toHaveLength(1);
    expect(screen.queryByText(/ngày liên tiếp/)).not.toBeInTheDocument();
  });

  it.each(cases)('$title', async ({ id, answer, action, note }) => {
    const v = renderApp(<PracticeSession />, { session: true, routes: routes({
      'POST /v1/practice/items/item-4/answer': () => Response.json(result(answer)),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText(note)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button').filter((b) => /^(Review again|Know|Next)/.test(b.textContent ?? ''));
    expect(buttons.map((b) => b.textContent)).toEqual(id === 1 ? ['Review again', 'Know'] : id === 4 ? ['Next', 'Review again'] : ['Review again', 'Next']);
    buttons.forEach((b) => expect(b.querySelector('kbd')).toBeNull());
    await userEvent.keyboard('{Enter}');
    await screen.findByText('server');
    const reviewPath = '/v1/practice/items/item-4/review';
    const nextPath = `/v1/practice/sessions/${SESSION}/next`;
    expect(posts(v.calls, reviewPath).map((c) => c.body)).toEqual(action ? [{ action }] : []);
    expect(posts(v.calls, nextPath)).toHaveLength(1);
    expect(v.calls.filter((c) => c.method === 'POST' && [reviewPath, nextPath].includes(c.path)).map((c) => c.path)).toEqual(action ? [reviewPath, nextPath] : [nextPath]);
  });

  it.each([
    { answer: { result: 'correct', show_known: true, highlight_needs_review: false }, note: 'Enter means Know: deploy moves up a level. Not sure? Choose Review again.' },
    { answer: { result: 'correct', show_known: false, highlight_needs_review: false, hint_level: 0 }, note: "deploy isn't due yet, so its schedule stays the same." },
    { answer: { result: 'correct', show_known: false, highlight_needs_review: false, hint_level: 1 }, note: "Hints don't change the grading, but a right answer after a hint has no Know button." },
    { answer: { result: 'wrong', show_known: false, highlight_needs_review: true }, note: 'Press Enter to put deploy at the top of its deck, back to Level 1. Next keeps its schedule.' },
  ])('English result note: $note', async ({ answer, note }) => {
    renderApp(<PracticeSession />, { session: true, locale: 'en', routes: routes({ 'POST /v1/practice/items/item-4/answer': () => Response.json(result(answer)) }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText(note)).toBeInTheDocument();
  });

  it.each([
    { name: 'A16-3: case 4, [Next] → next only', answer: {}, secondary: 'Next', action: null, keyboard: false },
    { name: 'A16-7: case 4, focus secondary + Enter → next only', answer: {}, secondary: 'Next', action: null, keyboard: true },
    { name: 'A16-7: case 1, focus secondary + Enter → needs_review', answer: { result: 'correct', show_known: true, highlight_needs_review: false }, secondary: 'Review again', action: 'needs_review', keyboard: true },
  ])('$name', async ({ answer, secondary, action, keyboard }) => {
    const v = renderApp(<PracticeSession />, { session: true, routes: routes({ 'POST /v1/practice/items/item-4/answer': () => Response.json(result(answer)) }) });
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

  it('wrong while not in learning → only Next; Enter → next only', async () => {
    const v = renderApp(<PracticeSession />, { session: true, routes: routes({
      'POST /v1/practice/items/item-4/answer': () => Response.json(result({ highlight_needs_review: false })),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    const next = await screen.findByRole('button', { name: /Next/ });
    expect(next).toHaveTextContent(/^Next$/);
    expect(next.querySelector('kbd')).toBeNull();
    expect(screen.queryByRole('button', { name: /Review again|Know/ })).not.toBeInTheDocument();
    // F.14: no case note on the stub; the meaning leads, the answer word follows it.
    const panel = next.closest<HTMLElement>('[data-feedback]')!;
    expect(panel).toHaveTextContent(/^Not quite\s*triển khai \(phần mềm\)\s*to start using a new system\s*deploy\s*Next$/);
    expect(next.nextElementSibling).toBeNull();
    await userEvent.keyboard('12');
    expect(posts(v.calls, '/v1/practice/items/item-4/review')).toHaveLength(0);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
    await userEvent.keyboard('{Enter}');
    await screen.findByText('server');
    expect(posts(v.calls, '/v1/practice/items/item-4/review')).toHaveLength(0);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1);
  });

  it.each(cases.flatMap((c) => ['1', '2'].map((key) => ({ ...c, key }))))('case $id: key $key follows its available review action', async ({ id, answer, key }) => {
    const v = renderApp(<PracticeSession />, { session: true, routes: routes({ 'POST /v1/practice/items/item-4/answer': () => Response.json(result(answer)) }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    await screen.findByRole('button', { name: /Review again/ });
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
    const v = renderApp(<PracticeSession />, { session: true, routes: routes({
      'POST /v1/practice/items/item-4/review': () => new Promise((resolve) => { release = () => resolve(Response.json({ action: 'needs_review' })); }),
      'POST /v1/practice/items/item-5/answer': () => Response.json(result()),
      'POST /v1/practice/items/item-5/review': () => Response.json({ action: 'needs_review' }),
      [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view(), item: ++nextCount === 1 ? trueFalse() : typed() }),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    await screen.findByText('Not quite');
    fireEvent.keyDown(document.body, { key: 'Enter' });
    await waitFor(() => expect(posts(v.calls, '/v1/practice/items/item-4/review')).toHaveLength(1));
    for (let i = 0; i < 3; i++) fireEvent.keyDown(document.body, { key: 'Enter', repeat: true });
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
    await act(async () => release());
    await screen.findByText('server');
    for (let i = 0; i < 3; i++) fireEvent.keyDown(document.body, { key: 'Enter', repeat: true });
    await userEvent.keyboard('1');
    await screen.findByText('Not quite');
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
    const v = renderApp(<PracticeSession />, { session: true, routes: routes({
      'POST /v1/practice/items/item-4/review': () => {
        if (++attempts === 1) throw new TypeError('network');
        return Response.json({ action: 'needs_review' });
      },
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    await screen.findByText('Not quite');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent("Your answer wasn't saved. Check your connection and try again.");
    expect(screen.getByText('Not quite')).toBeInTheDocument();
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
    await userEvent.keyboard('{Enter}');
    await screen.findByText('server');
    expect(posts(v.calls, '/v1/practice/items/item-4/review').map((c) => c.body)).toEqual([{ action: 'needs_review' }, { action: 'needs_review' }]);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1);
  });

  it('A16-6: 409 known-not-allowed stays on the result and shows the existing error', async () => {
    const v = renderApp(<PracticeSession />, { session: true, routes: routes({
      'POST /v1/practice/items/item-4/answer': () => Response.json(result({ result: 'correct', show_known: true, highlight_needs_review: false })),
      'POST /v1/practice/items/item-4/review': () => problem(409, 'known-not-allowed'),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    await screen.findByText('Right');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again later.');
    expect(screen.getByRole('button', { name: /Know/ })).toBeEnabled();
    expect(posts(v.calls, '/v1/practice/items/item-4/review').map((c) => c.body)).toEqual([{ action: 'known' }]);
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
  });

  it('Review Focus 4: a reload resumes through GET current — position, progress and the open question', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes() });
    expect(await screen.findByText('triển khai')).toBeInTheDocument();
    expect(screen.getByText('question 4 / 10')).toBeInTheDocument();
    expect(screen.getByText('Practice · Công nghệ deck')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'question 4 / 10' })).toBeInTheDocument();
    // QM9-9: the chip names the kind; no instruction line under it (P.13).
    expect(screen.getByText('Multiple choice')).toBeInTheDocument();
    expect(screen.queryByText('Choose the word with this meaning')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^[1-4]/ }).map((b) => b.textContent)).toEqual(['1deploy', '2delay', '3deliver', '4defend']);
  });

  it('a live region present before answering says the result; focus moves to the primary action (audit 26/10/2026 #8)', async () => {
    const { container } = renderApp(<PracticeSession />, { session: true, routes: routes() });
    await screen.findByText('triển khai');
    const live = container.querySelector('[data-live="result"]')!;
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('');
    await userEvent.click(screen.getByRole('button', { name: /^2delay/ }));
    await waitFor(() => expect(live).toHaveTextContent('Not quite. deploy · triển khai (phần mềm)'));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Review again/ }));
  });

  it.each(cases)('F.14: focus still lands on the primary action ($primary) of case $id', async ({ answer, primary, note }) => {
    renderApp(<PracticeSession />, { session: true, routes: routes({ 'POST /v1/practice/items/item-4/answer': () => Response.json(result(answer)) }) });
    await screen.findByText('triển khai');
    await userEvent.click(screen.getByRole('button', { name: /^1deploy/ }));
    await screen.findByText(note);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: new RegExp(`^${primary}$`) }));
  });

  it('F.14: a right answer without a level move keeps the case note on the stub, then the meaning and the answer word', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes({
      'POST /v1/practice/items/item-4/answer': () => Response.json(result({ result: 'correct', show_known: false, hint_level: 0, highlight_needs_review: false })),
    }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    const panel = (await screen.findByText('Right')).closest<HTMLElement>('[data-feedback]')!;
    expect(within(panel).queryByRole('group', { name: 'answer' })).not.toBeInTheDocument();
    expect(panel).toHaveTextContent(/^Right\s*deploy isn't due yet, so its schedule stays the same\.\s*triển khai \(phần mềm\)\s*to start using a new system\s*deploy\s*Review again\s*Next$/);
  });

  it('try_again keeps focus in the word box (Review Focus 5)', async () => {
    renderApp(<PracticeSession />, {
      session: true,
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 6 }), item: typed(), preparing: false }),
        'POST /v1/practice/items/item-6/answer': () => Response.json({ result: 'try_again', tries: 1 }),
      }),
    });
    const input = await screen.findByRole('textbox', { name: 'Your answer' });
    await userEvent.type(input, 'cash{Enter}');
    expect(await screen.findByText('Check the spelling and try again. The answer stays hidden.')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Your answer' }));
  });

  it('K/61: key 2 answers option 2 with an Idempotency-Key; the result marks the right and the chosen option', async () => {
    const view_ = renderApp(<PracticeSession />, { session: true, routes: routes() });
    await screen.findByText('triển khai');
    await userEvent.keyboard('2');
    expect(await screen.findByText('Not quite')).toBeInTheDocument();
    const [answer] = posts(view_.calls, '/v1/practice/items/item-4/answer');
    expect(answer.body).toEqual({ choice: 1 });
    expect(answer.headers['Idempotency-Key']).toBeTruthy();
    expect(screen.getByRole('button', { name: /^1deploy/ })).toHaveTextContent('Right answer');
    expect(screen.getByRole('button', { name: /^2delay/ })).toHaveTextContent('Your choice');
    // F.14 (the result ticket): "Not quite" and the case note on the stub, the meaning as the lead with its definition, then the answer
    // word with its speaker; the nested answer box is gone.
    const panel = screen.getByText('Not quite').closest<HTMLElement>('[data-feedback]')!;
    expect(within(panel).queryByRole('group', { name: 'answer' })).not.toBeInTheDocument();
    expect(within(panel).getByText('triển khai (phần mềm)')).toBeInTheDocument();
    expect(within(panel).getByText('to start using a new system')).toBeInTheDocument();
    expect(within(panel).getByText('deploy')).toBeInTheDocument();
    expect(panel).toHaveTextContent(/^Not quite\s*Press Enter to put deploy.*schedule\.\s*triển khai \(phần mềm\)\s*to start using a new system\s*deploy\s*Next\s*Review again$/);
    expect(screen.getByRole('button', { name: /Review again/ })).toHaveTextContent(/^Review again$/);
    expect(screen.queryByRole('button', { name: /Know/ })).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('server')).toBeInTheDocument();
    expect(screen.getByText('question 5 / 10')).toBeInTheDocument();
  });

  it('Review Focus 1: a second press while the answer is pending sends nothing more', async () => {
    let release!: () => void;
    const v = renderApp(<PracticeSession />, {
      session: true,
      routes: routes({
        'POST /v1/practice/items/item-4/answer': () => new Promise((resolve) => (release = () => resolve(Response.json(result())))),
      }),
    });
    await screen.findByText('triển khai');
    await userEvent.click(screen.getByRole('button', { name: /^1deploy/ }));
    await userEvent.click(screen.getByRole('button', { name: /^2delay/ }));
    release();
    await screen.findByText('Not quite');
    expect(posts(v.calls, '/v1/practice/items/item-4/answer')).toHaveLength(1);
  });

  it('motion (owner 27/10/2026, 3C/2A): the chosen wrong option wiggles, the right check pops, the result rises; the next question rises in', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes() });
    await screen.findByText('triển khai');
    const card = screen.getByText('triển khai').closest('section')!;
    expect(card).toHaveClass('motion-safe:animate-wm-card-rise');
    await userEvent.keyboard('2');
    await screen.findByText('Not quite');
    expect(screen.getByRole('button', { name: /^2delay/ })).toHaveClass('motion-safe:animate-wm-wiggle-soft');
    expect(screen.getByRole('button', { name: /^1deploy/ })).not.toHaveClass('motion-safe:animate-wm-wiggle-soft');
    // As in the prototype, the check pops only when the learner chose it.
    expect(screen.getByRole('button', { name: /^1deploy/ }).querySelector('svg')).not.toHaveClass('motion-safe:animate-wm-pop-in');
    expect(screen.getByText('Not quite').closest('[data-feedback]')).toHaveClass('motion-safe:animate-wm-panel-drop');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('server')).toBeInTheDocument();
    // A new question is a new card: it mounts again, so its rise plays again.
    expect(screen.getByText('server').closest('section')).not.toBe(card);
  });

  it('K/62: true/false right → [Know] (show_known); pressing it reviews the word and goes on', async () => {
    const v = renderApp(<PracticeSession />, {
      session: true,
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 5 }), item: trueFalse(), preparing: false }),
        'POST /v1/practice/items/item-5/answer': () =>
          Response.json(result({ result: 'correct', correct: { lemma: 'server', text: 'máy chủ', choice_index: null, is_true: true }, meaning: 'máy chủ', show_known: true, highlight_needs_review: false })),
        'POST /v1/practice/items/item-5/review': () => Response.json({ action: 'known', item_id: 'item-5', level: 3, due_date: '2026-10-26', priority: false }),
        [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view({ asked: 6 }), item: typed() }),
      }),
    });
    expect(await screen.findByText('True or false')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^1True/ }));
    expect(await screen.findByText('Right')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^1True/ }).querySelector('svg')).toHaveClass('motion-safe:animate-wm-pop-in');
    expect(posts(v.calls, '/v1/practice/items/item-5/answer')[0].body).toEqual({ is_true: true });
    await userEvent.click(screen.getByRole('button', { name: /Know/ }));
    expect(await screen.findByText('bộ nhớ đệm')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-5/review')[0].body).toEqual({ action: 'known' });
  });

  it('TV12, K/64: [Kiểm tra] sends the typed word; try_again keeps the question with [Làm lại]; [Xem đáp án] skips', async () => {
    const v = renderApp(<PracticeSession />, {
      session: true,
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 6 }), item: typed(), preparing: false }),
        'POST /v1/practice/items/item-6/answer': () => Response.json({ result: 'try_again', tries: 1 }),
        'POST /v1/practice/items/item-6/skip': () =>
          Response.json(result({ skipped: true, correct: { lemma: 'cache', text: 'cache', choice_index: null, is_true: null }, meaning: 'bộ nhớ đệm' })),
      }),
    });
    const input = await screen.findByRole('textbox', { name: 'Your answer' });
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
    await userEvent.type(input, 'cash');
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Check the spelling and try again. The answer stays hidden.')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-6/answer')[0].body).toEqual({ text: 'cash' });
    expect(screen.getByText('Try 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Show answer/ }));
    // F.14: the wrong ticket now shows the meaning as its lead, then the answer word.
    await waitFor(() => expect(document.querySelector('[data-feedback]')).toHaveTextContent(/bộ nhớ đệm\s*to start using a new system\s*cache/));
    expect(posts(v.calls, '/v1/practice/items/item-6/skip')).toHaveLength(1);
  });

  it('K/63: H opens the next hint; a Vietnamese route says "Hint 1 of 2" (QM9-9)', async () => {
    const v = renderApp(<PracticeSession />, {
      session: true,
      routes: routes({
        'POST /v1/practice/items/item-4/hint': () => Response.json({ level: 1, hint: { kind: 'definition', text: 'to start using a new system' } }),
      }),
    });
    await screen.findByText('triển khai');
    await userEvent.keyboard('h');
    expect(await screen.findByText('to start using a new system')).toBeInTheDocument();
    expect(screen.getByText('Hint 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Definition')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-4/hint')[0].body).toEqual({ level: 1 });
    // P.13: "Show hint 2" sits in the second row of the hint box, where its text will go.
    const rows = within(screen.getByRole('region', { name: 'Hint 1 of 2' })).getAllByRole('listitem');
    expect(within(rows[1]).getByRole('button', { name: /Show hint 2/ })).toBeInTheDocument();
  });

  it('QM9-9 (supersedes design §7.1): an English route shows the total too, "Hint 1 of 2"', async () => {
    renderApp(<PracticeSession />, {
      session: true,
      locale: 'en',
      routes: routes({
        'POST /v1/practice/items/item-4/hint': () => Response.json({ level: 1, hint: { kind: 'definition', text: 'to start using a new system' } }),
      }),
    });
    await screen.findByText('triển khai');
    await userEvent.keyboard('h');
    await screen.findByText('to start using a new system');
    expect(screen.getByText('Hint 1 of 2')).toBeInTheDocument();
  });

  it('K/65: the round prompt continues the session', async () => {
    const v = renderApp(<PracticeSession />, {
      session: true,
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ status: 'waiting_continue', asked: 5, words: 5 }), item: null, preparing: false }),
        [`GET /v1/practice/sessions/${SESSION}/summary`]: () => Response.json({ ...SUMMARY, asked: 5, correct: 3, wrong: 2 }),
        [`POST /v1/practice/sessions/${SESSION}/continue`]: () => Response.json({ session: view({ status: 'active', asked: 5, round: 2 }) }),
      }),
    });
    expect(await screen.findByText("You've done all 5 words")).toBeInTheDocument();
    expect(await screen.findByText('3 right')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Practice 5 more/ }));
    expect(await screen.findByText('server')).toBeInTheDocument();
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/continue`)[0].body).toEqual({ continue: true });
  });

  it('K/67: Esc ends the session into the summary; [Review again] per word and for the rest', async () => {
    let reviewed = false;
    const v = renderApp(<PracticeSession />, {
      session: true,
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
    expect(await screen.findByRole('heading', { name: '10 questions done.' })).toBeInTheDocument();
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/finish`)).toHaveLength(1);
    // Figma 119:4608: the ring reads 7/10 right; blocks rise 90 ms apart (design §8.3).
    expect(screen.getByRole('img', { name: '7/10 right' })).toHaveTextContent('7/10');
    expect(screen.getByRole('heading', { name: '10 questions done.' }).closest('[class*="animate-wm-summary-in"]')?.className).toMatch(/animation-delay:90ms/);
    expect(screen.getByText('Công nghệ deck, 3 question types. 1 of 3 sessions left today.')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Review again · 3 words' });
    expect(within(list).getByText('Added to priority')).toBeInTheDocument();
    await userEvent.click(within(list).getAllByRole('button', { name: 'Review again' })[0]);
    await waitFor(() => expect(posts(v.calls, '/v1/practice/items/item-8/review')).toHaveLength(1));
    await userEvent.click(await screen.findByRole('button', { name: 'Add the other 1 word to priority' }));
    await waitFor(() => expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/review-all`)).toHaveLength(1));
    expect(screen.getByRole('link', { name: /Back to Practice/ })).toHaveAttribute('href', '/vi/app/practice');
  });

  it('E36: already answered elsewhere → the result the API sends is shown, no error', async () => {
    renderApp(<PracticeSession />, {
      session: true,
      routes: routes({ 'POST /v1/practice/items/item-4/answer': () => problem(409, 'already-answered', { result: result({ result: 'correct', highlight_needs_review: false }) }) }),
    });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText('Right')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('E37: session-closed → "Phiên này đã kết thúc." and a way back to Practice', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes({ 'POST /v1/practice/items/item-4/answer': () => problem(409, 'session-closed') }) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText('This session has ended.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Practice' })).toHaveAttribute('href', '/vi/app/practice');
  });

  it('no open session (404) → says so, with a way back', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes({ 'GET /v1/practice/sessions/current': () => problem(404, 'not-found') }) });
    expect(await screen.findByText('No practice session is open.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Practice' })).toBeInTheDocument();
  });

  it('K/66: reasons in API order (Khác last), a required note, one report; then the button says it was sent', async () => {
    const v = renderApp(
      <>
        <PracticeSession />
        <ToastRegion />
      </>,
      { session: true, routes: routes({ 'POST /v1/practice/items/item-4/report': () => Response.json({ id: 'r1' }, { status: 201 }) }) },
    );
    await screen.findByText('triển khai');
    await userEvent.click(screen.getByRole('button', { name: 'Report' }));
    const dialog = await screen.findByRole('dialog', { name: 'Report this question' });
    const radios = await within(dialog).findAllByRole('radio');
    expect(radios.map((r) => r.closest('label')?.textContent)).toEqual(['Nghĩa sai', 'Đáp án đúng mà bị chấm sai', 'Gợi ý sai', 'Khác']);
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Khác' }));
    expect(within(dialog).getByText('required · 0/300')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));
    expect(within(dialog).getByText('Describe the problem to send this report.')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-4/report')).toHaveLength(0);
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Note/ }), 'deliver cũng đúng');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));
    expect(await screen.findByText('Report sent. See the outcome in Settings, under My reports.')).toBeInTheDocument();
    expect(posts(v.calls, '/v1/practice/items/item-4/report')[0].body).toEqual({ reason: 'other', note: 'deliver cũng đúng' });
    expect(screen.getByRole('button', { name: 'Reported' })).toBeDisabled();
  });

  it('E34: leaving the page (no Esc, no ×) sends nothing; the session stays open on the server', async () => {
    const v = renderApp(<PracticeSession />, { session: true, routes: routes() });
    await screen.findByText('triển khai');
    v.unmount();
    expect(v.calls.filter((c) => c.method === 'POST' && c.path !== '/v1/auth/refresh')).toHaveLength(0);
  });

  it('Review Focus 4: a reload with a hint already opened shows its text again', async () => {
    renderApp(<PracticeSession />, {
      session: true,
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view(), item: mcq('item-4', { hint_level: 1 }), preparing: false }),
        'POST /v1/practice/items/item-4/hint': () => Response.json({ level: 1, hint: { kind: 'first_letter', text: 'd' } }),
      }),
    });
    expect(await screen.findByText('d___')).toBeInTheDocument();
    expect(screen.getByText('First letter')).toBeInTheDocument();
  });

  it('after a typed answer is graded, Enter (focus still in the field) reviews known and goes to the next question', async () => {
    const v = renderApp(<PracticeSession />, {
      session: true,
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 6 }), item: typed(), preparing: false }),
        'POST /v1/practice/items/item-6/answer': () =>
          Response.json(result({ result: 'correct', correct: { lemma: 'cache', text: 'cache', choice_index: null, is_true: null }, meaning: 'bộ nhớ đệm', show_known: true, highlight_needs_review: false })),
        'POST /v1/practice/items/item-6/review': () => Response.json({ action: 'known', item_id: 'item-6', level: 3 }),
      }),
    });
    const input = await screen.findByRole('textbox', { name: 'Your answer' });
    await userEvent.type(input, 'cache{Enter}');
    expect(await screen.findByText('Right')).toBeInTheDocument();
    expect(input).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1));
    expect(posts(v.calls, '/v1/practice/items/item-6/review').map((c) => c.body)).toEqual([{ action: 'known' }]);
    // The typed question's card leaves the page (its key must not clash with the answer field's key; motion round 27/10/2026).
    expect(await screen.findByText('True or false')).toBeInTheDocument();
    expect(v.container.querySelectorAll('section')).toHaveLength(1);
  });

  it('M4 review: Esc in the answer field leaves the field first; it does not end the session', async () => {
    const v = renderApp(<PracticeSession />, {
      session: true,
      routes: routes({ 'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 6 }), item: typed(), preparing: false }) }),
    });
    const input = await screen.findByRole('textbox', { name: 'Your answer' });
    await userEvent.type(input, 'cac');
    await userEvent.keyboard('{Escape}');
    expect(input).not.toHaveFocus();
    expect(posts(v.calls, `/v1/practice/sessions/${SESSION}/finish`)).toHaveLength(0);
  });

  it('M4 review: a right answer without a hint and without [Know] does not blame hints', async () => {
    renderApp(<PracticeSession />, {
      session: true,
      routes: routes({ 'POST /v1/practice/items/item-4/answer': () => Response.json(result({ result: 'correct', show_known: false, highlight_needs_review: false, hint_level: 0 })) }),
    });
    await screen.findByText('triển khai');
    await userEvent.keyboard('1');
    expect(await screen.findByText('Right')).toBeInTheDocument();
    expect(screen.queryByText(/after a hint/)).not.toBeInTheDocument();
  });

  it('M4 review: on a retry screen only [Làm lại] takes Enter', async () => {
    renderApp(<PracticeSession />, {
      session: true,
      routes: routes({
        'GET /v1/practice/sessions/current': () => Response.json({ session: view({ asked: 6 }), item: typed(), preparing: false }),
        'POST /v1/practice/items/item-6/answer': () => Response.json({ result: 'try_again', tries: 1 }),
      }),
    });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Your answer' }), 'cash{Enter}');
    await screen.findByRole('button', { name: /Try again/ });
    expect(screen.getByRole('button', { name: /Try again/ })).toHaveTextContent(/^Try again$/);
    expect(document.querySelector('button kbd')).toBeNull();
  });

  it('M4 review: changing the choice after a lost answer sends a new Idempotency-Key', async () => {
    let first = true;
    const v = renderApp(<PracticeSession />, {
      session: true,
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
    await screen.findByText('Not quite');
    const keys = posts(v.calls, '/v1/practice/items/item-4/answer').map((c) => c.headers['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });
});

describe('PracticeSession pronunciation (đợt cải thiện A, C1)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('no speak button on the question; the speaker icon by the word (US voice) after grading; 1 on a focused speak button does not review', async () => {
    const synth = installSpeech([makeVoice('en-GB'), makeVoice('en-US')]);
    const view_ = renderApp(<PracticeSession />, { session: true, routes: routes() });
    await screen.findByText('triển khai');
    expect(screen.queryByRole('button', { name: 'Listen' })).not.toBeInTheDocument();
    await userEvent.keyboard('2');
    await screen.findByText('Not quite');
    const uk = screen.getByRole('button', { name: 'Listen' });
    await userEvent.click(uk);
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'deploy', lang: 'en-US' }));
    uk.focus();
    await userEvent.keyboard('1');
    expect(posts(view_.calls, '/v1/practice/items/item-4/review')).toHaveLength(0);
    expect(screen.getByText('Not quite')).toBeInTheDocument();
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

  it('M5.3: a session opened with an AI count asks for it again, with its placement and own_then_ai', () => {
    const body = againBody({ ...view('own_then_ai'), types: ['mcq_definition', 'cloze'], ai_planned: 3, ai_placement: 'random' });
    expect(body).toMatchObject({ types: ['mcq_definition', 'cloze'], cloze_source: 'own_then_ai', ai_count: 3, ai_placement: 'random' });
  });

  it('M5.3: a session opened the old way (no ai_placement) sends no ai_count', () => {
    expect(againBody({ ...view(null), ai_placement: null })).not.toHaveProperty('ai_count');
    expect(againBody(view(null))).not.toHaveProperty('ai_count');
  });
});

// The summary with alternative answers (session synonyms design §3.3). `vital` was asked and `crucial` typed on the same item (a1),
// after a hint, so both words are listed and share the item id.
describe('Summary of alternative answers', () => {
  const rows = [
    { sense_id: 'sense-vital', lemma: 'vital', meaning: 'thiết yếu', item_id: 'a1', action: null },
    { sense_id: 'sense-crucial', lemma: 'crucial', meaning: 'quan trọng', item_id: 'a1', action: null },
  ];
  const summaryRoutes = (summary: Record<string, unknown>, over: Record<string, Route> = {}) => routes({
    [`GET /v1/practice/sessions/${SESSION}/summary`]: () => Response.json({ ...SUMMARY, ...summary }),
    ...over,
  });
  const openSummary = async (summary: Record<string, unknown>, over: Record<string, Route> = {}) => {
    const v = renderApp(<PracticeSession />, { session: true, routes: summaryRoutes(summary, over) });
    await screen.findByText('triển khai');
    await userEvent.keyboard('{Escape}');
    await screen.findByRole('heading', { name: '10 questions done.' });
    return v;
  };

  it('CS8: two summary rows on one item each review their own word', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const v = await openSummary({ alternatives: 1, words: rows }, {
      'POST /v1/practice/items/a1/review': async () => {
        await gate;
        return Response.json({ action: 'needs_review', item_id: 'a1', sense_id: 'sense-crucial', level: 1, due_date: '2026-11-08', priority: true });
      },
    });
    const list = screen.getByRole('list', { name: 'Review again · 2 words' });
    const [, crucial] = within(list).getAllByRole('listitem');
    await userEvent.click(within(crucial).getByRole('button', { name: 'Review again' }));
    await waitFor(() => expect(posts(v.calls, '/v1/practice/items/a1/review')).toHaveLength(1));
    expect(posts(v.calls, '/v1/practice/items/a1/review')[0].body).toEqual({ action: 'needs_review', sense_id: 'sense-crucial' });
    const rowButton = (index: number) => within(within(screen.getByRole('list', { name: 'Review again · 2 words' })).getAllByRole('listitem')[index]).getByRole('button', { name: 'Review again' });
    // A pending Button shows a spinner icon (React Aria drops aria-busy), so that is what tells a pending row.
    const pending = (index: number) => rowButton(index).querySelector('svg') !== null;
    await waitFor(() => expect(pending(1)).toBe(true));
    expect(pending(0)).toBe(false);
    release();
    await waitFor(() => expect(pending(1)).toBe(false));
  });

  it('a pressed row shows "Đã đưa vào ưu tiên" and the other keeps its button', async () => {
    await openSummary({ alternatives: 1, words: [rows[0], { ...rows[1], action: 'needs_review' }] });
    const [vital, crucial] = within(screen.getByRole('list', { name: 'Review again · 2 words' })).getAllByRole('listitem');
    expect(within(crucial).getByText('Added to priority')).toBeInTheDocument();
    expect(within(crucial).queryByRole('button')).not.toBeInTheDocument();
    expect(within(vital).getByRole('button', { name: 'Review again' })).toBeInTheDocument();
  });

  it('CS9: the summary says how many right answers were alternative answers', async () => {
    await openSummary({ alternatives: 2 });
    const line = await screen.findByText('Including 2 alternative answers');
    // M5.5: no Đúng/Sai tiles any more (Figma 119:4608 has the ring); the line sits with the title, next to the ring of right answers.
    expect(screen.getByRole('heading', { name: /done\.$/ }).parentElement).toContainElement(line);
  });

  it('CS9: nothing is said when there was none, or when an older API sends no count', async () => {
    await openSummary({ alternatives: 0 });
    expect(screen.queryByText(/alternative answer/)).not.toBeInTheDocument();
  });

  it('an older API sends no count: the same', async () => {
    await openSummary({});
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.queryByText(/alternative answer/)).not.toBeInTheDocument();
  });
});
