import type { ReactNode } from 'react';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Marks the word (and a simple inflection of it: deploy → deployed, deploys) inside a sentence, case-insensitive (D3 of the
 * mockup round: the saved sentence shows the word highlighted). Plain text when the word is not found.
 */
export function highlightWord(sentence: string, word: string, forms: string[] = []): ReactNode {
  const words = [word, ...forms].filter(Boolean).sort((a, b) => b.length - a.length).map(escape);
  if (words.length === 0) return sentence;
  const pattern = new RegExp(`\\b(${words.join('|')})[a-z]*\\b`, 'i');
  const match = pattern.exec(sentence);
  if (!match) return sentence;
  return (
    <>
      {sentence.slice(0, match.index)}
      <mark className="rounded-xs bg-highlight px-0.5 text-ink">{match[0]}</mark>
      {sentence.slice(match.index + match[0].length)}
    </>
  );
}
