// Distractor candidates (design 7.4): the words of the learner's groups that hold the asked word, filtered here.

/** A sense as the question builder sees it (mapped from Content's PracticeSense in Task 13). */
export type QuestionWord = {
  sense_id: string;
  entry_id: string;
  scope: 'catalog' | 'private';
  lemma: string;
  gloss_vi: string | null;
  definition_en: string | null;
  form_of_entry_id: string | null;
  function_word: boolean;
};

/** Sub-meanings of a meaning: split on , and ;, ( … ) parts dropped, NFC, lower case, trimmed, empties dropped. */
export function subsenses(text: string): string[] {
  return text
    .replace(/\([^)]*\)/g, '')
    .split(/[,;]/)
    .map((part) => part.normalize('NFC').toLowerCase().trim())
    .filter((part) => part.length > 0);
}

function shareSubsense(a: string, b: string): boolean {
  const left = new Set(subsenses(a));
  return subsenses(b).some((part) => left.has(part));
}

type Meaning = { gloss_vi: string | null; definition_en: string | null };

/** Every visible meaning of a lemma (key: lower-cased lemma), so a second sense that also means the asked thing counts. */
export type LemmaMeanings = Map<string, Meaning[]>;

/** Compared on gloss_vi when both have one, else on definition_en when both have one, else kept (R13). */
function sameMeaning(asked: Meaning, candidate: Meaning): boolean {
  if (asked.gloss_vi !== null && candidate.gloss_vi !== null) return shareSubsense(asked.gloss_vi, candidate.gloss_vi);
  if (asked.definition_en !== null && candidate.definition_en !== null) {
    return shareSubsense(asked.definition_en, candidate.definition_en);
  }
  return false;
}

/**
 * Drops the asked sense, the same lemma (case-insensitive), form-of links either way and a shared sub-meaning (of the sense
 * itself or of any other visible sense of either lemma, `meanings`); then keeps
 * one candidate per lower-cased lemma. Stops once `limit` are found (availability only needs to know "enough").
 */
export function eligibleCandidates<T extends QuestionWord>(
  asked: QuestionWord, candidates: T[], limit = Infinity, meanings: LemmaMeanings = new Map(),
): T[] {
  const askedLemma = asked.lemma.toLowerCase();
  const askedMeanings = meanings.get(askedLemma) ?? [];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const candidate of candidates) {
    if (result.length >= limit) break;
    const lemma = candidate.lemma.toLowerCase();
    if (candidate.sense_id === asked.sense_id || lemma === askedLemma) continue;
    if (candidate.form_of_entry_id === asked.entry_id || asked.form_of_entry_id === candidate.entry_id) continue;
    if (sameMeaning(asked, candidate) || seen.has(lemma)) continue;
    // Another sense of either word may also be a right answer (T6/FE25), even outside the learner's group.
    if ((meanings.get(lemma) ?? []).some((m) => sameMeaning(asked, m))) continue;
    if (askedMeanings.some((m) => sameMeaning(m, candidate))) continue;
    seen.add(lemma);
    result.push(candidate);
  }
  return result;
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** `count` distinct candidates, preferring sense ids not in `avoid` (round ≥ 2); null when fewer than `count` exist. */
export function pickDistractors<T extends QuestionWord>(
  eligible: T[], count: number, avoid: string[], random: () => number,
): T[] | null {
  if (eligible.length < count) return null;
  const avoided = new Set(avoid);
  const fresh = shuffle(eligible.filter((w) => !avoided.has(w.sense_id)), random);
  const used = shuffle(eligible.filter((w) => avoided.has(w.sense_id)), random);
  return [...fresh, ...used].slice(0, count);
}
