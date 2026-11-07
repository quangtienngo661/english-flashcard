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

/**
 * Đợt C DC9, mockup `index.html`: a small navy pill, a flame that bounces once and "N ngày liên tiếp", bottom centre, above the answer
 * buttons on a phone. Not the shared toast queue: that one is text only, 5 s, with a close button. It never takes a tap
 * (`pointer-events-none`), and the status region is always there so a screen reader reads the text once when it appears.
 */
export function StreakToast() {
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
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-60 flex justify-center px-4 md:bottom-8">
      {visible && (
        <p
          key={current.id}
          className={cn(
            'flex items-center gap-2 rounded-full bg-navy py-2 pl-2.5 pr-4 text-body font-bold text-on-navy shadow-toast motion-safe:animate-toast-in',
            'transition-opacity duration-fast ease-exit',
            phase.leaving && 'opacity-0',
          )}
        >
          <Flame aria-hidden className="size-6 shrink-0 origin-bottom fill-accent text-accent-deep motion-safe:animate-streak-flame" />
          {t('days', { days: current.days })}
        </p>
      )}
    </div>
  );
}
