'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useWordCycle } from '@/lib/word-cycle';
import { TypingBlank } from '@/ui/TypingBlank';
import { useMotionAllowed, whileInView } from '../interactive/motion';
import { fill, type LandingCopy } from './copy';
import { Marked, Progress, WaveBars } from './parts';
import { TEXT_17 } from './styles';

/**
 * The hero's word card and practice card (F.18, D5): five words typed into the blank in turn. The server HTML is the final frame of the
 * first word (typed, green, "Đúng · lên Bậc 3"). With motion allowed the cycle continues from that frame while the stage is on screen;
 * off screen, with reduced motion and without JS it stands still. The footer's motion switch (T10, QA7) stops it on the final frame of
 * the word it was on, and turning motion on again goes on from there.
 */
export function HeroCycle({ copy }: { copy: LandingCopy['stage'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return whileInView(el, setVisible);
  }, []);
  const motion = allowed && visible;

  const cycle = useWordCycle({ lengths: copy.cycle.map((c) => c.lemma.length), motion, start: 'final' });
  const current = cycle.k % copy.cycle.length;
  // Stopped by the switch: the word it was on, typed and answered (review focus 3 of Part 12), never a half-typed word.
  const step = allowed ? cycle : { ...cycle, typed: copy.cycle[current].lemma.length, phase: 'done' as const };
  const word = copy.cycle[current];
  const first = copy.cycle[0];
  const swap = step.k > 0 && 'animate-wm-showcase-swap';

  return (
    <div ref={ref} data-hero-stage className="flex flex-col gap-3 lg:flex-row lg:gap-4.5">
      <div className="flex flex-col gap-3 rounded-wm-row bg-wm-bg p-4.5 text-left lg:w-107.5 lg:shrink-0">
        <p aria-hidden className="font-wm-sans text-wm-label text-wm-muted">{fill(copy.cardLabel, { days: word.days })}</p>
        {/* One static copy for assistive tech: the mitigate frame. The cycling layer below is aria-hidden. */}
        <div className="sr-only">
          <p>{first.lemma}</p>
          <p>
            {first.pos} · {first.ipa}
          </p>
          <p>
            {first.definition} · {first.meaning}
          </p>
          <p>
            {first.before}
            {first.lemma}
            {first.after}
          </p>
        </div>
        {/* All five frames share one grid cell, so the card keeps the height of the tallest word. */}
        <div aria-hidden className="grid">
          {copy.cycle.map((w, i) => (
            <div
              key={w.lemma}
              className={cn('col-start-1 row-start-1 flex flex-col gap-3', i !== current ? 'invisible' : swap)}
            >
              <p className="font-wm-display text-wm-lemma text-wm-ink">{w.lemma}</p>
              <p className="flex items-center gap-2.5 font-wm-sans text-wm-base text-wm-muted">
                {w.pos} · {w.ipa}
                <WaveBars />
              </p>
              <p className={cn(TEXT_17, 'text-wm-ink')}>
                {w.definition}
                <span className="text-wm-muted md:hidden"> · {w.meaning}</span>
              </p>
              <p className="hidden font-wm-sans text-wm-button font-normal text-wm-muted md:block">{w.meaning}</p>
              <p className="rounded-wm-control bg-wm-surface p-3 font-wm-sans text-wm-base text-wm-ink">
                <Marked sentence={w.example} target={w.lemma} />
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-wm-row bg-wm-bg p-4.5 text-left">
        <p className="flex justify-between gap-3 font-wm-sans text-wm-caption text-wm-muted">
          <span>{copy.practiceTitle}</span>
          <span>{copy.practiceCount}</span>
        </p>
        <Progress done={3} total={16} />
        <div aria-hidden className="grid min-h-15 font-wm-sans text-wm-lead text-wm-ink">
          {copy.cycle.map((w, i) => (
            <p key={w.lemma} className={cn('col-start-1 row-start-1', i !== current ? 'invisible' : swap)}>
              {w.before}
              {i === current ? (
                <TypingBlank word={w.lemma} typed={step.typed} done={step.phase === 'done'} motion={motion} />
              ) : (
                <TypingBlank word={w.lemma} typed={w.lemma.length} done motion={false} />
              )}
              {w.after}
            </p>
          ))}
        </div>
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
