'use client';

import { Heading } from 'react-aria-components';
import { CalendarModal } from './CalendarModal';

export type DayDialogProps = {
  date: string;
  today: string;
  onDay: (date: string) => void;
  onBack: () => void;
  onClose: () => void;
};

/** Hộp Ngày (Figma 103:3820 / 103:4248). */
export function DayDialog({ date, onBack }: DayDialogProps) {
  return (
    <CalendarModal size="day" onDismiss={onBack}>
      <Heading slot="title">{date}</Heading>
    </CalendarModal>
  );
}
