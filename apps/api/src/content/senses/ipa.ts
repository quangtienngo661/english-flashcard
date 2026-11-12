/** The longest IPA string a sense or a private word may hold (`varchar(100)` in the database). */
export const IPA_MAX_LENGTH = 100;

/** Letters of the Latin script that IPA also uses beyond a–z and the IPA Extensions block. */
const EXTRA_LETTERS = new Set('æðθŋʃʒɡçøœ');
/** Stress, length, syllable and group marks, linking, a comma, a space. */
const MARKS = new Set('ˈˌːˑ.()‿, ');

/**
 * What a transcription is written as: without the `/…/` or `[…]` around it, trimmed and in NFC. The pages put the slashes back,
 * so the stored value never carries them.
 */
export function normalizeIpa(value: string): string {
  return value.normalize('NFC').trim().replace(/^[/[\]\s]+|[/[\]\s]+$/g, '').normalize('NFC');
}

/** Whether `value` (already normalised) is made only of characters a UK or US transcription uses; else the first that is not. */
export function checkIpa(value: string): { ok: true } | { ok: false; char: string } {
  for (const char of value) {
    const code = char.codePointAt(0)!;
    const allowed = (code >= 0x61 && code <= 0x7a) // a–z
      || (code >= 0x250 && code <= 0x2af) // IPA Extensions
      || (code >= 0x300 && code <= 0x36f) // combining marks, including the tie bar U+0361
      || EXTRA_LETTERS.has(char) || MARKS.has(char);
    if (!allowed) return { ok: false, char };
  }
  return { ok: true };
}
