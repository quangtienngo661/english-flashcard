import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import type { AdminTransactionsQuery, MeTransactionsQuery, TransactionViewKind } from './transactions.queries.js';

export type TransactionView = {
  id: string;
  kind: TransactionViewKind;
  plan: string;
  interval: string | null;
  amount_minor: number | null;
  currency: string | null;
  occurred_at: string;
  period_start: string;
  period_end: string | null;
  status: string;
  provider: string | null;
  provider_transaction_id: string | null;
};
export type AdminTransactionView = TransactionView & { user: { id: string; email: string | null } };
export type TransactionPage<T> = { items: T[]; next_page_token: string | null };

type Item = TransactionView & { userId: string };
type Filters = { userId?: string; kind?: TransactionViewKind; from?: Date; to?: Date };

const cursorSchema = z.strictObject({ occurred_at: z.iso.datetime(), id: z.string().min(1) });
const invalid = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });

/**
 * The transaction history (learner UI design §8.9): `billing_transactions` merged with the staff plan grants, newest first.
 * Keyset on (occurred_at desc, id desc): each source reads one page past the cursor, the merge keeps the page; the token is
 * bound to the route, the learner and the filters.
 */
@Injectable()
export class TransactionsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}

  async forLearner(userId: string, query: MeTransactionsQuery): Promise<TransactionPage<TransactionView>> {
    const page = await this.list({ userId }, query.page_size, query.page_token, { route: 'me-transactions', userId });
    return { items: page.items.map(withoutUser), next_page_token: page.next_page_token };
  }

  async forAdmin(query: AdminTransactionsQuery): Promise<TransactionPage<AdminTransactionView>> {
    const binding = {
      route: 'admin-transactions', email: query.email ?? null, kind: query.kind ?? null, from: query.from ?? null, to: query.to ?? null,
    };
    let userId: string | undefined;
    if (query.email !== undefined) {
      const found = await this.identity.findUserIdByEmail(query.email);
      if (found === null) return { items: [], next_page_token: null };
      userId = found;
    }
    const page = await this.list({
      userId, kind: query.kind,
      from: query.from === undefined ? undefined : new Date(query.from),
      to: query.to === undefined ? undefined : new Date(query.to),
    }, query.page_size, query.page_token, binding);
    const emails = await this.identity.emailsOf(page.items.map((item) => item.userId));
    return {
      items: page.items.map(({ userId: id, ...view }) => ({ ...view, user: { id, email: emails.get(id) ?? null } })),
      next_page_token: page.next_page_token,
    };
  }

  private async list(filters: Filters, pageSize: number, token: string | undefined, bind: Record<string, unknown>): Promise<TransactionPage<Item>> {
    const binding = createHash('sha256').update(JSON.stringify(bind)).digest('hex');
    let cursor: { at: Date; id: string } | undefined;
    if (token !== undefined) {
      const parsed = cursorSchema.safeParse(decodeBoundToken(token, binding));
      if (!parsed.success) throw invalid();
      cursor = { at: new Date(parsed.data.occurred_at), id: parsed.data.id };
    }
    const take = pageSize + 1;
    const range = filters.from || filters.to ? { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lt: filters.to } : {}) } : undefined;
    const user = filters.userId ? { userId: filters.userId } : {};

    const [payments, grants] = await Promise.all([
      filters.kind === 'grant' ? [] : this.prisma.billingTransaction.findMany({
        where: {
          ...user, ...(filters.kind ? { kind: filters.kind } : {}), ...(range ? { occurredAt: range } : {}),
          ...(cursor ? { OR: [{ occurredAt: { lt: cursor.at } }, { occurredAt: cursor.at, id: { lt: cursor.id } }] } : {}),
        } satisfies Prisma.BillingTransactionWhereInput,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take,
      }),
      filters.kind !== undefined && filters.kind !== 'grant' ? [] : this.prisma.entitlementGrant.findMany({
        where: {
          kind: 'plan', ...user, ...(range ? { createdAt: range } : {}),
          ...(cursor ? { OR: [{ createdAt: { lt: cursor.at } }, { createdAt: cursor.at, id: { lt: cursor.id } }] } : {}),
        } satisfies Prisma.EntitlementGrantWhereInput,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take,
      }),
    ]);

    const merged = [...payments.map(paymentItem), ...grants.map(grantItem)]
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
      .slice(0, take);
    const items = merged.slice(0, pageSize);
    const last = items.at(-1);
    return {
      items,
      next_page_token: merged.length > pageSize && last ? encodeBoundToken({ occurred_at: last.occurred_at, id: last.id }, binding) : null,
    };
  }
}

function withoutUser(item: Item): TransactionView {
  const view: Partial<Item> = { ...item };
  delete view.userId;
  return view as TransactionView;
}

type PaymentRow = Awaited<ReturnType<PrismaClient['billingTransaction']['findMany']>>[number];
type GrantRow = Awaited<ReturnType<PrismaClient['entitlementGrant']['findMany']>>[number];

function paymentItem(row: PaymentRow): Item {
  return {
    userId: row.userId, id: row.id, kind: row.kind as TransactionViewKind, plan: row.plan, interval: row.interval,
    amount_minor: row.amountMinor === null ? null : Number(row.amountMinor), currency: row.currency,
    occurred_at: row.occurredAt.toISOString(), period_start: row.periodStart.toISOString(), period_end: row.periodEnd?.toISOString() ?? null,
    status: row.status, provider: row.provider, provider_transaction_id: row.providerTransactionId,
  };
}

/** GI7: a plan grant, at the time it was made; a revoked one ends when it was revoked. No money, no provider. */
function grantItem(row: GrantRow): Item {
  const end = row.revokedAt !== null && row.revokedAt < row.endsAt ? row.revokedAt : row.endsAt;
  return {
    userId: row.userId, id: row.id, kind: 'grant', plan: row.plan ?? 'pro', interval: null, amount_minor: null, currency: null,
    occurred_at: row.createdAt.toISOString(), period_start: row.startsAt.toISOString(), period_end: end.toISOString(),
    status: 'succeeded', provider: null, provider_transaction_id: null,
  };
}
