import { z } from 'zod';

// Months the calendar answers: a real `YYYY-MM` between 2026-01 and 2100-12 (design giao diện mới §10.3).
export const calendarMonthQuery = z.strictObject({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .refine((m) => m >= '2026-01' && m <= '2100-12', { message: 'Must be between 2026-01 and 2100-12' }),
});
export type CalendarMonthQuery = z.infer<typeof calendarMonthQuery>;

// A calendar date in the learner's zone, as the practice history takes it (`history.controller.ts`).
export const calendarDayParam = z.strictObject({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (value) =>
        !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value),
    ),
});
export type CalendarDayParam = z.infer<typeof calendarDayParam>;

export const calendarDayQuery = z.strictObject({
  kind: z.enum(['all', 'learned', 'reviewed']).default('all'),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
});
export type CalendarDayQuery = z.infer<typeof calendarDayQuery>;
