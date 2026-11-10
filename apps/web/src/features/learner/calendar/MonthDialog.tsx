'use client';

import { ChevronLeft, ChevronRight, Flame, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Heading } from 'react-aria-components';
import { useFormat } from '@/app-shell/format';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { addDays, addMonths, daysInMonth, elapsedDays, monthOf } from '@/lib/learner-date';
import { Kbd } from '@/ui/Kbd';
import { Skeleton } from '@/ui/Skeleton';
import { ErrorState } from '@/ui/States';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import { useCalendarMonth, useStreak, type CalendarDay } from './calendar-api';
import { FIRST_MONTH } from './calendar-params';
import { CalendarModal } from './CalendarModal';
import { monthGrid, type GridCell } from './month-grid';

export type MonthDialogProps = {
  month: string;
  today: string;
  /** Replaces `?lich=` (no new history step). */
  onMonth: (month: string) => void;
  onDay: (date: string) => void;
  onClose: () => void;
};

const FIRST_DAY = `${FIRST_MONTH}-01`;
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const ICON_BUTTON =
  'flex size-9 shrink-0 items-center justify-center rounded-wm-md border border-wm-line bg-wm-surface text-wm-ink outline-none transition-colors duration-150 ' +
  'hover:bg-wm-bg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent disabled:cursor-not-allowed disabled:opacity-35';
// Figma 102:3502 sizes no text token has: title 28 / 22, totals 24 / 18 with "/8" 13 / 10, labels 12.5 / 11, day 17 / 14, "hôm nay" 9.5.
const RAW = {
  // raw-ok: as above
  title: 'text-[1.375rem] tracking-[-0.03em] md:text-[1.75rem]',
  // raw-ok: as above
  total: 'text-[1.125rem] md:text-[1.5rem]',
  // raw-ok: as above
  elapsed: 'text-[0.625rem] md:text-[0.8125rem]',
  // raw-ok: as above
  totalLabel: 'text-[0.6875rem] leading-[1.3] md:text-[0.78125rem]',
  // raw-ok: as above
  day: 'text-[0.875rem] md:text-[1.0625rem]',
  // raw-ok: as above
  todayMark: 'text-[0.59375rem]',
  // raw-ok: Figma cell radius 12 on desktop (10 on phones, radius-wm-md); the band of consecutive days ends with radius 14 (radius-wm-lg)
  cell: 'rounded-wm-md md:rounded-[0.75rem]',
} as const;

/** The last day of `month` the learner may pick: today in the current month, the month's end before it, the first day after it. */
function pickFor(month: string, today: string): string {
  const current = monthOf(today);
  if (month === current) return today;
  return month < current ? `${month}-${String(daysInMonth(month)).padStart(2, '0')}` : `${month}-01`;
}

function useDayLabel() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations('App.calendar.month');
  const weekday = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', locale === 'vi'
    ? { weekday: 'long', timeZone: 'UTC' }
    : { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
  return (cell: GridCell, row: CalendarDay | undefined) => {
    const at = Date.UTC(Number(cell.date.slice(0, 4)), Number(cell.date.slice(5, 7)) - 1, Number(cell.date.slice(8, 10)));
    const name = locale === 'vi' ? `${weekday.format(at)} ${Number(cell.date.slice(8, 10))}/${Number(cell.date.slice(5, 7))}` : weekday.format(at);
    if (cell.isFuture) return `${name}: ${t('cellFuture')}`;
    const parts = [
      row && row.learned > 0 ? t('cellLearned', { count: row.learned }) : null,
      row && row.reviewed > 0 ? t('cellReviewed', { count: row.reviewed }) : null,
      row && row.practice_sessions > 0 ? t('cellSessions', { count: row.practice_sessions }) : null,
    ].filter(Boolean);
    return `${name}: ${parts.length > 0 ? parts.join(', ') : t('cellNone')}`;
  };
}

/**
 * Hộp Lịch (Figma 102:3278 / 102:3948, M6 Figma A §2–§3, §8): month head with the streak, the four totals, the week grid with activity
 * dots and bands of consecutive days, the legend and, on desktop, the keys. The selected day has the roving focus: ← → move a day, ↑ ↓ a
 * week (a step into another month replaces `?lich=`), Enter or a click opens Ngày. The future and months before 2026-01 are closed.
 */
export function MonthDialog({ month, today, onMonth, onDay, onClose }: MonthDialogProps) {
  const t = useTranslations('App.calendar.month');
  const format = useFormat();
  const data = useCalendarMonth(month);
  const streak = useStreak();
  const dayLabel = useDayLabel();
  const current = monthOf(today);
  const [selected, setSelected] = useState(() => pickFor(month, today));
  // The selected day takes focus on opening and after a key or "Về hôm nay"; the month arrows keep it.
  const focusDay = useRef(true);
  const cells = useRef(new Map<string, HTMLButtonElement>());

  // Another month came from the arrows or the URL: select its default day.
  if (monthOf(selected) !== month) setSelected(pickFor(month, today));

  const loaded = data.isSuccess;
  useEffect(() => {
    if (!focusDay.current || !loaded) return;
    cells.current.get(selected)?.focus();
    focusDay.current = false;
  }, [loaded, selected, month]);

  const move = (date: string) => {
    if (date > today || date < FIRST_DAY) return;
    setSelected(date);
    focusDay.current = true;
    if (monthOf(date) !== month) onMonth(monthOf(date));
  };
  const onGridKey = (event: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (step !== undefined) {
      event.preventDefault();
      move(addDays(selected, step));
    } else if (event.key === 'Enter' && selected <= today) {
      event.preventDefault();
      onDay(selected);
    }
  };
  const toMonth = (next: string) => {
    setSelected(pickFor(next, today));
    onMonth(next);
  };
  const days = data.data?.days ?? [];
  const byDate = new Map(days.map((d) => [d.date, d]));
  const grid = monthGrid(month, today, days);
  const totals = data.data?.totals;
  const streakDays = streak.data?.days ?? 0;

  return (
    <CalendarModal size="month" onDismiss={onClose}>
      <div className="flex flex-col gap-3 px-4 pb-5 pt-2 md:gap-4 md:px-7 md:pb-6 md:pt-7">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3 max-md:pr-10">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-wm-mono text-wm-mono text-wm-muted">{t('label')}</span>
              <Heading slot="title" className={cn('font-wm-display font-extrabold leading-tight text-wm-ink', RAW.title)}>
                {format.date(`${month}-15T12:00:00Z`, 'monthYear')}
              </Heading>
            </div>
            {streakDays > 0 && (
              <span className="flex items-center gap-1.25 rounded-wm-md bg-wm-mark py-1.25 pl-2 pr-3 font-wm-sans text-wm-label font-semibold text-wm-mark-ink">
                <Flame aria-hidden className="size-4 shrink-0" />
                {t('streak', { days: streakDays })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 max-md:basis-full">
            {(selected !== today || month !== current) && (
              <button
                type="button"
                className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'mr-1')}
                onClick={() => {
                  setSelected(today);
                  focusDay.current = true;
                  if (month !== current) onMonth(current);
                }}
              >
                {t('today')}
              </button>
            )}
            <button type="button" aria-label={t('prev')} className={ICON_BUTTON} disabled={month <= FIRST_MONTH} onClick={() => toMonth(addMonths(month, -1))}>
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button type="button" aria-label={t('next')} className={ICON_BUTTON} disabled={month >= current} onClick={() => toMonth(addMonths(month, 1))}>
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
          <span className="flex-1 max-md:hidden" />
          <button type="button" aria-label={t('close')} onClick={onClose} className={cn(ICON_BUTTON, 'max-md:absolute max-md:right-4 max-md:top-4.5 max-md:size-8.5')}>
            <X aria-hidden className="size-4.5" />
          </button>
        </div>

        {data.isError ? (
          <ErrorState message={t('error')} onRetry={() => void data.refetch()} />
        ) : !loaded || !totals ? (
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">{t('loading')}</span>
            <Skeleton className="h-14 w-full rounded-wm-lg md:h-18" />
            <Skeleton className="h-80 w-full rounded-wm-lg md:h-120" />
          </div>
        ) : (
          <>
            <ul aria-label={t('totals')} className="grid grid-cols-4 rounded-wm-lg border border-wm-line">
              {[
                { value: totals.study_days, label: t('studyDays'), tone: 'text-wm-ink', extra: t('elapsed', { days: elapsedDays(month, today) }) },
                { value: totals.learned, label: t('learned'), tone: 'text-wm-accent' },
                { value: totals.reviewed, label: t('reviewed'), tone: 'text-wm-pass' },
                { value: totals.practice_sessions, label: t('sessions'), tone: 'text-wm-practice-ink' },
              ].map((cell, index) => (
                <li key={cell.label} className={cn('flex min-w-0 flex-col gap-0.5 p-2 md:px-4 md:py-3', index > 0 && 'border-l border-wm-line')}>
                  <span className={cn('font-wm-display font-extrabold leading-none', RAW.total, cell.tone)}>
                    {format.number(cell.value)}
                    {cell.extra && <span className={cn('font-bold text-wm-muted', RAW.elapsed)}>{cell.extra}</span>}
                  </span>
                  <span className={cn('font-wm-sans text-wm-muted', RAW.totalLabel)}>{cell.label}</span>
                </li>
              ))}
            </ul>

            {/* The day buttons carry the whole meaning; the weekday row only helps the eye. */}
            <div className="flex flex-col gap-1" onKeyDown={onGridKey}>
              <div aria-hidden className="grid grid-cols-7 px-0.75">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="pl-1.5 font-wm-mono text-wm-mono text-wm-muted md:pl-3">
                    {t(`weekdays.${day}`)}
                  </span>
                ))}
              </div>
              {grid.map((week) => (
                <div key={week[0].date} className="grid h-12.5 grid-cols-7 md:h-18.5">
                  {week.map((cell) => (
                    <Cell
                      key={cell.date}
                      cell={cell}
                      label={dayLabel(cell, byDate.get(cell.date))}
                      todayMark={t('todayMark')}
                      selected={cell.date === selected}
                      register={(node) => {
                        if (node) cells.current.set(cell.date, node);
                        else cells.current.delete(cell.date);
                      }}
                      onOpen={() => {
                        setSelected(cell.date);
                        onDay(cell.date);
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 font-wm-sans text-wm-label font-normal text-wm-muted">
          {(['learn', 'review', 'practice'] as const).map((kind) => (
            <li key={kind} className="flex items-center gap-1.5">
              <span aria-hidden className={cn('size-2 rounded-full', DOT[kind])} />
              {t(`legend.${kind}`)}
            </li>
          ))}
          <li className="flex items-center gap-1.5 max-md:basis-full">
            <span aria-hidden className="h-2.5 w-5.5 rounded-wm-sm bg-wm-accent-soft" />
            {t('legend.run')}
          </li>
        </ul>
        <p className="hidden items-center justify-end gap-1.5 border-t border-wm-line pt-4 font-wm-sans text-wm-label font-normal text-wm-muted md:flex">
          <Kbd>←</Kbd> <Kbd>→</Kbd> <Kbd>↑</Kbd> <Kbd>↓</Kbd> {t('keysPick')} <Kbd>Enter</Kbd> {t('keysOpen')} <Kbd>Esc</Kbd> {t('keysClose')}
        </p>
      </div>
    </CalendarModal>
  );
}

const DOT = { learn: 'bg-wm-accent', review: 'bg-wm-pass', practice: 'bg-wm-practice' } as const;
const BAND = {
  none: '',
  start: 'left-0.75 right-0 rounded-l-wm-lg',
  middle: 'inset-x-0',
  end: 'left-0 right-0.75 rounded-r-wm-lg',
  single: 'inset-x-0.75 rounded-wm-lg',
} as const;

function Cell({ cell, label, todayMark, selected, register, onOpen }: {
  cell: GridCell;
  label: string;
  todayMark: string;
  selected: boolean;
  register: (node: HTMLButtonElement | null) => void;
  onOpen: () => void;
}) {
  if (!cell.inMonth) {
    return (
      <span aria-hidden className="relative">
        <span className={cn('absolute inset-0.75 px-1.5 pt-1.5 font-wm-display font-bold text-wm-ghost md:px-3 md:pt-2', RAW.day)}>
          {Number(cell.date.slice(8, 10))}
        </span>
      </span>
    );
  }
  const dots = (['learn', 'review', 'practice'] as const).filter((kind) => cell.dots[kind]);
  return (
    <span className="relative">
      {cell.band !== 'none' && <span aria-hidden className={cn('absolute inset-y-1.25 bg-wm-accent-soft md:inset-y-1.75', BAND[cell.band])} />}
      <button
        ref={register}
        type="button"
        aria-label={label}
        aria-current={cell.isToday ? 'date' : undefined}
        aria-pressed={selected}
        tabIndex={selected ? 0 : -1}
        disabled={cell.isFuture}
        onClick={onOpen}
        className={cn(
          'absolute inset-0.75 flex flex-col justify-between border-2 border-transparent px-1.5 pb-2 pt-1.5 text-left outline-none transition duration-150 md:px-3 md:pb-3 md:pt-2',
          RAW.cell,
          'enabled:hover:bg-wm-surface/75 focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-wm-accent disabled:cursor-default',
          selected && 'border-wm-accent bg-wm-surface shadow-wm-card enabled:hover:bg-wm-surface',
        )}
      >
        <span className="flex items-baseline gap-1.25">
          <span
            className={cn(
              'font-wm-display leading-none',
              RAW.day,
              cell.isFuture ? 'font-bold text-wm-ghost' : cell.isToday ? 'font-extrabold text-wm-accent max-md:underline max-md:underline-offset-2' : 'font-bold text-wm-ink',
            )}
          >
            {Number(cell.date.slice(8, 10))}
          </span>
          {cell.isToday && <span aria-hidden className={cn('font-wm-mono font-bold text-wm-accent max-md:hidden', RAW.todayMark)}>{todayMark}</span>}
        </span>
        <span aria-hidden className="flex gap-0.5 md:gap-1">
          {dots.map((kind) => (
            <span key={kind} className={cn('size-1.25 rounded-full md:size-1.75', DOT[kind])} />
          ))}
        </span>
      </button>
    </span>
  );
}
