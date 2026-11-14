import { shuffle } from '../questions/distractors.js';

// Word order of a session (design 7.1) and of rounds ≥ 2 (design 7.2).
export type SortKey =
  | 'level_asc' | 'overdue_first' | 'new_first' | 'least_practiced' | 'most_wrong' | 'queue' | 'priority_oldest' | 'random';
export type Source = 'today' | 'all' | 'group' | 'weak' | 'priority';

export type SortableWord = {
  sense_id: string;
  level: number;
  due_date: string;
  priority: boolean;
  // Same values as Learning's Section.
  section: 'priority' | 'due' | 'new' | 'backlog' | 'early';
  added_at: string;
  last_needs_review_at: string | null;
  last_practiced_at: string | null;
  // PracticeStats.wrong (Task 14).
  recent_wrong: number;
};

const DEFAULT_SORT: Record<Source, SortKey> = {
  weak: 'level_asc', priority: 'priority_oldest', today: 'queue', group: 'queue', all: 'least_practiced',
};

export function defaultSort(source: Source): SortKey {
  return DEFAULT_SORT[source];
}

const SECTION_RANK: Record<SortableWord['section'], number> = { priority: 0, due: 1, new: 2, early: 3, backlog: 4 };

/** Ascending, nulls last; ISO strings compare in time order. */
const byText = (a: string | null, b: string | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -1 : 1);

function queueOrder(a: SortableWord, b: SortableWord): number {
  const section = SECTION_RANK[a.section] - SECTION_RANK[b.section];
  if (section !== 0) return section;
  switch (a.section) {
    case 'priority':
    case 'new':
      return byText(a.added_at, b.added_at);
    case 'due':
      return byText(a.due_date, b.due_date) || a.level - b.level;
    case 'early':
      return byText(a.due_date, b.due_date);
    default:
      return 0;
  }
}

const COMPARE: Record<SortKey, (a: SortableWord, b: SortableWord) => number> = {
  level_asc: (a, b) => a.level - b.level,
  overdue_first: (a, b) => byText(a.due_date, b.due_date),
  new_first: (a, b) => Number(a.level !== 0) - Number(b.level !== 0),
  // Never practised (null) first, then the oldest practice.
  least_practiced: (a, b) => (a.last_practiced_at === null || b.last_practiced_at === null
    ? Number(b.last_practiced_at === null) - Number(a.last_practiced_at === null)
    : byText(a.last_practiced_at, b.last_practiced_at)),
  most_wrong: (a, b) => b.recent_wrong - a.recent_wrong,
  queue: queueOrder,
  priority_oldest: (a, b) => byText(a.last_needs_review_at, b.last_needs_review_at),
  random: () => 0,
};

/** Sense ids in the chosen order; ties broken at random (shuffle, then a stable sort). */
export function sortWords(words: SortableWord[], key: SortKey, random: () => number): string[] {
  return shuffle(words, random).sort(COMPARE[key]).map((w) => w.sense_id);
}

/** A shuffled round; with ≥ 2 words its first word is not the previous round's last word. */
export function nextRoundOrder(words: string[], lastOfPreviousRound: string | null, random: () => number): string[] {
  const order = shuffle(words, random);
  if (order.length >= 2 && order[0] === lastOfPreviousRound) {
    const j = 1 + Math.floor(random() * (order.length - 1));
    [order[0], order[j]] = [order[j], order[0]];
  }
  return order;
}
