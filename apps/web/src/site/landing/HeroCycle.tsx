'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useWordCycle } from '@/lib/word-cycle';
import { TypingBlank } from '@/ui/TypingBlank';
import { motionAllowed, whileInView } from '../interactive/motion';
import { fill, type LandingCopy } from './copy';
import { Marked, Progress, WaveBars } from './parts';
import { TEXT_17 } from './styles';

/**
 * The hero's word card and practice card (F.18, D5): five words typed into the blank in turn. The server HTML is the final frame of the
 * first word (typed, green, "Đúng · lên Bậc 3"). With motion allowed the cycle continues from that frame while the stage is on screen;
 * off screen, with reduced motion and without JS it stands still.
 */
export function HeroCycle({ copy }: { copy: LandingCopy['stage'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motionAllowed()) return;
    return whileInView(el, setMotion);
  }, []);

  const step = useWordCycle({ lengths: copy.cycle.map((c) => c.lemma.length), motion, start: 'final' });
  const word = copy.cycle[step.k % copy.cycle.length];
  const swap = motion && step.k > 0 && 'animate-wm-showcase-swap';

  return (
    <div ref={ref} className="flex flex-col gap-3 lg:flex-row lg:gap-4.5">
      <div className="flex flex-col gap-3 rounded-wm-row bg-wm-bg p-4.5 text-left lg:w-107.5 lg:shrink-0">
        <p className="font-wm-sans text-wm-label text-wm-muted">{fill(copy.cardLabel, { days: word.days })}</p>
        <div key={step.k} className={cn('flex flex-col gap-3', swap)}>
          <p className="font-wm-display text-wm-lemma text-wm-ink">{word.lemma}</p>
          <p className="flex items-center gap-2.5 font-wm-sans text-wm-base text-wm-muted">
            {word.pos} · {word.ipa}
            <WaveBars />
          </p>
          <p className={cn(TEXT_17, 'text-wm-ink')}>
            {word.definition}
            <span className="text-wm-muted md:hidden"> · {word.meaning}</span>
          </p>
          <p className="hidden font-wm-sans text-wm-button font-normal text-wm-muted md:block">{word.meaning}</p>
          <p className="rounded-wm-control bg-wm-surface p-3 font-wm-sans text-wm-base text-wm-ink">
            <Marked sentence={word.example} target={word.lemma} />
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-wm-row bg-wm-bg p-4.5 text-left">
        <p className="flex justify-between gap-3 font-wm-sans text-wm-caption text-wm-muted">
          <span>{copy.practiceTitle}</span>
          <span>{copy.practiceCount}</span>
        </p>
        <Progress done={3} total={16} />
        <p key={step.k} className={cn('min-h-15 font-wm-sans text-wm-lead text-wm-ink', swap)}>
          {word.before}
          <TypingBlank word={word.lemma} typed={step.typed} done={step.phase === 'done'} motion={motion} />
          {word.after}
        </p>
        <p className="flex min-h-6 items-center gap-2 font-wm-sans text-wm-caption text-wm-muted">
          {step.phase === 'enter' && (
            <kbd className="rounded-wm-key border border-wm-line bg-wm-surface px-1.5 font-wm-sans text-wm-meta text-wm-muted">Enter</kbd>
          )}
          {step.phase === 'done' && (
            <span className="inline-flex items-center gap-1 text-wm-small-strong text-wm-pass">
              <Check aria-hidden className="size-4" strokeWidth={2.5} />
              {fill(copy.result, { level: word.level })}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
