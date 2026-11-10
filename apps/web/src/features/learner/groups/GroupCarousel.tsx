'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, type CSSProperties, type PointerEvent, type Ref, type WheelEvent } from 'react';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { stepTo } from './carousel';
import { GroupStack } from './GroupStack';
import type { GroupSummary } from './groups-api';

/** Swipe distance and trackpad step that change the group (motion doc §3). */
const SWIPE_PX = 40;
const WHEEL_PX = 12;
const WHEEL_GAP_MS = 380;

/**
 * "Trượt mờ" (Figma 82:3213 / 82:3368, motion doc §3, design §8.5): the centre stack sharp, two neighbours each side smaller and
 * blurred (one each side on phones), the rest hidden. The centre opens its group; a side stack is pressed to bring it to the centre (owner 10/11/2026). Positions,
 * curves and blur live in globals.css (`.gcar-*`), driven by `--k` (distance to the centre) and `data-abs` (its size).
 */
export function GroupCarousel({
  groups,
  centre,
  instant,
  onStep,
  centreRef,
  onOpen,
}: {
  groups: GroupSummary[];
  centre: number;
  /** A jump of more than 3 groups: no animation. */
  instant: boolean;
  onStep: (step: number) => void;
  centreRef?: Ref<HTMLDivElement>;
  onOpen?: () => void;
}) {
  const t = useTranslations('App.groups');
  const locale = useLocale();
  const pointerX = useRef<number | null>(null);
  const lastWheel = useRef(0);
  const swiped = useRef(false);
  const centreGroup = groups[centre];
  const halo = centreGroup ? groupTone(centreGroup.id, centreGroup.total) : null;

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
  function onWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < WHEEL_PX) return;
    const now = Date.now();
    if (now - lastWheel.current < WHEEL_GAP_MS) return;
    lastWheel.current = now;
    onStep(event.deltaX > 0 ? 1 : -1);
  }

  return (
    <div className="relative -mx-4 overflow-x-clip md:mx-0">
      {halo && <div aria-hidden className={cn('gcar-halo', halo.wash)} />}
      <section
        aria-label={t('carousel')}
        className="gcar-track touch-pan-y select-none"
        data-instant={instant || undefined}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointerX.current = null)}
        onWheel={onWheel}
      >
        {groups.map((g, index) => {
          const k = stepTo(centre, index, groups.length);
          const abs = Math.abs(k);
          if (abs > 3) return null;
          const isCentre = k === 0;
          return (
            <div
              key={g.id}
              className="gcar-slot"
              data-abs={abs}
              aria-hidden={!isCentre || undefined}
              // Owner 10/11/2026 (motion prototype vong-7): pressing a side stack brings it to the centre. Pointer only: the
              // keys and the arrow buttons do the same for keyboard and screen-reader users, so the stack stays hidden to them.
              onClick={isCentre ? undefined : () => !swiped.current && onStep(k)}
              // raw-ok: the slot's distance to the centre drives its transform in globals.css
              style={{ '--k': k } as CSSProperties}
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
        <p aria-hidden className="gcar-hint font-wm-mono text-wm-mono text-wm-muted">
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
      aria-label={label}
      onClick={onPress}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'absolute top-46.5 z-20 hidden size-12 items-center justify-center rounded-wm-pill border border-wm-line bg-wm-surface text-wm-ink shadow-wm-soft outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent md:flex',
        side === 'prev' ? 'left-0' : 'right-0',
      )}
    >
      <Icon aria-hidden className="size-4.5" />
    </button>
  );
}

