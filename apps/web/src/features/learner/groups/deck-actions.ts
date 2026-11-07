import type { GroupSummary } from './groups-api';

/**
 * What a deck offers today (design đợt C §4.1, DC25). `learn`: flashcards over the new words (`new`) or over every word (`all`,
 * when no new word is left today). `recall`: the recall quiz over due words (`due`) or, with nothing due, over learned words as
 * extra practice (`extra`, "Ôn tập"). `primary` is the action with work waiting; a deck done for today has none.
 */
export type DeckPlan = {
  learn: 'new' | 'all' | null;
  recall: 'due' | 'extra' | null;
  primary: 'learn' | 'recall' | null;
  doneToday: boolean;
};

export function deckPlan(group: GroupSummary): DeckPlan {
  if (group.total === 0) return { learn: null, recall: null, primary: null, doneToday: false };
  const due = group.today.priority + group.today.due;
  const fresh = group.today.new;
  const learned = group.total - (group.cells[0]?.total ?? 0) > 0;
  if (due > 0) return { learn: fresh > 0 ? 'new' : 'all', recall: 'due', primary: 'recall', doneToday: false };
  if (fresh > 0) return { learn: 'new', recall: learned ? 'extra' : null, primary: 'learn', doneToday: false };
  return learned ? { learn: null, recall: 'extra', primary: null, doneToday: true } : { learn: 'all', recall: null, primary: null, doneToday: true };
}

/** Words at level 4 or 5: answered right at the 7-day review (DC11). */
export const mastered = (group: GroupSummary) => (group.cells[4]?.total ?? 0) + (group.cells[5]?.total ?? 0);
