/** `WordSense.pronunciation` (đợt C H9): IPA without slashes, and the pre-made files when they are ready. */
export type Pronunciation = {
  uk: string | null;
  us: string | null;
  custom: string | null;
  audio: { uk: string | null; us: string | null };
};
export type PronLine = { scope: 'catalog' | 'private'; pronunciation: Pronunciation };
type SenseLike = { sense_id: string; scope: 'catalog' | 'private'; pronunciation?: Pronunciation | null };

export const NO_PRONUNCIATION: Pronunciation = { uk: null, us: null, custom: null, audio: { uk: null, us: null } };

const lineOf = (sense: SenseLike): PronLine => ({ scope: sense.scope, pronunciation: sense.pronunciation ?? NO_PRONUNCIATION });
const sameReading = (a: PronLine, b: PronLine) =>
  a.scope === b.scope && a.pronunciation.uk === b.pronunciation.uk && a.pronunciation.us === b.pronunciation.us && a.pronunciation.custom === b.pronunciation.custom;

/**
 * Cambridge style (đợt C §5.3, DC13): a part-of-speech block shows its first sense's reading under the word; a sense read otherwise
 * (`lead` the metal) shows its own line under its meaning.
 */
export function blockPronunciation(senses: SenseLike[]): { shared: PronLine | null; perSense: Map<string, PronLine> } {
  const perSense = new Map<string, PronLine>();
  if (senses.length === 0) return { shared: null, perSense };
  const shared = lineOf(senses[0]);
  for (const sense of senses.slice(1)) {
    const line = lineOf(sense);
    if (!sameReading(line, shared)) perSense.set(sense.sense_id, line);
  }
  return { shared, perSense };
}
