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

/** Cards waiting today in a deck (priority + due + new, already capped by the API). */
export const waiting = (g: GroupSummary) => g.today.priority + g.today.due + g.today.new;

/** K/10 order: decks with cards waiting first, then decks with priority cards, then most cards waiting, then by name. */
export function sortForToday(groups: GroupSummary[]): GroupSummary[] {
  return [...groups].sort(
    (a, b) =>
      Number(waiting(b) > 0) - Number(waiting(a) > 0) ||
      Number(b.today.priority > 0) - Number(a.today.priority > 0) ||
      waiting(b) - waiting(a) ||
      a.name.localeCompare(b.name),
  );
}
