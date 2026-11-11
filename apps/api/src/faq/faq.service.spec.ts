import { describe, expect, it } from 'vitest';
import { FakeClock } from '../common/clock/clock.js';
import { ProblemDetailsException } from '../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { FaqService } from './faq.service.js';

type Row = {
  id: string; position: number; question: string; answer: string; published: boolean; rowVersion: number;
  createdBy: string | null; createdAt: Date; updatedBy: string | null; updatedAt: Date;
};
type OrderBy = Array<Partial<Record<keyof Row, 'asc' | 'desc'>>>;

/** A table in memory that understands the few `where` / `orderBy` shapes the service uses. */
function fakePrisma() {
  const rows: Row[] = [];
  let seq = 0;
  const matches = (row: Row, where: Record<string, unknown> = {}) =>
    Object.entries(where).every(([key, want]) => (row as unknown as Record<string, unknown>)[key] === want);
  const sorted = (found: Row[], orderBy: OrderBy = []) => [...found].sort((a, b) => {
    for (const rule of orderBy) {
      const [key, dir] = Object.entries(rule)[0] as [keyof Row, 'asc' | 'desc'];
      const x = a[key] instanceof Date ? (a[key] as Date).getTime() : (a[key] as number);
      const y = b[key] instanceof Date ? (b[key] as Date).getTime() : (b[key] as number);
      if (x !== y) return (x < y ? -1 : 1) * (dir === 'asc' ? 1 : -1);
    }
    return 0;
  });
  const landingFaqItem = {
    findUnique: async ({ where }: { where: { id: string } }) => rows.find((row) => row.id === where.id) ?? null,
    findMany: async ({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: OrderBy }) =>
      sorted(rows.filter((row) => matches(row, where)), orderBy),
    create: async ({ data }: { data: Partial<Row> }) => {
      const row = { id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`, rowVersion: 1, published: false, ...data } as Row;
      rows.push(row);
      return row;
    },
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const hit = rows.filter((row) => matches(row, where));
      for (const row of hit) {
        for (const [key, value] of Object.entries(data)) {
          const inc = value as { increment?: number };
          (row as unknown as Record<string, unknown>)[key] = typeof value === 'object' && value !== null && 'increment' in inc
            ? row.rowVersion + (inc.increment as number) : value;
        }
      }
      return { count: hit.length };
    },
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      const hit = rows.filter((row) => matches(row, where));
      for (const row of hit) rows.splice(rows.indexOf(row), 1);
      return { count: hit.length };
    },
  };
  return { prisma: { landingFaqItem }, rows };
}

const ADMIN = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const MISSING = '99999999-9999-4999-8999-999999999999';
const identity = { emailsOf: async (ids: string[]) => new Map(ids.map((id) => [id, `${id.slice(0, 1)}@example.test`])) };

function setup() {
  const { prisma, rows } = fakePrisma();
  const clock = new FakeClock(new Date('2026-11-11T03:00:00.000Z'));
  const service = new FaqService(prisma as unknown as PrismaClient, identity as never, clock);
  return { service, rows, clock };
}

async function problem(promise: Promise<unknown>): Promise<{ status: number; type: string }> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ProblemDetailsException) return { status: error.getStatus(), type: error.problemType };
    throw error;
  }
  throw new Error('expected a problem');
}

describe('FaqService.published', () => {
  it('gives [] for an empty table', async () => {
    const { service } = setup();
    expect(await service.published()).toEqual([]);
  });

  it('returns only published items, by position, then creation order for a tie', async () => {
    const { service, clock } = setup();
    await service.create(ADMIN, { question: 'C', answer: 'c', position: 20, published: true });
    clock.advance(1000);
    await service.create(ADMIN, { question: 'Draft', answer: 'd', position: 5, published: false });
    clock.advance(1000);
    await service.create(ADMIN, { question: 'A', answer: 'a', position: 10, published: true });
    clock.advance(1000);
    await service.create(ADMIN, { question: 'B', answer: 'b', position: 10, published: true });
    expect(await service.published()).toEqual([
      { question: 'A', answer: 'a' }, { question: 'B', answer: 'b' }, { question: 'C', answer: 'c' },
    ]);
  });
});

describe('FaqService.list', () => {
  it('returns every item, drafts too, in the same order, with the author of the last change', async () => {
    const { service, clock } = setup();
    await service.create(ADMIN, { question: 'Late', answer: 'l', position: 30 });
    clock.advance(1000);
    await service.create(OTHER, { question: 'Early', answer: 'e', position: 10, published: true });
    const { items } = await service.list();
    expect(items.map((item) => [item.question, item.published])).toEqual([['Early', true], ['Late', false]]);
    expect(items[0].updated_by).toEqual({ id: OTHER, email: '2@example.test' });
  });

  it('shows updated_by null for an item seeded by the migration', async () => {
    const { service, rows } = setup();
    rows.push({
      id: 'seeded', position: 10, question: 'Q', answer: 'A', published: true, rowVersion: 1,
      createdBy: null, createdAt: new Date(0), updatedBy: null, updatedAt: new Date(0),
    });
    expect((await service.list()).items[0].updated_by).toBeNull();
  });
});

describe('FaqService.create', () => {
  it('writes row_version 1, the actor as creator and editor, and times from the clock', async () => {
    const { service, rows } = setup();
    const item = await service.create(ADMIN, { question: 'Q?', answer: 'A.', position: 15 });
    expect(item).toEqual({
      id: rows[0].id, position: 15, question: 'Q?', answer: 'A.', published: false, row_version: 1,
      updated_at: '2026-11-11T03:00:00.000Z', updated_by: { id: ADMIN, email: '1@example.test' },
    });
    expect(rows[0]).toMatchObject({
      createdBy: ADMIN, updatedBy: ADMIN,
      createdAt: new Date('2026-11-11T03:00:00.000Z'), updatedAt: new Date('2026-11-11T03:00:00.000Z'),
    });
  });
});

describe('FaqService.update', () => {
  it('with the right expected_version bumps row_version to 2 and records the editor', async () => {
    const { service, clock } = setup();
    const created = await service.create(ADMIN, { question: 'Q', answer: 'A', position: 10 });
    clock.advance(60_000);
    const updated = await service.update(created.id, OTHER, { expected_version: 1, published: true, answer: 'A2' });
    expect(updated).toEqual({
      id: created.id, position: 10, question: 'Q', answer: 'A2', published: true, row_version: 2,
      updated_at: '2026-11-11T03:01:00.000Z', updated_by: { id: OTHER, email: '2@example.test' },
    });
  });

  it('with a stale expected_version gives 409 faq-version-conflict and changes nothing', async () => {
    const { service, rows } = setup();
    const created = await service.create(ADMIN, { question: 'Q', answer: 'A', position: 10 });
    await service.update(created.id, ADMIN, { expected_version: 1, question: 'Q2' });
    expect(await problem(service.update(created.id, OTHER, { expected_version: 1, question: 'Q3' })))
      .toEqual({ status: 409, type: 'faq-version-conflict' });
    expect(rows[0]).toMatchObject({ question: 'Q2', rowVersion: 2, updatedBy: ADMIN });
  });

  it('of an unknown id gives 404 not-found', async () => {
    const { service } = setup();
    expect(await problem(service.update(MISSING, ADMIN, { expected_version: 1, question: 'Q' })))
      .toEqual({ status: 404, type: 'not-found' });
  });
});

describe('FaqService.remove', () => {
  it('deletes the item', async () => {
    const { service, rows } = setup();
    const created = await service.create(ADMIN, { question: 'Q', answer: 'A', position: 10 });
    await service.remove(created.id);
    expect(rows).toEqual([]);
  });

  it('of an unknown id gives 404 not-found', async () => {
    const { service } = setup();
    expect(await problem(service.remove(MISSING))).toEqual({ status: 404, type: 'not-found' });
  });
});
