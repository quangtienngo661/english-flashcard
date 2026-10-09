'use client';

import { useCallback, useEffect, useReducer, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { ClozeCard } from './ClozeCard';
import { clozeReducer, createClozeState, type ClozeAction } from './cloze-state';

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
  prev: string;
  next: string;
  correctTitle: string;
  wrongTitle: string;
  nextSentence: string;
  doneTitle: string;
  doneBody: string;
  doneCta: string;
  replay: string;
  region: string;
};

type ClozeCarouselProps = { items: ClozeItem[]; labels: ClozeLabels; ctaHref: string };

type CardDrag = { pointerId: number; startX: number; scrollLeft: number; index: number; dragged: boolean };

function closestSlideIndex(track: HTMLDivElement, slides: Array<HTMLDivElement | null>, fallback: number) {
  const center = track.scrollLeft + track.clientWidth / 2;
  let closest = fallback;
  let distance = Infinity;
  slides.forEach((slide, index) => {
    if (!slide) return;
    const nextDistance = Math.abs(slide.offsetLeft + slide.clientWidth / 2 - center);
    if (nextDistance < distance) {
      closest = index;
      distance = nextDistance;
    }
  });
  return closest;
}

export function ClozeCarousel({ items, labels, ctaHref }: ClozeCarouselProps) {
  const [state, dispatch] = useReducer(clozeReducer, items, (list) => createClozeState(list.map((i) => i.answer)));
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragRef = useRef<CardDrag | null>(null);
  const suppressClickRef = useRef(false);
  const selectedIndexRef = useRef(state.index);
  const programmaticIndexRef = useRef<number | null>(null);
  const manualScrollingRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [gestureMotion, setGestureMotion] = useState(false);

  const syncScrolledIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const closest = closestSlideIndex(track, slideRefs.current, selectedIndexRef.current);
    if (closest === selectedIndexRef.current) return;
    selectedIndexRef.current = closest;
    dispatch({ type: 'goTo', index: closest });
  }, []);

  const settleScroll = useCallback(() => {
    if (dragRef.current?.dragged) return;
    programmaticIndexRef.current = null;
    syncScrolledIndex();
    manualScrollingRef.current = false;
    setGestureMotion(false);
  }, [syncScrolledIndex]);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    const slide = slideRefs.current[index];
    if (!track || !slide || typeof track.scrollTo !== 'function') return;
    const left = slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2;
    programmaticIndexRef.current = Math.abs(track.scrollLeft - left) > 1 ? index : null;
    track.scrollTo({ left, behavior: reduced ? 'instant' : 'smooth' });
  }, [reduced]);

  // Gestures highlight the nearest card immediately; only centering waits for release.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof track.scrollTo !== 'function') return;
    const centerActiveSlide = () => {
      if (manualScrollingRef.current || dragRef.current?.dragged) return;
      scrollToIndex(selectedIndexRef.current);
    };

    const onScroll = () => {
      clearTimeout(settleTimerRef.current);
      if (programmaticIndexRef.current === null) {
        manualScrollingRef.current = true;
        setGestureMotion(true);
        syncScrolledIndex();
      }
      settleTimerRef.current = setTimeout(settleScroll, 150);
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(centerActiveSlide);
    observer?.observe(track);
    centerActiveSlide();

    return () => {
      clearTimeout(settleTimerRef.current);
      track.removeEventListener('scroll', onScroll);
      observer?.disconnect();
    };
  }, [scrollToIndex, settleScroll, syncScrolledIndex]);

  function navigate(action: ClozeAction) {
    const next = clozeReducer(state, action);
    clearTimeout(settleTimerRef.current);
    selectedIndexRef.current = next.index;
    manualScrollingRef.current = false;
    setGestureMotion(false);
    dispatch(action);
    scrollToIndex(next.index);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    // Touch keeps native scrolling, including vertical page scrolling and momentum.
    if (!event.isPrimary || event.button !== 0) return;
    programmaticIndexRef.current = null;
    clearTimeout(settleTimerRef.current);
    if (event.pointerType === 'touch') return;
    const track = event.currentTarget;
    if (typeof track.scrollTo !== 'function') return;
    suppressClickRef.current = false;
    track.scrollTo({ left: track.scrollLeft, behavior: 'instant' });
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: track.scrollLeft, index: selectedIndexRef.current, dragged: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = event.clientX - drag.startX;
    if (!drag.dragged && Math.abs(delta) < 6) return;

    const track = event.currentTarget;
    if (!drag.dragged) {
      drag.dragged = true;
      manualScrollingRef.current = true;
      setGestureMotion(true);
      suppressClickRef.current = true;
      // Disable snapping synchronously so even the first movement follows the pointer.
      track.setAttribute('data-dragging', '');
      track.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    track.scrollLeft = drag.scrollLeft - delta;
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const track = event.currentTarget;
    let index = drag.index;
    if (drag.dragged && !cancelled) {
      index = closestSlideIndex(track, slideRefs.current, drag.index);
      const distance = track.scrollLeft - drag.scrollLeft;
      if (index === drag.index && Math.abs(distance) >= track.clientWidth * 0.2) {
        index += Math.sign(distance);
      }
      index = Math.min(Math.max(index, 0), items.length - 1);
    }

    dragRef.current = null;
    track.removeAttribute('data-dragging');
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    if (!drag.dragged) return;

    selectedIndexRef.current = index;
    manualScrollingRef.current = false;
    if (index !== state.index) dispatch({ type: 'goTo', index });
    scrollToIndex(index);
    clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(settleScroll, 150);
    track.parentElement?.focus({ preventScroll: true });
  }

  const result = state.results[state.index];
  const item = items[state.index];
  const announcement =
    result.status === 'wrong'
      ? `${labels.wrongTitle} ${item.hint}`
      : result.status === 'correct'
        ? `${labels.correctTitle} ${item.explanation}`
        : '';

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(event.key === 'ArrowRight' ? { type: 'goTo', index: state.index + 1 } : { type: 'prev' });
    }
  }

  const arrow =
    'absolute top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-ink shadow-control transition-colors duration-fast hover:bg-bg';

  return (
    <section
      aria-roledescription="carousel"
      aria-label={labels.region}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative w-full max-w-carousel rounded-feature"
    >
      <p data-testid="cloze-live" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onWheelCapture={(event) => {
          if (event.deltaX || event.shiftKey) programmaticIndexRef.current = null;
        }}
        onPointerLeave={(event) => {
          if (!dragRef.current?.dragged) finishDrag(event, true);
        }}
        onPointerUp={(event) => finishDrag(event)}
        onPointerCancel={(event) => finishDrag(event, true)}
        onLostPointerCapture={(event) => finishDrag(event, true)}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (!suppressClickRef.current || event.detail === 0) return;
          suppressClickRef.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        className="carousel-track relative flex cursor-grab snap-x snap-mandatory select-none items-start gap-3 overflow-x-auto py-2 data-dragging:cursor-grabbing data-dragging:snap-none"
      >
        {items.map((entry, i) => {
          const active = i === state.index;
          return (
            <div
              key={entry.id}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={labels.headers[i]}
              data-active={active}
              inert={!active}
              className={cn(
                'w-full shrink-0 snap-center',
                !reduced && cn('transition ease-out', gestureMotion ? 'duration-carousel-drag' : 'duration-carousel'),
                active ? 'scale-100 opacity-100' : 'scale-86 opacity-50',
              )}
            >
              <ClozeCard
                item={entry}
                header={labels.headers[i]}
                labels={labels}
                result={state.results[i]}
                done={active && state.done}
                ctaHref={ctaHref}
                onPick={(word) => dispatch({ type: 'pick', word })}
                onNext={() => navigate({ type: 'next' })}
                onReplay={() => navigate({ type: 'restart' })}
              />
            </div>
          );
        })}
      </div>

      <button type="button" aria-label={labels.prev} onClick={() => navigate({ type: 'prev' })} className={cn(arrow, 'left-1')}>
        <Icon name="chevron-left" />
      </button>
      <button
        type="button"
        aria-label={labels.next}
        onClick={() => navigate({ type: 'goTo', index: state.index + 1 })}
        className={cn(arrow, 'right-1')}
      >
        <Icon name="chevron-right" />
      </button>
    </section>
  );
}
