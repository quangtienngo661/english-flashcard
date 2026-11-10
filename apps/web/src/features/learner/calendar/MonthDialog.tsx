'use client';

import { Heading } from 'react-aria-components';
import { useFormat } from '@/app-shell/format';
import { CalendarModal } from './CalendarModal';

export type MonthDialogProps = {
  month: string;
  today: string;
  onMonth: (month: string) => void;
  onDay: (date: string) => void;
  onClose: () => void;
};

/** Hộp Lịch (Figma 102:3278 / 102:3948). */
export function MonthDialog({ month, onClose }: MonthDialogProps) {
  const format = useFormat();
  return (
    <CalendarModal size="month" onDismiss={onClose}>
      <Heading slot="title" className="font-wm-display text-wm-card-title">{format.date(`${month}-15T12:00:00Z`, 'monthYear')}</Heading>
    </CalendarModal>
  );
}
