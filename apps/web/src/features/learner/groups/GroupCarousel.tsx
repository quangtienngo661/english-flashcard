'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useLayoutEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent, type Ref, type WheelEvent } from 'react';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { arcSlot, stepTo } from './carousel';
import { GroupStack } from './GroupStack';
import type { GroupSummary } from './groups-api';

/** Swipe distance and trackpad step that change the group (motion doc §3). */
const SWIPE_PX = 40;
const WHEEL_PX = 12;
const WHEEL_GAP_MS = 380;
/** A stack that moves further than this along the arc (it wrapped to the other end) jumps there with no transition (mockup L922-927). */
const JUMP_STEPS = 3;

/**
 * "Vòng cung" (mockup L466-499, L881-945; design §8.5): the centre stack on top, two neighbours each side down an arc, turned and
 * smaller (one each side reachable on phones), the rest hidden. The centre opens its group; a side stack is pressed to bring it to the
 * centre (owner 10/11/2026). Each slot carries its `arcSlot` numbers as custom properties; the transform, curve and glow live in
 * globals.css (`.gcar-*`), and `data-abs` (|k|) names its distance.
 */
export function GroupCarousel({
  groups,
  centre,
  onStep,
  centreRef,
  onOpen,
}: {
  groups: GroupSummary[];
  centre: number;
  onStep: (step: number) => void;
  centreRef?: Ref<HTMLDivElement>;
  onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const t = useTranslations('App.groups');
  const locale = useLocale();
  const pointerX = useRef<number | null>(null);
  const lastWheel = useRef(0);
  const swiped = useRef(false);
  const trackRef = useRef<HTMLElement>(null);
  const lastK = useRef(new Map<string, number>());
  const centreGroup = groups[centre];
  const glow = centreGroup ? groupTone(centreGroup.id, centreGroup.total) : null;

  // Mockup n2apply (L922-927): a stack whose place changes by more than three (it wrapped from one end of the arc to the other) gets
  // its new place with no transition, then its transition back, before the browser paints. Runs on every render, so a burst of
  // presses never leaves a stack between two places or without its transition.
  useLayoutEffect(() => {
    const seen = new Map<string, number>();
    trackRef.current?.querySelectorAll<HTMLElement>('[data-group]').forEach((slot) => {
      const id = slot.dataset.group ?? '';
      const k = Number(slot.dataset.k);
      const before = lastK.current.get(id);
      seen.set(id, k);
      if (before === undefined || Math.abs(k - before) <= JUMP_STEPS) return;
      slot.style.transition = 'none';
      void slot.offsetWidth;
      slot.style.transition = '';
    });
    lastK.current = seen;
  });

  function onPointerDown(event: PointerEvent) {
    pointerX.current = event.clientX;
  }
  function onPointerUp(event: PointerEvent) {
    if (pointerX.current === null) return;
    const dx = event.clientX - pointerX.current;
    pointerX.current = null;
    // A swipe ends with a click on whatever stack is under the finger: that click must not step again.
    swiped.current = Math.abs(dx) > SWIPE_PX;
    if (swiped.current) onStep(dx < 0 ? 1 : -1);
  }
  // Owner 10/11/2026 (motion prototype vong-7): pressing a side stack brings it to the centre. The side stacks stay `inert`
  // (design §8.5: blurred text is not read, the keys and arrows do the same), so a browser hands the press to the track: the
  // stack is found from where the press landed, one step per --gcar-step from the centre.
  function onTrackClick(event: MouseEvent<HTMLElement>) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    const target = event.target as Element;
    if (target.closest('a, button')) return;
    const slot = target.closest<HTMLElement>('[data-k]');
    let k: number;
    if (slot) {
      k = Number(slot.dataset.k);
    } else {
      const track = event.currentTarget;
      const rect = track.getBoundingClientRect();
      const style = getComputedStyle(track);
      // --gcar-step is in rem (the page scales on wide screens, owner 10/11/2026): turn it into px.
      const rootPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const step = (Number.parseFloat(style.getPropertyValue('--gcar-step')) || 8) * rootPx;
      const reach = Number.parseFloat(style.getPropertyValue('--gcar-reach')) || 1;
      k = Math.round((event.clientX - (rect.left + rect.width / 2)) / step);
      if (Math.abs(k) > reach) return;
    }
    const shown = new Set(groups.map((_, index) => stepTo(centre, index, groups.length)));
    if (k !== 0 && Math.abs(k) <= 2 && shown.has(k)) onStep(k);
  }
  function onWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < WHEEL_PX) return;
    const now = Date.now();
    if (now - lastWheel.current < WHEEL_GAP_MS) return;
    lastWheel.current = now;
    onStep(event.deltaX > 0 ? 1 : -1);
  }

  return (
    <div className="relative -mx-4 overflow-x-clip md:mx-0">
      {glow && <div aria-hidden className={cn('gcar-glow', glow.border)} />}
      <section
        ref={trackRef}
        aria-label={t('carousel')}
        className="gcar-track touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointerX.current = null)}
        onWheel={onWheel}
        onClick={onTrackClick}
      >
        {groups.map((g, index) => {
          const k = stepTo(centre, index, groups.length);
          const abs = Math.abs(k);
          if (abs > 3) return null;
          const isCentre = k === 0;
          const desk = arcSlot(k, false);
          const phone = arcSlot(k, true);
          return (
            <div
              key={g.id}
              className="gcar-slot"
              data-abs={abs}
              data-k={k}
              data-group={g.id}
              inert={!isCentre || undefined}
              aria-hidden={!isCentre || undefined}
              // raw-ok: the slot's place on the arc (arcSlot) drives its transform in globals.css
              style={{ '--x': desk.x, '--xp': phone.x, '--y': desk.y, '--r': desk.rotate, '--s': desk.scale, '--o': desk.opacity, '--z': desk.z } as CSSProperties}
            >
              <GroupStack
                group={g}
                size="carousel"
                ref={isCentre ? centreRef : undefined}
                href={isCentre ? `/${locale}/app/group?id=${g.id}` : undefined}
                onOpen={isCentre ? onOpen : undefined}
              />
            </div>
          );
        })}
        {groups.length > 1 && (
          <>
            <ArrowButton side="prev" label={t('prev')} onPress={() => onStep(-1)} />
            <ArrowButton side="next" label={t('next')} onPress={() => onStep(1)} />
          </>
        )}
        <p aria-hidden data-part="2" className="gcar-hint text-wm-meta text-wm-muted">
          <span className="md:hidden">{t('hintPhone')}</span>
          <span className="hidden md:inline">{t('hint')}</span>
        </p>
      </section>
    </div>
  );
}

function ArrowButton({ side, label, onPress }: { side: 'prev' | 'next'; label: string; onPress: () => void }) {
  const Icon = side === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      data-part="1"
      aria-label={label}
      onClick={onPress}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'absolute top-45 z-20 hidden size-12 items-center justify-center rounded-wm-pill border border-wm-line bg-wm-surface text-wm-ink shadow-wm-soft outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent md:flex',
        side === 'prev' ? 'left-0' : 'right-0',
      )}
    >
      <Icon aria-hidden className="size-4.5" />
    </button>
  );
}

