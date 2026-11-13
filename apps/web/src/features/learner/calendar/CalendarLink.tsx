'use client';

import { usePathname } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { monthOf, todayIn, useLearnerZone } from '@/lib/learner-date';
import { useCalendar } from './calendar-context';

/** "Mở lịch học": a real link to `?lich=<month>` (new tab, copy link), whose plain click opens Lịch in place (design §5.6). */
export function CalendarLink({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  const zone = useLearnerZone();
  const { openMonth } = useCalendar();
  const month = monthOf(todayIn(zone, new Date()));
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openMonth(month);
  };
  return (
    <a href={`${pathname}?lich=${month}`} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
