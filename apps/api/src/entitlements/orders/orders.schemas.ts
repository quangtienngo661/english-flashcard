import { z } from 'zod';

/** `POST /v1/me/orders`: the learner's choice and the price they saw (design §3.1, §3.5). */
export const createOrderSchema = z.strictObject({
  period_months: z.union([z.literal(1), z.literal(3), z.literal(12)]),
  expected_amount: z.number().int().positive(),
  /** The language the return page opens in. */
  locale: z.enum(['vi', 'en']),
});

export const orderIdParams = z.strictObject({ id: z.uuid() });
