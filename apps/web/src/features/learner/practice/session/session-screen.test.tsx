// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import type { Route } from '@/app-shell/session/test-support';
import { PracticeSession } from './PracticeSession';

// M5.4: the rebuilt session screen (Figma 100:3164, 178:5326, 178:5546, 178:5755; round 15 4E).
const hardReplace = vi.fn();
vi.mock('next/navigation', () => ({
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
    const v = renderApp(<PracticeSession />, { routes: routes(cloze()) });
    await screen.findByText('Air quality tends to ___ in the dry season.');
    expect(screen.getByText('câu AI')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Báo lỗi' }));
    await screen.findByRole('dialog');
    expect(v.calls.some((c) => c.path === '/v1/practice/report-reasons?kind=ai')).toBe(true);
  });

  it('ai: false shows no "câu AI" chip even on a cloze; Báo lỗi there opens the non-AI reasons', async () => {
    const v = renderApp(<PracticeSession />, { routes: routes(cloze({ ai: false })) });
    await screen.findByText('Air quality tends to ___ in the dry season.');
    expect(screen.queryByText('câu AI')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Báo lỗi' }));
    await screen.findByRole('dialog');
    expect(v.calls.some((c) => c.path === '/v1/practice/report-reasons?kind=non_ai')).toBe(true);
    expect(v.calls.some((c) => c.path === '/v1/practice/report-reasons?kind=ai')).toBe(false);
  });

  it('Ôn shows neither the AI chip nor Báo lỗi, even on a reportable item', async () => {
    renderApp(<PracticeSession recall={{ groupId: TECH }} />, { routes: routes(null, {
      'POST /v1/practice/sessions': () => Response.json({ session: view({ kind: 'recall', cloze_source: null }) }),
      [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view({ kind: 'recall' }), item: mcq({ ai: true }) }),
    }) });
    await screen.findByText('xấu đi');
    expect(screen.queryByText('câu AI')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Báo lỗi' })).not.toBeInTheDocument();
  });

  it('a right answer at level 1 shows the move "Ngăn 1 ngày → Ngăn 3 ngày" under "Đúng rồi"', async () => {
    renderApp(<PracticeSession />, { routes: routes(mcq()) });
    await screen.findByText('xấu đi');
    await userEvent.keyboard('1');
    const panel = (await screen.findByText('Đúng rồi')).closest('[data-feedback]') as HTMLElement;
    const move = within(panel).getByRole('group', { name: 'Ngăn 1 ngày → Ngăn 3 ngày' });
    expect(move).toHaveTextContent('Ngăn 1 ngàyNgăn 3 ngày');
  });

  it('no move line when the word has no level (left the schedule) or is already in the last stage', async () => {
    for (const level of [null, 5]) {
      const v = renderApp(<PracticeSession />, { routes: routes(mcq(), { 'POST /v1/practice/items/item-8/answer': () => Response.json(result({ level })) }) });
      await screen.findByText('xấu đi');
      await userEvent.keyboard('1');
      await screen.findByText('Đúng rồi');
      expect(screen.queryByRole('group', { name: /^Ngăn .* → Ngăn / })).not.toBeInTheDocument();
      v.unmount();
    }
  });

  it('a reload whose view says correct 5, wrong 2 shows ✓5 ✗2 and "câu 8 / 20"; an answer adds to the counts', async () => {
    renderApp(<PracticeSession />, { routes: routes(mcq(), {
      'POST /v1/practice/items/item-8/answer': () => Response.json(result({ result: 'wrong', show_known: false, highlight_needs_review: true, choice_index: 0 })),
    }) });
    await screen.findByText('xấu đi');
    const bar = screen.getByRole('progressbar', { name: 'câu 8 / 20' });
    expect(bar).toHaveAttribute('aria-valuenow', '8');
    expect(screen.getByText('câu 8 / 20')).toBeInTheDocument();
    expect(screen.getByLabelText('5 câu đúng')).toHaveTextContent('5');
    expect(screen.getByLabelText('2 câu sai')).toHaveTextContent('2');
    await userEvent.keyboard('3');
    await screen.findByText('Chưa đúng');
    expect(screen.getByLabelText('3 câu sai')).toHaveTextContent('3');
    expect(screen.getByLabelText('5 câu đúng')).toHaveTextContent('5');
  });

  it('MCQ wrong: the picked option reads "Bạn chọn", the right one "Đáp án đúng", the others are dimmed', async () => {
    renderApp(<PracticeSession />, { routes: routes(mcq(), {
      'POST /v1/practice/items/item-8/answer': () => Response.json(result({ result: 'wrong', show_known: false, highlight_needs_review: true })),
    }) });
    await screen.findByText('xấu đi');
    await userEvent.keyboard('3');
    await screen.findByText('Chưa đúng');
    expect(screen.getByRole('button', { name: /dominate/ })).toHaveTextContent('Bạn chọn');
    expect(screen.getByRole('button', { name: /deteriorate/ })).toHaveTextContent('Đáp án đúng');
    expect(screen.getByRole('button', { name: /evaporate/ })).not.toHaveTextContent(/Bạn chọn|Đáp án đúng/);
    expect(screen.getByRole('button', { name: /evaporate/ })).toHaveClass('opacity-60');
  });

  it('keys keep today\'s actions: 1 answers, Enter = Đã biết then next, H opens a hint, Esc ends', async () => {
    const v = renderApp(<PracticeSession />, { routes: routes(mcq(), {
      'POST /v1/practice/items/item-9/answer': () => Response.json(result()),
      [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view({ asked: 9, correct: 6 }), item: mcq({ item_id: 'item-9', position: 9 }) }),
      'POST /v1/practice/items/item-9/hint': () => Response.json({ level: 1, hint: { kind: 'definition', text: 'to become worse' } }),
      [`POST /v1/practice/sessions/${SESSION}/finish`]: () => Response.json({ session: view({ status: 'finished' }) }),
      [`GET /v1/practice/sessions/${SESSION}/summary`]: () => Response.json({ session: view({ status: 'finished' }), asked: 9, correct: 6, wrong: 2, words: [] }),
    }) });
    await screen.findByText('xấu đi');
    await userEvent.keyboard('1');
    await screen.findByText('Đúng rồi');
    await userEvent.keyboard('{Enter}');
    await screen.findByText('câu 9 / 20');
    expect(v.calls.filter((c) => c.method === 'POST' && c.path === '/v1/practice/items/item-8/review').map((c) => c.body)).toEqual([{ action: 'known' }]);
    expect(screen.getByLabelText('6 câu đúng')).toBeInTheDocument();
    await userEvent.keyboard('h');
    await screen.findByText('to become worse');
    await userEvent.keyboard('{Escape}');
    await screen.findByText('Xong 9 câu.');
  });

  it('the key legend names the keys of the result on screen', async () => {
    renderApp(<PracticeSession />, { routes: routes(mcq()) });
    await screen.findByText('xấu đi');
    await userEvent.keyboard('1');
    await screen.findByText('Đúng rồi');
    const legend = screen.getByRole('list', { name: 'Phím' });
    expect(within(legend).getAllByRole('listitem').map((i) => i.textContent)).toEqual(['EnterĐã biết', '1Cần ôn lại', 'EscDừng phiên']);
  });

  it('review M1: after a try-again, Enter in the field does not send the same wrong word again; the word is selected to retype', async () => {
    const typedItem = { ...cloze({ ai: false }), item_id: 'item-8' };
    const v = renderApp(<PracticeSession />, { routes: routes(typedItem, {
      'POST /v1/practice/items/item-8/answer': () => Response.json({ result: 'try_again', tries: 1 }),
    }) });
    const field = await screen.findByRole('textbox', { name: 'Câu trả lời' });
    await userEvent.type(field, 'deteriorated{Enter}');
    await screen.findByText('Kiểm tra chính tả rồi gõ lại. Wordmet chưa hiện đáp án.');
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
