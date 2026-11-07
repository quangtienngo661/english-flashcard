import { deckPlan, mastered } from './deck-actions';
import type { GroupSummary } from './groups-api';

/** A deck of 40 words: `levels` = how many words sit at levels 0…5. */
const deck = (today: GroupSummary['today'], levels: number[] = [5, 3, 8, 12, 7, 5]): GroupSummary => ({
  id: 'g1', name: 'Du lịch', version: 1, total: levels.reduce((a, b) => a + b, 0), today,
  cells: levels.map((total, level) => ({ level, total, due: 0 })), backlog: 0, available: { due: today.due, new: today.new },
});

describe('deckPlan (design §4.1, DC25)', () => {
  it('due words and new words: Học (new words) and Ôn, Ôn first in weight', () => {
    expect(deckPlan(deck({ priority: 3, due: 5, new: 5 }))).toEqual({ learn: 'new', recall: 'due', primary: 'recall', doneToday: false });
  });

  it('due words only: Học flips every word (no new word left today) and Ôn', () => {
    expect(deckPlan(deck({ priority: 0, due: 4, new: 0 }))).toEqual({ learn: 'all', recall: 'due', primary: 'recall', doneToday: false });
  });

  it('a priority word alone counts as due', () => {
    expect(deckPlan(deck({ priority: 1, due: 0, new: 0 })).recall).toBe('due');
  });

  it('new words only, nothing learned yet: Học alone', () => {
    expect(deckPlan(deck({ priority: 0, due: 0, new: 12 }, [12, 0, 0, 0, 0, 0]))).toEqual({ learn: 'new', recall: null, primary: 'learn', doneToday: false });
  });

  it('new words and learned words, nothing due: Học first, Ôn tập beside it', () => {
    expect(deckPlan(deck({ priority: 0, due: 0, new: 5 }))).toEqual({ learn: 'new', recall: 'extra', primary: 'learn', doneToday: false });
  });

  it('nothing left today, words learned: done today, Ôn tập alone', () => {
    expect(deckPlan(deck({ priority: 0, due: 0, new: 0 }))).toEqual({ learn: null, recall: 'extra', primary: null, doneToday: true });
  });

  it('nothing left today and nothing learned (new-word cap reached): done today, Học flips every word', () => {
    expect(deckPlan(deck({ priority: 0, due: 0, new: 0 }, [25, 0, 0, 0, 0, 0]))).toEqual({ learn: 'all', recall: null, primary: null, doneToday: true });
  });

  it('an empty deck offers neither', () => {
    expect(deckPlan(deck({ priority: 0, due: 0, new: 0 }, [0, 0, 0, 0, 0, 0]))).toEqual({ learn: null, recall: null, primary: null, doneToday: false });
  });
});

describe('mastered (DC11)', () => {
  it('counts levels 4 and 5', () => {
    expect(mastered(deck({ priority: 0, due: 0, new: 0 }))).toBe(12);
  });

  it('0 when no word reached level 4', () => {
    expect(mastered(deck({ priority: 0, due: 0, new: 0 }, [5, 5, 5, 5, 0, 0]))).toBe(0);
  });

  it('a summary with fewer cells counts what it has', () => {
    expect(mastered({ ...deck({ priority: 0, due: 0, new: 0 }), cells: [{ level: 0, total: 3, due: 0 }] })).toBe(0);
  });
});
