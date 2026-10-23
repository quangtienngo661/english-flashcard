import { z } from 'zod';

// Query shapes of the transaction lists (learner UI design §8.9). Dates are instants with an offset; the admin page sends the
// Vietnam day boundaries. `from` is inclusive, `to` exclusive.

const instant = z.iso.datetime({ offset: true });
const pageSize = z.coerce.number().int().min(1).max(100).default(20);

export const TRANSACTION_KINDS = ['purchase', 'renewal', 'plan_change', 'refund', 'trial', 'grant'] as const;
export type TransactionViewKind = (typeof TRANSACTION_KINDS)[number];

export const meTransactionsQuery = z.strictObject({ page_size: pageSize, page_token: z.string().optional() });
export type MeTransactionsQuery = z.input<typeof meTransactionsQuery> & { page_size: number };

export const adminTransactionsQuery = z.strictObject({
  email: z.string().trim().min(1).max(320).optional(),
  kind: z.enum(TRANSACTION_KINDS).optional(),
  from: instant.optional(),
  to: instant.optional(),
  page_size: pageSize,
  page_token: z.string().optional(),
}).refine((query) => query.from === undefined || query.to === undefined || Date.parse(query.from) < Date.parse(query.to));
export type AdminTransactionsQuery = z.input<typeof adminTransactionsQuery> & { page_size: number };
