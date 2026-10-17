import { addDays, daysBetween } from '../../common/time/local-date.js';
import { LEVEL_INTERVALS, MAX_LEVEL } from '../learning.constants.js';

// Pure schedule rules of design 6.1 (D16–D22). Dates are `YYYY-MM-DD` in the learner's time zone; only the two answers,
// "relearn" and removal change a schedule — never the passing of time (B3#5).

export type ItemState = { level: number; dueDate: string; priority: boolean };
// 'backlog': answered from the backlog (an "all" session); like 'early', it never counts against a cap (design 6.1).
export type Section = 'priority' | 'due' | 'new' | 'backlog' | 'early';
export type Answer = 'known' | 'review';
export type AnswerResult = { next: ItemState; section: Section; wasDue: boolean; rating: 'Good' | 'Again'; changed: boolean };

export function newItem(today: string): ItemState {
  return { level: 0, dueDate: today, priority: false };
}

/** "Học lại" from the backlog: back to level 0, counted as a new word. */
export function relearn(today: string): ItemState {
  return newItem(today);
}

export function sectionOf(state: ItemState, today: string, backlogDays: number): Section {
  // The backlog wins over the priority flag (D48): a flagged word left alone for too long stops being "priority".
  if (isBacklog(state, today, backlogDays)) return 'backlog';
  if (state.priority) return 'priority';
  if (state.level === 0) return 'new';
  return state.dueDate <= today ? 'due' : 'early';
}

export function applyAnswer(state: ItemState, answer: Answer, today: string, backlogDays: number): AnswerResult {
  const section = sectionOf(state, today, backlogDays);
  // A level-0 word is always due, even when its date is "tomorrow" after the zone moved west (M2, design 6.2).
  const wasDue = state.priority || state.level === 0 || state.dueDate <= today;
  let next: ItemState;
  if (answer === 'review') {
    next = { level: 1, dueDate: today, priority: true };
  } else if (wasDue) {
    const level = Math.min(state.level + 1, MAX_LEVEL);
    next = { level, dueDate: addDays(today, LEVEL_INTERVALS[level - 1]), priority: false };
  } else {
    // Known before it is due (an "all" session): nothing changes.
    next = state;
  }
  const changed = next.level !== state.level || next.dueDate !== state.dueDate || next.priority !== state.priority;
  return { next, section, wasDue, rating: answer === 'known' ? 'Good' : 'Again', changed };
}

/** Level ≥ 1 and overdue by more than `backlogDays`; a level-0 word never is, however old (D22). */
export function isBacklog(state: ItemState, today: string, backlogDays: number): boolean {
  return state.level >= 1 && daysBetween(state.dueDate, today) > backlogDays;
}
