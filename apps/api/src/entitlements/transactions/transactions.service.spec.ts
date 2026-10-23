import { describe, expect, it, vi } from 'vitest';
import { TransactionsService } from './transactions.service.js';

const LAN = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const MINH = '1b2c3d4e-0000-4000-8000-000000000002';
const at = (iso: string) => new Date(iso);

type Tx = Record<string, unknown> & { id: string; userId: string; occurredAt: Date };
type Grant = Record<string, unknown> & { id: string; userId: string; createdAt: Date };

const tx = (id: string, userId: string, occurredAt: string, fields: Record<string, unknown> = {}): Tx => ({
  id, userId, subscriptionId: 'sub-1', kind: 'renewal', plan: 'pro', interval: 'month', amountMinor: 99000n, currency: 'VND',
  occurredAt: at(occurredAt), periodStart: at(occurredAt), periodEnd: at('2026-11-14T00:00:00Z'), status: 'succeeded', provider: 'fake',
  environment: 'sandbox', providerTransactionId: `fake_${id}`, createdAt: at(occurredAt), ...fields,
});
const grant = (id: string, userId: string, createdAt: string, fields: Record<string, unknown> = {}): Grant => ({
  id, userId, kind: 'plan', plan: 'pro', startsAt: at('2026-10-15T00:00:00Z'), endsAt: at('2026-12-31T17:00:00Z'), revokedAt: null,
  createdAt: at(createdAt), ...fields,
});

/** Applies the where the service builds: userId, kind, occurred/created range and the keyset cursor. */
function inRange(date: Date, range: { gte?: Date; lt?: Date } | undefined) {
  return !range || ((!range.gte || date >= range.gte) && (!range.lt || date < range.lt));
}
function afterCursor(date: Date, id: string, or: Array<Record<string, unknown>> | undefined, field: string) {
  if (!or) return true;
  const [older, same] = or as [Record<string, { lt: Date }>, Record<string, unknown> & { id: { lt: string } }];
  return date < older[field].lt || (date.getTime() === (same[field] as Date).getTime() && id < same.id.lt);
}
function setup(rows: { txs?: Tx[]; grants?: Grant[] } = {}) {
  const txs = rows.txs ?? [];
  const grants = rows.grants ?? [];
  const sortDesc = <T extends { id: string }>(list: T[], key: (r: T) => Date) =>
    [...list].sort((a, b) => key(b).getTime() - key(a).getTime() || (a.id < b.id ? 1 : -1));
  const prisma = {
    billingTransaction: {
      findMany: vi.fn(async ({ where, take }: { where: Record<string, any>; take: number }) => sortDesc(txs.filter((r) =>
        (!where.userId || r.userId === where.userId) && (!where.kind || r.kind === where.kind) && inRange(r.occurredAt, where.occurredAt)
        && afterCursor(r.occurredAt, r.id, where.OR, 'occurredAt')), (r) => r.occurredAt).slice(0, take)),
    },
    entitlementGrant: {
      findMany: vi.fn(async ({ where, take }: { where: Record<string, any>; take: number }) => sortDesc(grants.filter((r) =>
        r.kind === where.kind && (!where.userId || r.userId === where.userId) && inRange(r.createdAt, where.createdAt)
        && afterCursor(r.createdAt, r.id, where.OR, 'createdAt')), (r) => r.createdAt).slice(0, take)),
    },
  };
  const identity = {
    findUserIdByEmail: vi.fn(async (email: string) => (email === 'lan@example.com' ? LAN : null)),
    emailsOf: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, id === LAN ? 'lan@example.com' : 'minh@example.com']))),
  };
  return { service: new TransactionsService(prisma as never, identity as never), prisma, identity };
}

describe('TransactionsService (learner UI design §8.9)', () => {
  it('GI8: a learner sees only their own rows, newest first, with no user field', async () => {
    const { service } = setup({ txs: [tx('a1', LAN, '2026-10-15T02:12:00Z'), tx('b1', MINH, '2026-10-16T00:00:00Z'),
      tx('a2', LAN, '2026-08-15T00:00:00Z', { kind: 'purchase' })] });
    const page = await service.forLearner(LAN, { page_size: 20 });
    expect(page.items.map((i) => i.id)).toEqual(['a1', 'a2']);
    expect(page.items[0]).toEqual({
      id: 'a1', kind: 'renewal', plan: 'pro', interval: 'month', amount_minor: 99000, currency: 'VND',
      occurred_at: '2026-10-15T02:12:00.000Z', period_start: '2026-10-15T02:12:00.000Z', period_end: '2026-11-14T00:00:00.000Z',
      status: 'succeeded', provider: 'fake', provider_transaction_id: 'fake_a1',
    });
    expect(page.next_page_token).toBeNull();
  });

  it('GI7: a plan grant is merged as kind grant, by the time it was made; a revoked one ends on the revoke date; limits grants are left out', async () => {
    const { service } = setup({
      txs: [tx('t1', LAN, '2026-10-15T02:12:00Z')],
      grants: [
        grant('g1', LAN, '2026-10-20T03:00:00Z', { revokedAt: at('2026-11-01T05:00:00Z') }),
        grant('g2', LAN, '2026-10-01T00:00:00Z', { kind: 'limits', plan: null }),
      ],
    });
    const page = await service.forLearner(LAN, { page_size: 20 });
    expect(page.items.map((i) => [i.id, i.kind])).toEqual([['g1', 'grant'], ['t1', 'renewal']]);
    expect(page.items[0]).toEqual({
      id: 'g1', kind: 'grant', plan: 'pro', interval: null, amount_minor: null, currency: null, occurred_at: '2026-10-20T03:00:00.000Z',
      period_start: '2026-10-15T00:00:00.000Z', period_end: '2026-11-01T05:00:00.000Z', status: 'succeeded', provider: null,
      provider_transaction_id: null,
    });
  });

  it('pages through both sources in one order (occurred_at desc, id desc) without gaps or repeats', async () => {
    const same = '2026-10-10T00:00:00Z';
    const { service } = setup({
      txs: [tx('t3', LAN, '2026-10-30T00:00:00Z'), tx('t2', LAN, same), tx('t1', LAN, '2026-10-01T00:00:00Z')],
      grants: [grant('g9', LAN, same), grant('g1', LAN, '2026-10-20T00:00:00Z')],
    });
    const seen: string[] = [];
    let token: string | undefined;
    do {
      const page = await service.forLearner(LAN, { page_size: 2, page_token: token });
      seen.push(...page.items.map((i) => i.id));
      token = page.next_page_token ?? undefined;
    } while (token);
    expect(seen).toEqual(['t3', 'g1', 't2', 'g9', 't1']);
  });

  it('a bad page_token, or one made for other filters or another learner, is 400 validation-failed', async () => {
    const { service } = setup({ txs: [tx('t2', LAN, '2026-10-02T00:00:00Z'), tx('t1', LAN, '2026-10-01T00:00:00Z')] });
    const first = await service.forLearner(LAN, { page_size: 1 });
    expect(first.next_page_token).not.toBeNull();
    for (const call of [
      () => service.forLearner(LAN, { page_size: 1, page_token: 'not-a-token' }),
      () => service.forLearner(MINH, { page_size: 1, page_token: first.next_page_token! }),
      () => service.forAdmin({ page_size: 1, page_token: first.next_page_token! }),
    ]) {
      await expect(call()).rejects.toMatchObject({ problemType: 'validation-failed', status: 400 });
    }
  });

  it('admin: every learner with user { id, email }; filters by email, kind and [from, to)', async () => {
    const { service } = setup({
      txs: [tx('t1', LAN, '2026-10-15T02:12:00Z'), tx('t2', MINH, '2026-10-20T07:03:00Z', { kind: 'purchase' }),
        tx('t3', LAN, '2026-09-15T00:00:00Z', { kind: 'plan_change' })],
      grants: [grant('g1', MINH, '2026-10-22T03:20:00Z')],
    });
    const all = await service.forAdmin({ page_size: 20 });
    expect(all.items.map((i) => [i.id, i.user])).toEqual([
      ['g1', { id: MINH, email: 'minh@example.com' }], ['t2', { id: MINH, email: 'minh@example.com' }],
      ['t1', { id: LAN, email: 'lan@example.com' }], ['t3', { id: LAN, email: 'lan@example.com' }],
    ]);
    expect((await service.forAdmin({ page_size: 20, email: 'lan@example.com' })).items.map((i) => i.id)).toEqual(['t1', 't3']);
    expect((await service.forAdmin({ page_size: 20, kind: 'grant' })).items.map((i) => i.id)).toEqual(['g1']);
    expect((await service.forAdmin({ page_size: 20, kind: 'purchase' })).items.map((i) => i.id)).toEqual(['t2']);
    expect((await service.forAdmin({ page_size: 20, from: '2026-10-01T00:00:00Z', to: '2026-10-20T07:03:00Z' })).items.map((i) => i.id))
      .toEqual(['t1']);
  });

  it('admin: an unknown email is an empty list without reading the tables', async () => {
    const { service, prisma } = setup({ txs: [tx('t1', LAN, '2026-10-15T02:12:00Z')] });
    expect(await service.forAdmin({ page_size: 20, email: 'nobody@example.com' })).toEqual({ items: [], next_page_token: null });
    expect(prisma.billingTransaction.findMany).not.toHaveBeenCalled();
    expect(prisma.entitlementGrant.findMany).not.toHaveBeenCalled();
  });
});
