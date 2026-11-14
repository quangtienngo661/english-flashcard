'use client';

import { createContext, useContext } from 'react';

/** What the calendar host (mounted in the (member) layout, M6.4) lets any screen do; nothing happens without a host. */
export type CalendarControls = {
  isOpen: boolean;
  /** Opens Lịch on `month` (`YYYY-MM`), or on the learner's current month. */
  openMonth(month?: string): void;
  openDay(date: string): void;
  backToMonth(): void;
  close(): void;
};

const none = () => {};
export const CalendarContext = createContext<CalendarControls>({ isOpen: false, openMonth: none, openDay: none, backToMonth: none, close: none });

export const useCalendar = (): CalendarControls => useContext(CalendarContext);
