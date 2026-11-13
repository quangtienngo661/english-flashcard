import type { ReactNode } from 'react';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Finds the learned word in a sentence (Part 10 P.4): first the lemma or one of its `forms` as a whole word ("went" for go), case-insensitive;
 * else a word that starts with the lemma or with the lemma less a final e ("mitigated", "making" for make). Null when nothing matches.
 */
export function findTarget(text: string, lemma: string, forms: string[] = []): { index: number; length: number } | null {
  const words = [lemma, ...forms].map((w) => w.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  if (words.length === 0) return null;
  const whole = new RegExp(`\\b(?:${words.map(escape).join('|')})\\b`, 'i').exec(text);
  if (whole) return { index: whole.index, length: whole[0].length };
  const stems = words.map((w) => (w.length > 3 && /e$/i.test(w) ? w.slice(0, -1) : w));
  const start = new RegExp(`\\b(?:${[...words, ...stems].map(escape).join('|')})[a-z]*\\b`, 'i').exec(text);
  return start ? { index: start.index, length: start[0].length } : null;
}

/** An example sentence with the learned word in bold, underlined 2 px in accent (mockup L136). Plain text when the word is not found. */
export function TargetWord({ text, lemma, forms }: { text: string; lemma: string; forms?: string[] }): ReactNode {
  const hit = findTarget(text, lemma, forms);
  if (!hit) return text;
  return (
    <>
      {text.slice(0, hit.index)}
      <strong className="font-bold underline decoration-wm-accent decoration-2 underline-offset-3">{text.slice(hit.index, hit.index + hit.length)}</strong>
      {text.slice(hit.index + hit.length)}
    </>
  );
}
