// Typed answers (design 7.6): NFC, trim, one space for any whitespace run, curly quotes made straight, lower case.
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase();
}

/** Code points after NFC + trim: the length checked against ANSWER_MAX and NOTE_MAX. */
export function answerLength(text: string): number {
  return [...text.normalize('NFC').trim()].length;
}

/** Exact match after normalization; `accepted` is already normalized. Misspellings are wrong (no fuzzy match). */
export function matchesAnswer(typed: string, accepted: string[]): boolean {
  return accepted.includes(normalizeAnswer(typed));
}
