import { useCallback } from 'react';
import { useFormatter } from 'use-intl';

/** `14/10/2026 09:30` in the UI language, local time zone. */
export function useDateTime(): (iso: string) => string {
  const format = useFormatter();
  return useCallback(
    (iso) => {
      const date = new Date(iso);
      const day = format.dateTime(date, { day: '2-digit', month: '2-digit', year: 'numeric' });
      const time = format.dateTime(date, { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${day} ${time}`;
    },
    [format],
  );
}
