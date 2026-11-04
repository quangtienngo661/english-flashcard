import { z } from 'zod';

/** `POST /v1/me/orders`: the learner's choice and the price they saw (design §3.1, §3.5). */
export const createOrderSchema = z.strictObject({
  period_months: z.union([z.literal(1), z.literal(3), z.literal(12)]),
  expected_amount: z.number().int().positive(),
  /** The language the return page opens in. */
  locale: z.enum(['vi', 'en']),
});

export const orderIdParams = z.strictObject({ id: z.uuid() });

// Staff side (design §3.9).
const instant = z.iso.datetime({ offset: true });
const pageSize = z.coerce.number().int().min(1).max(100).default(20);
export const ORDER_STATUSES = ['pending', 'paid', 'expired', 'cancelled', 'failed', 'needs_review', 'closed'] as const;

export const adminOrdersQuery = z.strictObject({
  status: z.enum(ORDER_STATUSES).optional(),
  needs_attention: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  email: z.string().trim().min(1).max(320).optional(),
  from: instant.optional(),
  to: instant.optional(),
  /** What the payer typed into the transfer: 'WM…' or part of it. */
  q: z.string().trim().min(1).max(40).optional(),
  page_size: pageSize,
  page_token: z.string().optional(),
}).refine((query) => query.from === undefined || query.to === undefined || Date.parse(query.from) < Date.parse(query.to));
export type AdminOrdersQuery = z.output<typeof adminOrdersQuery>;

export const confirmPaymentSchema = z.strictObject({
  /** The bank's reference staff read in the bank app. */
  reference: z.string().trim().min(1).max(100),
  amount: z.number().int().positive().max(1_000_000_000),
  reason: z.string().trim().min(1).max(300),
});
export const resolveOrderSchema = z.strictObject({ note: z.string().trim().min(1).max(300) });
export const revokePeriodSchema = z.strictObject({ reason: z.string().trim().min(1).max(300) });
