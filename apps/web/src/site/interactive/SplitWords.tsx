import type { CSSProperties, ReactNode } from 'react';
import { Reveal } from './Reveal';

/** A run of text (with the class its words carry, e.g. the hero's accent) or a `<br>` with its class. */
export type SplitSegment = { text: string; className?: string } | { br: string };

/**
 * A title that comes in word by word (M8.6 "Words": opacity 650 ms, blur 12 → 0 and `.3em` → 0 in 800 ms, 60 ms apart). Screen readers
 * read one `sr-only` copy of the sentence; the word spans are `aria-hidden`, so the heading's name stays the exact sentence.
 */
export function SplitWords({
  as,
  id,
  segments,
  trigger = 'view',
  delay,
  className,
}: {
  as: 'h1' | 'h2';
  id?: string;
  segments: SplitSegment[];
  trigger?: 'load' | 'view';
  delay?: number;
  className?: string;
}) {
  const sentence = segments
    .map((s) => ('text' in s ? s.text : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  let i = 0;
  const words: ReactNode[] = [];
  segments.forEach((segment, s) => {
    if ('br' in segment) {
      words.push(<br key={`br${s}`} className={segment.br} />);
      return;
    }
    segment.text.split(/(\s+)/).forEach((part, p) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        words.push(' ');
        return;
      }
      words.push(
        <span
          key={`${s}-${p}`}
          data-wm-word=""
          className={segment.className}
          // raw-ok: the word's place in the stagger (the CSS multiplies it by 60 ms)
          style={{ '--wm-i': i++ } as CSSProperties}
        >
          {part}
        </span>,
      );
    });
  });
  return (
    <Reveal as={as} kind="words" trigger={trigger} delay={delay} id={id} className={className}>
      <span className="sr-only">{sentence}</span>
      <span aria-hidden="true">{words}</span>
    </Reveal>
  );
}
