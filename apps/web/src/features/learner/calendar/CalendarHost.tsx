'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { monthOf, todayIn, useLearnerZone } from '@/lib/learner-date';
import { CalendarContext, type CalendarControls } from './calendar-context';
import { calendarHref, parseCalendar } from './calendar-params';
import { isTyping } from './CalendarModal';

// Loaded on first open (design §5.7).
const MonthDialog = dynamic(() => import('./MonthDialog').then((m) => m.MonthDialog), { ssr: false });
const DayDialog = dynamic(() => import('./DayDialog').then((m) => m.DayDialog), { ssr: false });

/**
 * `history.state.wmCalendar` = how many calendar steps this tab pushed up to here (1 for Lịch, 2 for Ngày opened from it);
 * `wmFromMonth`: the step before this Ngày shows Lịch. An entry without the marker came from a link or a reload.
 */
type Marker = { wmCalendar?: number; wmFromMonth?: boolean };
const marker = (): Marker => (window.history.state ?? {}) as Marker;

// The location as a store: our own push/replace and the browser's Back both re-render the host (design §5.6).
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}
const snapshot = () => window.location.pathname + window.location.search;

function write(kind: 'push' | 'replace', url: string, state: Marker | null) {
  // Only our keys: Next's patched pushState / replaceState copies its own (`__NA`, the tree) and syncs its router when they are absent;
  // passing them through makes Next skip that sync and later write back a stale URL (final review #1).
  const next: Marker = {};
  if (state?.wmCalendar !== undefined) next.wmCalendar = state.wmCalendar;
  if (state?.wmFromMonth !== undefined) next.wmFromMonth = state.wmFromMonth;
  if (kind === 'push') window.history.pushState(next, '', url);
  else window.history.replaceState(next, '', url);
  notify();
}

/**
 * Lịch and Ngày, driven by `?lich=` / `?ngay=` on the current path (design §5.6), mounted once in the (member) layout. Opening Lịch, and Lịch →
 * Ngày, push a step; changing month, day or filter replaces. Closing goes back only over steps this tab pushed; a dialog from a link or a
 * reload closes by stripping the parameters, so closing never leaves the app. `L` toggles the calendar outside fields and other dialogs.
 */
export function CalendarHost({ children }: { children: ReactNode }) {
  // Re-renders on Next's own navigations; the store covers pushState and Back.
  useSearchParams();
  const location = useSyncExternalStore(subscribe, snapshot, () => '');
  const zone = useLearnerZone();
  const today = todayIn(zone, new Date());
  const [pathname, search] = useMemo(() => {
    const at = location.indexOf('?');
    return at < 0 ? [location, ''] : [location.slice(0, at), location.slice(at)];
  }, [location]);
  const view = parseCalendar(new URLSearchParams(search), today);
  const closing = useRef(false);

  const href = useCallback((set: { lich?: string | null; ngay?: string | null }) => calendarHref(pathname, search, set), [pathname, search]);

  // Invalid parameters, a dialog left over after closing, and a Ngày reached from a link (rule 3: Back from it shows Lịch).
  useEffect(() => {
    if (!location) return;
    const marked = (marker().wmCalendar ?? 0) > 0;
    if (view.view === 'invalid') return write('replace', href({ lich: null, ngay: null }), null);
    if (view.view === 'none') {
      closing.current = false;
      return;
    }
    if (closing.current && !marked) {
      closing.current = false;
      return write('replace', href({ lich: null, ngay: null }), null);
    }
    if (view.view === 'day' && !marked) {
      write('replace', href({ lich: view.month, ngay: null }), null);
      write('push', calendarHref(pathname, search, { lich: null, ngay: view.date }), { wmCalendar: 1, wmFromMonth: true });
    }
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  const controls = useMemo<CalendarControls & { setMonth(month: string): void; setDay(date: string): void }>(() => {
    const depth = () => marker().wmCalendar ?? 0;
    const close = () => {
      const steps = depth();
      if (steps === 0) return write('replace', href({ lich: null, ngay: null }), null);
      closing.current = true;
      if (steps === 1) window.history.back();
      else window.history.go(-steps);
    };
    return {
      isOpen: view.view === 'month' || view.view === 'day',
      openMonth: (month) => write('push', href({ lich: month ?? monthOf(today), ngay: null }), { wmCalendar: depth() + 1 }),
      openDay: (date) => write('push', href({ lich: null, ngay: date }), { wmCalendar: depth() + 1, wmFromMonth: view.view === 'month' }),
      backToMonth: () => {
        if (view.view !== 'day') return;
        if (marker().wmFromMonth && depth() > 0) window.history.back();
        else write('replace', href({ lich: view.month, ngay: null }), marker());
      },
      close,
      setMonth: (month) => write('replace', href({ lich: month, ngay: null }), marker()),
      setDay: (date) => write('replace', href({ lich: null, ngay: date }), marker()),
    };
  }, [href, today, view.view, view.view === 'day' ? view.month : null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'l' || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      // Other dialogs keep their keys; inside Lịch and Ngày `L` closes everything.
      const dialog = target?.closest('[role="dialog"], [role="alertdialog"]');
      if (isTyping(target) || (dialog && !dialog.hasAttribute('data-wm-calendar'))) return;
      event.preventDefault();
      if (controls.isOpen) controls.close();
      else controls.openMonth();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controls]);

  return (
    <CalendarContext.Provider value={controls}>
      {children}
      {view.view === 'month' && (
        <MonthDialog
          key="month"
          month={view.month}
          today={today}
          onMonth={controls.setMonth}
          onDay={controls.openDay}
          onClose={controls.close}
        />
      )}
      {view.view === 'day' && (
        <DayDialog
          key="day"
          date={view.date}
          today={today}
          onDay={controls.setDay}
          onBack={controls.backToMonth}
          onClose={controls.close}
        />
      )}
    </CalendarContext.Provider>
  );
}
