import type { CalendarDayView } from './calendar-api';
import { dayView } from './day-view';

const day = (over: Partial<CalendarDayView> = {}): CalendarDayView => ({
  date: '2026-11-05',
  counts: { learned: 1, reviewed: 2, reviewed_known: 1, reviewed_again: 1, learned_groups: 1, practice_questions: 3 },
  items: [
    { kind: 'reviewed', item_id: 'r1', lemma: 'deploy', group_id: 'g1', result: 'known', times: 1 },
    { kind: 'learned', item_id: 'l1', lemma: 'budget', group_id: 'g1', result: 'known', times: 1 },
    { kind: 'reviewed', item_id: 'r2', lemma: 'profit', group_id: null, result: 'again', times: 1 },
  ],
  practice_sessions: [
    { session_id: 's-a', first_position: 1, last_position: 2, questions: 2, correct: 1 },
    { session_id: 's-b', first_position: 1, last_position: 1, questions: 1, correct: 1 },
  ],
  next_page_token: null,
  ...over,
});

describe('dayView (M6.6, without practice since f19)', () => {
  it('splits the words into learned, known and again, across pages', () => {
    const second = day({ items: [{ kind: 'learned', item_id: 'l2', lemma: null, group_id: null, result: null, times: 1 }] });
    const view = dayView([day(), second]);
    expect(view.learned.map((i) => i.item_id)).toEqual(['l1', 'l2']);
    expect(view.known.map((i) => i.item_id)).toEqual(['r1']);
    expect(view.again.map((i) => i.item_id)).toEqual(['r2']);
  });

  it('no pages: empty lists', () => {
    expect(dayView([])).toEqual({ learned: [], known: [], again: [] });
  });
});
