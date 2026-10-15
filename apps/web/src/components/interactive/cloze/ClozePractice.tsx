'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { flyInto } from '@/lib/fly-into';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { ClozeCard } from './ClozeCard';
import { clozeReducer, createClozeState } from './cloze-state';

export type ClozeItem = {
  id: string;
  before: string;
  answer: string;
  after: string;
  options: [string, string, string, string];
  hint: string;
  explanation: string;
  translation: string;
};

export type ClozeLabels = {
  headers: string[];
  sourceChip: string;
  instruction: string;
  correctTitle: string;
  wrongTitle: string;
  nextSentence: string;
  doneTitle: string;
  doneBody: string;
  doneCta: string;
  replay: string;
  region: string;
};

type ClozePracticeProps = { items: ClozeItem[]; labels: ClozeLabels; ctaHref: string };

// Read from the shared tokens so CSS and JS motion agree; the fallbacks are the token values (design §4.4).
function flightTiming() {
  const style = getComputedStyle(document.documentElement);
  const duration = parseFloat(style.getPropertyValue('--transition-duration-slow'));
  const easing = style.getPropertyValue('--ease-spring').trim();
  return { durationMs: duration > 0 ? duration : 400, easing: easing || 'cubic-bezier(0.34, 1.56, 0.64, 1)' };
}

// One practice card (design UB6, §5.2): wrong stickers wiggle and lock, the right one flies into the gap.
export function ClozePractice({ items, labels, ctaHref }: ClozePracticeProps) {
  const [state, dispatch] = useReducer(clozeReducer, items, (list) => createClozeState(list.map((i) => i.answer)));
  const reduced = useReducedMotion();
  const [landed, setLanded] = useState(false);
  // Counts next/replay presses; focus follows a move, never the first render.
  const [moves, setMoves] = useState(0);
  const slotRef = useRef<HTMLSpanElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const focusRef = useRef<HTMLParagraphElement>(null);
  const cancelFlight = useRef<(() => void) | null>(null);

  const item = items[state.index];
  const result = state.results[state.index];

  // The copy flies outside the React tree, so unmounting (e.g. switching language) must remove it (RF3).
  useEffect(() => () => cancelFlight.current?.(), []);

  useEffect(() => {
    if (result.status === 'correct') nextRef.current?.focus();
  }, [result.status, state.index]);

  // The pressed button unmounts on next/replay; move focus to the new sentence or the Done title (2.4.3).
  useEffect(() => {
    if (moves > 0) focusRef.current?.focus();
  }, [moves]);

  function pick(word: string, sticker: HTMLElement) {
    if (state.done || result.status === 'correct' || result.tried.includes(word)) return;
    dispatch({ type: 'pick', word });
    if (word !== item.answer) return;
    const slot = slotRef.current;
    // The Web Animations API ignores the CSS reduced-motion rule, so check it here (UBE1).
    if (reduced || !slot) {
      setLanded(true);
      return;
    }
    cancelFlight.current = flyInto(sticker, slot, {
      ...flightTiming(),
      onLand: () => {
        cancelFlight.current = null;
        setLanded(true);
      },
    });
  }

  function move(type: 'next' | 'restart') {
    cancelFlight.current?.();
    cancelFlight.current = null;
    setLanded(false);
    dispatch({ type });
    setMoves((n) => n + 1);
  }

  const announcement =
    result.status === 'wrong'
      ? `${labels.wrongTitle} ${item.hint}`
      : result.status === 'correct'
        ? `${labels.correctTitle} ${item.explanation}`
        : '';

  return (
    <section aria-label={labels.region} className="w-full max-w-practice">
      <p data-testid="cloze-live" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ClozeCard
        item={item}
        header={labels.headers[state.index]}
        labels={labels}
        result={result}
        done={state.done}
        landed={landed}
        progress={state.results.map((r) => r.status === 'correct')}
        ctaHref={ctaHref}
        slotRef={slotRef}
        nextRef={nextRef}
        focusRef={focusRef}
        onPick={pick}
        onNext={() => move('next')}
        onReplay={() => move('restart')}
      />
    </section>
  );
}
