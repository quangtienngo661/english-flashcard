// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionIntl } from '@/app-shell/SessionIntl';
import { renderApp } from '@/test-utils/render-app';
import { testRoute } from '@/test-utils/route-locale';
import { CalendarHost } from '@/features/learner/calendar/CalendarHost';
import type { Route } from '@/app-shell/session/test-support';
import { PracticeSession } from './PracticeSession';

// M5.4: the rebuilt session screen (Figma 100:3164, 178:5326, 178:5546, 178:5755; round 15 4E).
const hardReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: testRoute.locale }),
  usePathname: () => '/vi/app/practice/session',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });

const TECH = '11111111-1111-4111-8111-111111111111';
const SESSION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const view = (over: Record<string, unknown> = {}) => ({
  id: SESSION, source: 'group', group_id: TECH, group_filter: 'all', sort: 'queue',
  types: ['mcq_definition', 'type_word', 'cloze'], prompt_style: 'mixed', target_count: 20, status: 'active', round: 1,
  asked: 8, words: 20, ai_planned: 0, cloze_source: 'own_then_ai', correct: 5, wrong: 2, ...over,
});
const hints = { level1: true, level2: false, level3: false };
const mcq = (over: Record<string, unknown> = {}) => ({
  item_id: 'item-8', round: 1, position: 8, type: 'mcq_definition', prompt_style: 'meaning',
  prompt: { kind: 'mcq', meaning: 'xấu đi', meaning_language: 'vi', context_label: null, options: ['deteriorate', 'accumulate', 'dominate', 'evaporate'] },
  hints_available: hints, hint_level: 0, state: 'unanswered', tries: 0, reportable: true, ai: false, ...over,
});
const cloze = (over: Record<string, unknown> = {}) => ({
  item_id: 'item-8', round: 1, position: 8, type: 'cloze', prompt_style: 'sentence',
  prompt: { kind: 'cloze', sentence: 'Air quality tends to ___ in the dry season.' },
  hints_available: hints, hint_level: 0, state: 'unanswered', tries: 0, reportable: true, ai: true, ...over,
});
const result = (over: Record<string, unknown> = {}) => ({
  result: 'correct', skipped: false, tries: 1, hint_level: 0,
  correct: { lemma: 'deteriorate', text: 'deteriorate', choice_index: 0, is_true: null },
  meaning: 'xấu đi', definition_en: 'to become worse in quality', show_known: true, highlight_needs_review: false,
  translation: null, level: 1, ...over,
});
const GROUPS = [{ id: TECH, name: 'Đề 12 · Writing', version: 1, total: 48, today: { priority: 0, due: 3, new: 0 }, cells: [], backlog: 0 }];
const ENT = {
  plan: 'pro', sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  features: { 'ai.practice': { allowed: true, reason: null }, 'ai.lookup': { allowed: true, reason: null } },
  pools: {
    practice_sessions: { limit: 30, used: 2, remaining: 28, resets_at: '2026-11-10T17:00:00.000Z' },
    ai_practice: { limit: 300, used: 20, remaining: 280, resets_at: null }, ai_lookup: { limit: 0, used: 0, remaining: 0, resets_at: null },
  },
};
const REASONS = { items: [{ code: 'meaning_wrong', label: 'Nghĩa sai', detail_hint: null, note_required: false }] };
const routes = (item: unknown, over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/practice/sessions/current': () => Response.json({ session: view(), item, preparing: false }),
  'GET /v1/groups': () => Response.json({ items: GROUPS }),
  'GET /v1/me/entitlements': () => Response.json(ENT),
  'POST /v1/practice/items/item-8/answer': () => Response.json(result()),
  'POST /v1/practice/items/item-8/review': () => Response.json({ action: 'known', item_id: 'item-8', level: 2 }),
  'GET /v1/practice/report-reasons?kind=non_ai': () => Response.json(REASONS),
  'GET /v1/practice/report-reasons?kind=ai': () => Response.json(REASONS),
  ...over,
});

describe('PracticeSession, the rebuilt screen (M5.4)', () => {
  it('an AI item shows the "câu AI" chip and Báo lỗi, and reports with the AI reasons', async () => {
    const v = renderApp(<PracticeSession />, { session: true, routes: routes(cloze()) });
    await screen.findByRole('textbox', { name: 'Missing word' });
    expect(screen.getByText('AI sentence')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Report' }));
    await screen.findByRole('dialog');
    expect(v.calls.some((c) => c.path === '/v1/practice/report-reasons?kind=ai')).toBe(true);
  });

  it('ai: false shows no "câu AI" chip even on a cloze; Báo lỗi there opens the non-AI reasons', async () => {
    const v = renderApp(<PracticeSession />, { session: true, routes: routes(cloze({ ai: false })) });
    await screen.findByRole('textbox', { name: 'Missing word' });
    expect(screen.queryByText('AI sentence')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Report' }));
    await screen.findByRole('dialog');
    expect(v.calls.some((c) => c.path === '/v1/practice/report-reasons?kind=non_ai')).toBe(true);
    expect(v.calls.some((c) => c.path === '/v1/practice/report-reasons?kind=ai')).toBe(false);
  });

  it('Ôn shows neither the AI chip nor Báo lỗi, even on a reportable item', async () => {
    renderApp(<PracticeSession recall={{ groupId: TECH }} />, { session: true, routes: routes(null, {
      'POST /v1/practice/sessions': () => Response.json({ session: view({ kind: 'recall', cloze_source: null }) }),
      [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view({ kind: 'recall' }), item: mcq({ ai: true }) }),
    }) });
    await screen.findByText('xấu đi');
    expect(screen.queryByText('AI sentence')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Report' })).not.toBeInTheDocument();
  });

  it('a right answer at level 1 shows the move "Bậc 1 → Bậc 2" under "Đúng rồi"', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(mcq()) });
    await screen.findByText('xấu đi');
    await userEvent.keyboard('1');
    const panel = (await screen.findByText('Right')).closest('[data-feedback]') as HTMLElement;
    const move = within(panel).getByRole('group', { name: 'From Level 1 to Level 2' });
    expect(move).toHaveTextContent('Level 1Level 2');
    // F.14: the move is the stub's note; the case note follows the answer word.
    expect(panel).toHaveTextContent(/^Right\s*Level 1\s*Level 2\s*xấu đi\s*to become worse in quality\s*deteriorate\s*Enter means Know/);
  });

  it('no move line when the word has no level (left the schedule) or is already at the last level', async () => {
    for (const level of [null, 5]) {
      const v = renderApp(<PracticeSession />, { session: true, routes: routes(mcq(), { 'POST /v1/practice/items/item-8/answer': () => Response.json(result({ level })) }) });
      await screen.findByText('xấu đi');
      await userEvent.keyboard('1');
      await screen.findByText('Right');
      expect(screen.queryByRole('group', { name: /^From (New|Level \d) to Level \d$/ })).not.toBeInTheDocument();
      v.unmount();
    }
  });

  it('a reload whose view says correct 5, wrong 2 shows ✓5 ✗2 and "câu 8 / 20"; an answer adds to the counts', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(mcq(), {
      'POST /v1/practice/items/item-8/answer': () => Response.json(result({ result: 'wrong', show_known: false, highlight_needs_review: true, choice_index: 0 })),
    }) });
    await screen.findByText('xấu đi');
    const bar = screen.getByRole('progressbar', { name: 'question 8 / 20' });
    expect(bar).toHaveAttribute('aria-valuenow', '8');
    expect(screen.getByText('question 8 / 20')).toBeInTheDocument();
    expect(screen.getByLabelText('5 right')).toHaveTextContent('5');
    expect(screen.getByLabelText('2 wrong')).toHaveTextContent('2');
    await userEvent.keyboard('3');
    await screen.findByText('Not quite');
    expect(screen.getByLabelText('3 wrong')).toHaveTextContent('3');
    expect(screen.getByLabelText('5 right')).toHaveTextContent('5');
  });

  it('MCQ wrong: the picked option reads "Bạn chọn", the right one "Đáp án đúng", the others are dimmed', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(mcq(), {
      'POST /v1/practice/items/item-8/answer': () => Response.json(result({ result: 'wrong', show_known: false, highlight_needs_review: true })),
    }) });
    await screen.findByText('xấu đi');
    await userEvent.keyboard('3');
    await screen.findByText('Not quite');
    expect(screen.getByRole('button', { name: /dominate/ })).toHaveTextContent('Your choice');
    expect(screen.getByRole('button', { name: /deteriorate/ })).toHaveTextContent('Right answer');
    expect(screen.getByRole('button', { name: /evaporate/ })).not.toHaveTextContent(/Your choice|Right answer/);
    expect(screen.getByRole('button', { name: /evaporate/ })).toHaveClass('opacity-60');
  });

  it('keys keep today\'s actions: 1 answers, Enter = Know then next, H opens a hint, Esc ends', async () => {
    const v = renderApp(<PracticeSession />, { session: true, routes: routes(mcq(), {
      'POST /v1/practice/items/item-9/answer': () => Response.json(result()),
      [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view({ asked: 9, correct: 6 }), item: mcq({ item_id: 'item-9', position: 9 }) }),
      'POST /v1/practice/items/item-9/hint': () => Response.json({ level: 1, hint: { kind: 'definition', text: 'to become worse' } }),
      [`POST /v1/practice/sessions/${SESSION}/finish`]: () => Response.json({ session: view({ status: 'finished' }) }),
      [`GET /v1/practice/sessions/${SESSION}/summary`]: () => Response.json({ session: view({ status: 'finished' }), asked: 9, correct: 6, wrong: 2, words: [] }),
    }) });
    await screen.findByText('xấu đi');
    await userEvent.keyboard('1');
    await screen.findByText('Right');
    await userEvent.keyboard('{Enter}');
    await screen.findByText('question 9 / 20');
    expect(v.calls.filter((c) => c.method === 'POST' && c.path === '/v1/practice/items/item-8/review').map((c) => c.body)).toEqual([{ action: 'known' }]);
    expect(screen.getByLabelText('6 right')).toBeInTheDocument();
    await userEvent.keyboard('h');
    await screen.findByText('to become worse');
    await userEvent.keyboard('{Escape}');
    await screen.findByText('9 questions done.');
  });

  it('the key legend names the keys of the result on screen', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(mcq()) });
    await screen.findByText('xấu đi');
    await userEvent.keyboard('1');
    await screen.findByText('Right');
    const legend = screen.getByRole('list', { name: 'Keys' });
    expect(within(legend).getAllByRole('listitem').map((i) => i.textContent)).toEqual(['EnterKnow', '1Review again', 'EscStop']);
  });

  it('review M1: after a try-again, Enter in the field does not send the same wrong word again; the word is selected to retype', async () => {
    const typedItem = { ...cloze({ ai: false }), item_id: 'item-8' };
    const v = renderApp(<PracticeSession />, { session: true, routes: routes(typedItem, {
      'POST /v1/practice/items/item-8/answer': () => Response.json({ result: 'try_again', tries: 1 }),
    }) });
    const field = await screen.findByRole('textbox', { name: 'Missing word' });
    await userEvent.type(field, 'deteriorated{Enter}');
    await screen.findByText('Check the spelling and try again. The answer stays hidden.');
    await userEvent.type(field, '{Enter}');
    const answers = () => v.calls.filter((c) => c.method === 'POST' && c.path === '/v1/practice/items/item-8/answer');
    expect(answers()).toHaveLength(1);
    expect((field as HTMLInputElement).selectionStart).toBe(0);
    expect((field as HTMLInputElement).selectionEnd).toBe('deteriorated'.length);
    // Typing now replaces the selected word, as a learner retypes it.
    await userEvent.keyboard('deteriorate{Enter}');
    await waitFor(() => expect(answers()).toHaveLength(2));
    expect(answers()[1].body).toEqual({ text: 'deteriorate' });
  });
});

describe('M6.9: the calendar button in the session bar (phone, Figma 95:344)', () => {
  const typeWord = { item_id: 'item-8', round: 1, position: 8, type: 'type_word', prompt_style: 'meaning',
    prompt: { kind: 'type_meaning', meaning: 'xấu đi', meaning_language: 'vi', context_label: null },
    hints_available: hints, hint_level: 0, state: 'unanswered', tries: 0, reportable: true, ai: false };
  const recall = (item: unknown) => routes(null, {
    'POST /v1/practice/sessions': () => Response.json({ session: view({ kind: 'recall', cloze_source: null }) }),
    [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view({ kind: 'recall' }), item }),
    'GET /v1/me/calendar?month=2026-11': () => Response.json({ month: '2026-11', days: [], totals: { study_days: 0, learned: 0, reviewed: 0, practice_sessions: 0 } }),
  });

  it('the practice session shows one "Lịch học" in its bar', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(mcq()) });
    await screen.findByText('xấu đi');
    expect(screen.getAllByRole('button', { name: 'Study calendar' })).toHaveLength(1);
  });

  it('Ôn: the bar button opens "Tháng 11, 2026"; L typed in the answer box types "l"', async () => {
    // Lịch is mounted by the (member) layout, outside SessionIntl: the button is English, the dialog keeps the route's language.
    renderApp(<CalendarHost><SessionIntl><PracticeSession recall={{ groupId: TECH }} /></SessionIntl></CalendarHost>, { routes: recall(typeWord) });
    const input = await screen.findByRole('textbox', { name: 'Your answer' });
    await userEvent.type(input, 'l');
    expect(input).toHaveValue('l');
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Study calendar' }));
    expect(await screen.findByRole('dialog', { name: 'Tháng 11, 2026' })).toBeInTheDocument();
  });
});
