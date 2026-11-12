'use client';

import { Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';

/** Đợt C DC9: on screen 3 s, then a short fade out before the text leaves the status region. */
const SHOWN_MS = 3_000;
const EXIT_MS = 200;

type Notice = { days: number; id: number };
let notice: Notice | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

/**
 * The API sends `streak` only with the first study of the learner's day (H2, H6), so this runs at most once a day; a newer call
 * replaces the toast on screen and starts its 3 s again.
 */
export function showStreak(days: number): void {
  notice = { days, id: nextId++ };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type StreakPlacement = 'bottom' | 'session-corner';

const PLACE: Record<StreakPlacement, string> = {
  bottom: 'inset-x-0 bottom-28 justify-center px-4 md:bottom-8',
  'session-corner': 'right-4 top-4 justify-end',
};

/**
 * Mockup L306-310: a surface pill with a 1 px line, the pop shadow, a flame in a 22 px accent-soft square and "N-day streak". Not the
 * shared toast queue: that one is text only, 5 s, with a close button. It never takes a tap (`pointer-events-none`), and the status
 * region is always there so a screen reader reads the text once when it appears. `placement`: bottom centre (above the answer buttons
 * on a phone), or the corner of a session screen.
 */
export function StreakToast({ placement = 'bottom' }: { placement?: StreakPlacement }) {
  const t = useTranslations('App.streak');
  const current = useSyncExternalStore(subscribe, () => notice, () => null);
  const [phase, setPhase] = useState<{ id: number; leaving: boolean; gone: boolean } | null>(null);

  useEffect(() => {
    if (!current) return;
    // Reset for the new notice from the store, then time its exit: the store is outside React, so this effect syncs with it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase({ id: current.id, leaving: false, gone: false });
    const leave = setTimeout(() => setPhase({ id: current.id, leaving: true, gone: false }), SHOWN_MS);
    const remove = setTimeout(() => setPhase({ id: current.id, leaving: true, gone: true }), SHOWN_MS + EXIT_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(remove);
    };
  }, [current]);

  const visible = current !== null && phase?.id === current.id && !phase.gone;
  return (
    <div role="status" aria-live="polite" className={cn('pointer-events-none fixed z-60 flex', PLACE[placement])}>
      {visible && (
        <p
          key={current.id}
          className={cn(
            'flex items-center gap-2.5 rounded-wm-row border border-wm-line bg-wm-surface px-3.5 py-2.5 font-wm-sans text-wm-small font-semibold text-wm-ink shadow-wm-pop motion-safe:animate-wm-toast-in',
            'transition-opacity duration-150 ease-wm-exit',
            phase.leaving && 'opacity-0',
          )}
        >
          <span aria-hidden className="grid size-5.5 shrink-0 place-content-center rounded-wm-key bg-wm-accent-soft text-wm-accent">
            <Flame className="size-3.5 origin-bottom motion-safe:animate-wm-streak-flame" />
          </span>
          {t('days', { days: current.days })}
        </p>
      )}
    </div>
  );
}
