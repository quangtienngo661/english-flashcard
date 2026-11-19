'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { carouselSlots } from '@/lib/group-carousel';
import { cn } from '@/lib/cn';
import { groupToneAt } from '@/lib/group-color';
import { motionAllowed, whileInView } from '../interactive/motion';
import { fill, type LandingCopy } from './copy';
import { topicSlot } from './topic-arc';

export const AUTO_MS = 3500;
const SWIPE_PX = 40;
const DECK_COLOURS = [6, 0, 2, 1, 5];
const ARROW = 'flex size-11 items-center justify-center rounded-full border border-wm-line bg-wm-surface text-wm-ink hover:border-wm-accent focus-visible:outline-wm-accent';

function subscribeToResize(change: () => void) {
  window.addEventListener('resize', change);
  return () => window.removeEventListener('resize', change);
}

function getViewportWidth() {
  return document.documentElement.clientWidth || 1440;
}

function wrap(index: number, count: number) {
  return ((index % count) + count) % count;
}

export function TopicCarousel({ copy }: { copy: LandingCopy['groups'] }) {
  const count = copy.topics.length;
  const [centre, setCentre] = useState(0);
  const [manual, setManual] = useState(false);
  const viewportWidth = useSyncExternalStore(subscribeToResize, getViewportWidth, () => 1440);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const previousSlots = useRef(new Map<string, number>());
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const topic = copy.topics[centre];

  useEffect(() => {
    const root = rootRef.current;
    if (!root || manual || count < 2) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let inView = false;
    let hovered = !!window.matchMedia?.('(hover: hover)').matches && root.matches(':hover');
    let focused = root.contains(document.activeElement);
    let timer = 0;

    const canAdvance = () => inView && !document.hidden && !hovered && !focused && motionAllowed();
    const updateTimer = () => {
      window.clearInterval(timer);
      if (canAdvance()) {
        timer = window.setInterval(() => {
          if (canAdvance()) setCentre((index) => wrap(index + 1, count));
        }, AUTO_MS);
      }
    };

    const updatePointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      hovered = event.type === 'pointerenter';
      updateTimer();
    };

    const updateFocus = (event: FocusEvent) => {
      const inside = event.type === 'focusin' || (event.relatedTarget instanceof Node && root.contains(event.relatedTarget));
      if (inside === focused) return;
      focused = inside;
      updateTimer();
    };

    const stopWatching = whileInView(root, (visible) => {
      if (visible === inView) return;
      inView = visible;
      updateTimer();
    });
    root.addEventListener('pointerenter', updatePointer);
    root.addEventListener('pointerleave', updatePointer);
    root.addEventListener('focusin', updateFocus);
    root.addEventListener('focusout', updateFocus);
    document.addEventListener('visibilitychange', updateTimer);
    reducedMotion?.addEventListener('change', updateTimer);
    return () => {
      stopWatching();
      window.clearInterval(timer);
      root.removeEventListener('pointerenter', updatePointer);
      root.removeEventListener('pointerleave', updatePointer);
      root.removeEventListener('focusin', updateFocus);
      root.removeEventListener('focusout', updateFocus);
      document.removeEventListener('visibilitychange', updateTimer);
      reducedMotion?.removeEventListener('change', updateTimer);
    };
  }, [count, manual]);

  // Like GroupCarousel, a deck wrapping between the two ends of the arc jumps
  // to its new slot before paint instead of crossing over the centre.
  useLayoutEffect(() => {
    const nextSlots = new Map<string, number>();
    trackRef.current?.querySelectorAll<HTMLElement>('[data-topic]').forEach((slot) => {
      const name = slot.dataset.topic!;
      const position = Number(slot.dataset.k);
      const previous = previousSlots.current.get(name);
      nextSlots.set(name, position);
      if (previous === undefined || Math.abs(previous - position) <= 3) return;
      slot.style.transition = 'none';
      void slot.offsetWidth;
      slot.style.removeProperty('transition');
    });
    previousSlots.current = nextSlots;
  }, [centre]);

  function step(amount: number) {
    setManual(true);
    setCentre((index) => wrap(index + amount, count));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    swiped.current = false;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    pointer.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) <= Math.max(SWIPE_PX, Math.abs(dy))) return;
    swiped.current = true;
    step(dx < 0 ? 1 : -1);
  }

  function onTrackClick(event: MouseEvent<HTMLDivElement>) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    const direct = (event.target as Element).closest<HTMLElement>('[data-k]');
    if (direct) {
      const k = Number(direct.dataset.k);
      if (k !== 0) step(k);
      return;
    }

    // The browser retargets presses on inert neighbours to the track. Find
    // the closest visible slot under the pointer using its transformed bounds.
    let hit = 0;
    for (const slot of event.currentTarget.querySelectorAll<HTMLElement>('[data-k]')) {
      const k = Number(slot.dataset.k);
      if (k === 0 || (hit !== 0 && Math.abs(hit) <= Math.abs(k))) continue;
      const { left, right, top, bottom } = slot.getBoundingClientRect();
      if (event.clientX >= left && event.clientX < right && event.clientY >= top && event.clientY < bottom) hit = k;
    }
    if (hit !== 0) step(hit);
  }

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={copy.label}
      className="relative left-1/2 w-screen -translate-x-1/2 self-start"
    >
      <div
        ref={trackRef}
        className="wm-topic-track touch-pan-y select-none"
        onClick={onTrackClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { pointer.current = null; }}
      >
        {carouselSlots(count, centre).map(({ index, k }) => {
          const deck = copy.topics[index];
          const tone = groupToneAt(DECK_COLOURS[index]);
          const arc = topicSlot(k, viewportWidth);
          const side = k !== 0;
          return (
            <div
              key={deck.name}
              className="gcar-slot"
              data-topic={deck.name}
              data-k={k}
              data-abs={Math.abs(k)}
              inert={side || undefined}
              aria-hidden={side || undefined}
              // raw-ok: these numeric arc coordinates feed the shared .gcar-slot transform.
              style={{ '--x': arc.x, '--xp': arc.x, '--y': arc.y, '--r': arc.rotate, '--s': arc.scale, '--o': arc.opacity, '--z': arc.z } as CSSProperties}
            >
              <div className="gstack" data-size="carousel" data-layers="2">
                {[2, 1].map((layer) => (
                  <div key={layer} aria-hidden data-behind={layer} className={cn('gstack-behind rounded-wm-dialog', tone.soft)} />
                ))}
                <div className={cn('gstack-face rounded-wm-dialog', tone.border)}>
                  <p className="gstack-meta">{fill(copy.words, { count: deck.total })}</p>
                  <p className="gstack-name">{deck.name}</p>
                  {side ? <div className="gstack-grow" /> : (
                    <ul className="wm-topic-words">
                      {deck.words.map((word, i) => (
                        <li
                          key={word}
                          className={cn(tone.wash, tone.ink)}
                          // raw-ok: the index staggers the chip entrance in CSS.
                          style={{ '--i': i } as CSSProperties}
                        >
                          {word}
                        </li>
                      ))}
                      <li
                        className="border border-wm-line text-wm-muted"
                        // raw-ok: the count chip enters after the sample words.
                        style={{ '--i': deck.words.length } as CSSProperties}
                      >
                        {fill(copy.more, { count: deck.total - deck.words.length })}
                      </li>
                    </ul>
                  )}
                  <p className="gstack-foot">{copy.start} <b>{deck.words[0]}</b></p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-center font-wm-sans text-wm-base text-wm-ink">
        {copy.kind} · <span className="text-wm-muted">{topic.level}</span>
      </p>
      <div className="mt-3 flex items-center justify-center gap-4">
        <button type="button" className={ARROW} aria-label={copy.prev} onClick={() => step(-1)}>
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <div aria-hidden className="flex items-center gap-2">
          {copy.topics.map((deck, index) => (
            <span key={deck.name} className={cn('h-1.75 rounded-full', index === centre ? 'w-5.5 bg-wm-accent' : 'w-1.75 bg-wm-line')} />
          ))}
        </div>
        <button type="button" className={ARROW} aria-label={copy.next} onClick={() => step(1)}>
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>
      <p aria-live="polite" className="sr-only">{manual && topic.name}</p>
    </div>
  );
}
