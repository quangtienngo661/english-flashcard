import { z } from 'zod';

// Months the calendar answers: a real `YYYY-MM` between 2026-01 and 2100-12 (design giao diện mới §10.3).
export const calendarMonthQuery = z.strictObject({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .refine((m) => m >= '2026-01' && m <= '2100-12', { message: 'Must be between 2026-01 and 2100-12' }),
});
export type CalendarMonthQuery = z.infer<typeof calendarMonthQuery>;
