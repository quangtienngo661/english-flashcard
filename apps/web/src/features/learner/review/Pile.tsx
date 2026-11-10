'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { bump, chipIn } from '@/lib/stack-motion';
import { cn } from '@/lib/cn';
import { WordChip } from '@/ui/WordChip';

const SHOWN = 5;

/**
 * One pile beside the Học stack (prototype chong-the-mo.html:149-151, 385-392): its count in large type, its name, and the last five
 * words, newest on top. A new word slides in, the count bumps.
 */
export function Pile({ tone, label, words, className }: { tone: 'review' | 'known'; label: string; words: string[]; className?: string }) {
  const countRef = useRef<HTMLSpanElement>(null);
  const seen = useRef(words.length);
  useEffect(() => {
    if (words.length > seen.current && countRef.current) void bump(countRef.current);
    seen.current = words.length;
  }, [words.length]);
  const shown = words.slice(-SHOWN).reverse();
  const Icon = tone === 'review' ? ChevronLeft : ChevronRight;
  return (
    <section
      aria-label={label}
      className={cn('flex min-w-0 flex-col gap-2', tone === 'known' && 'md:items-end md:text-right', className)}
    >
      <p className={cn('flex items-center gap-1 font-wm-sans text-wm-small-strong', tone === 'review' ? 'text-wm-fail' : 'text-wm-pass md:flex-row-reverse')}>
        <Icon aria-hidden className="size-4" />
        {label}
      </p>
      <span ref={countRef} className={cn('inline-block font-wm-display text-wm-lemma', tone === 'review' ? 'text-wm-fail' : 'text-wm-pass')}>
        {words.length}
      </span>
      <ul className={cn('flex flex-col gap-1.5', tone === 'known' && 'md:items-end')}>
        {shown.map((word, i) => (
          // Keyed by the word's place in the whole pile, so older chips keep their element and only the new one slides in.
          <PileChip key={words.length - 1 - i} word={word} tone={tone} fresh={i === 0} />
        ))}
      </ul>
    </section>
  );
}

function PileChip({ word, tone, fresh }: { word: string; tone: 'review' | 'known'; fresh: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (fresh && ref.current) void chipIn(ref.current);
    // Only when the chip first lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <li ref={ref} className="max-w-full">
      <WordChip word={word} tone={tone === 'review' ? 'review' : 'normal'} />
    </li>
  );
}
