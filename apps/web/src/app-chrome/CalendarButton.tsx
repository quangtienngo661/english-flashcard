'use client';

import { Flame } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { monthOf, todayIn, useLearnerZone } from '@/lib/learner-date';
import { Kbd } from '@/ui/Kbd';
import { usePrefetchCalendarMonth, useStreak } from '@/features/learner/calendar/calendar-api';
import { useCalendar } from '@/features/learner/calendar/calendar-context';

const SIZE = {
  // Figma 95:343 "Lớn" 62 × 66 (desktop) and "Nhỏ" 54 × 58 (phone).
  lg: { box: 'h-16.5 w-15.5', strip: 'h-5 pl-2.25', badge: 'left-9.5' },
  sm: { box: 'h-14.5 w-13.5', strip: 'h-4.5 pl-2.25', badge: 'left-7.5' },
} as const;
const TEXT = {
  // raw-ok: Figma 95:343 month strip Noto Sans Bold 10 / 9 px and day number Bricolage ExtraBold 26 / 22 px, sizes no text token has
  lg: { month: 'text-[0.625rem]', day: 'text-[1.625rem]' },
  // raw-ok: as above, the phone variant
  sm: { month: 'text-[0.5625rem]', day: 'text-[1.375rem]' },
} as const;
// raw-ok: Figma badge radius 11 px, 2 px border in --bg, Bricolage ExtraBold 12; it sits 9 px above the button's top edge
const BADGE = 'absolute -top-2.25 flex items-center gap-0.5 rounded-wm-control border-2 border-wm-bg bg-wm-mark py-0.75 pl-1.25 pr-2 font-wm-display text-[0.75rem] font-extrabold leading-none text-wm-mark-ink';

/** The month in the strip: vi "T11", en "Nov" (Part 6 decisions). */
export function monthLabel(locale: AppLocale, month: string): string {
  const number = Number(month.slice(5, 7));
  if (locale === 'vi') return `T${number}`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(Date.UTC(2026, number - 1, 1));
}

/**
 * The floating calendar button (Figma 95:343, design §7.5): month strip, today's day in the learner's zone and the streak badge. It opens
 * Lịch; hover and focus prefetch the current month (design §5.7). Hidden, not removed, while Lịch or Ngày is open.
 */
export function CalendarButton({ size }: { size: 'lg' | 'sm' }) {
  const t = useTranslations('App.calendar.fab');
  const locale = useLocale() as AppLocale;
  const zone = useLearnerZone();
  const today = todayIn(zone, new Date());
  const month = monthOf(today);
  const { isOpen, openMonth } = useCalendar();
  const streak = useStreak();
  const prefetch = usePrefetchCalendarMonth();
  const describedBy = useId();
  const days = streak.data?.days ?? 0;
  return (
    <button
      type="button"
      onClick={() => openMonth()}
      onPointerEnter={() => prefetch(month)}
      onFocus={() => prefetch(month)}
      aria-label={t('label')}
      aria-keyshortcuts="L"
      aria-describedby={days > 0 ? describedBy : undefined}
      aria-hidden={isOpen || undefined}
      inert={isOpen || undefined}
      className={cn(
        'group relative flex flex-col rounded-wm-dialog bg-wm-surface text-wm-ink shadow-wm-pop outline-none transition duration-200 ease-wm-out',
        'hover:-translate-y-0.5 active:scale-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
        SIZE[size].box,
        isOpen && 'pointer-events-none opacity-0',
      )}
    >
      <span aria-hidden className={cn('flex items-center rounded-t-wm-dialog bg-wm-accent font-bold text-wm-on-accent', SIZE[size].strip, TEXT[size].month)}>
        {monthLabel(locale, month)}
      </span>
      <span aria-hidden className={cn('flex flex-1 items-center justify-center font-wm-display font-extrabold leading-none', TEXT[size].day)}>
        {Number(today.slice(8, 10))}
      </span>
      {days > 0 && (
        <span aria-hidden className={cn(BADGE, SIZE[size].badge)}>
          <Flame className="size-3.25 shrink-0" />
          {days}
        </span>
      )}
      {days > 0 && <span id={describedBy} className="sr-only">{t('streak', { days })}</span>}
      <span
        aria-hidden
        className="pointer-events-none absolute right-full top-1/2 mr-3 flex -translate-y-1/2 translate-x-1.5 items-center gap-2 whitespace-nowrap rounded-wm-control bg-wm-ink px-2.5 py-1.5 font-wm-sans text-wm-small-strong text-wm-surface opacity-0 transition duration-150 ease-wm-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 max-md:hidden"
      >
        {t('label')}
        <Kbd>L</Kbd>
      </span>
    </button>
  );
}
