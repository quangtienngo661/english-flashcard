'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { monthOf, todayIn, useLearnerZone } from '@/lib/learner-date';
import { useDesktop } from '@/lib/use-desktop';
import { usePrefetchCalendarMonth } from '@/features/learner/calendar/calendar-api';
import { useCalendar } from '@/features/learner/calendar/calendar-context';
import { monthLabel } from './CalendarButton';

// raw-ok: Figma 95:344 is 32 × 34 with a 9 px radius; the 11 px strip carries JetBrains Mono Bold 7.5 and the day Bricolage ExtraBold 15, sizes no token has
const BOX = 'h-8.5 w-8 rounded-[0.5625rem]';
// raw-ok: as above, the strip's month label
const MONTH = 'text-[0.46875rem]';
// raw-ok: as above, today's day number
const DAY = 'text-[0.9375rem]';
// raw-ok: as above, the strip keeps the button's 9 px top corners
const STRIP = 'rounded-t-[0.5625rem]';

/**
 * The calendar button in a session's top bar on phones (Figma 95:344, design §5.4): month strip and today, no streak badge, so it never
 * covers the answer buttons. Desktop renders nothing here: the `(focus)` layout's floating button stays. Its hit area reaches 44 × 46.
 */
export function CalendarBarButton() {
  const t = useTranslations('App.calendar.fab');
  const locale = useLocale() as AppLocale;
  const zone = useLearnerZone();
  const today = todayIn(zone, new Date());
  const month = monthOf(today);
  const { openMonth } = useCalendar();
  const prefetch = usePrefetchCalendarMonth();
  if (useDesktop()) return null;
  return (
    <button
      type="button"
      onClick={() => openMonth()}
      onFocus={() => prefetch(month)}
      aria-label={t('label')}
      aria-keyshortcuts="L"
      className={cn(
        'relative flex shrink-0 flex-col overflow-visible border border-wm-line bg-wm-surface text-wm-ink shadow-wm-card outline-none transition duration-150 ease-wm-out',
        // raw-ok: an empty ::before widens the 32 × 34 button's hit area to 44 × 46 without moving the bar
        'before:absolute before:-inset-1.5 before:content-[""] active:scale-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent motion-reduce:active:scale-100',
        BOX,
      )}
    >
      <span aria-hidden className={cn('-mx-px -mt-px flex h-2.75 items-center bg-wm-accent pl-2 font-wm-mono font-bold leading-none text-wm-on-accent', STRIP, MONTH)}>
        {monthLabel(locale, month)}
      </span>
      <span aria-hidden className={cn('flex flex-1 items-center justify-center font-wm-display font-extrabold leading-none', DAY)}>
        {Number(today.slice(8, 10))}
      </span>
    </button>
  );
}
