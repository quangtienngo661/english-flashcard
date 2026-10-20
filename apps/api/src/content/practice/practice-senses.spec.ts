import { describe, expect, it, vi } from 'vitest';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { practiceCandidates, practiceLemmaMeanings, practiceSenses } from './practice-senses.js';

const userId = '00000000-0000-4000-8000-000000000001';
const senseId = '00000000-0000-4000-8000-0000000000a1';
const clientWith = () => ({ $queryRaw: vi.fn(async () => []) });

describe('practiceSenses / practiceCandidates — read through the client they are given (PX4)', () => {
  it('PX4: both run their one statement on the given client', async () => {
    const prisma = clientWith();
    const tx = clientWith();
    await practiceSenses(tx as unknown as Prisma.TransactionClient, userId, [senseId], 'vi');
    await practiceCandidates(tx as unknown as Prisma.TransactionClient, userId, [senseId], 'vi');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    await practiceSenses(prisma as unknown as PrismaClient, userId, [senseId], 'vi');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
});

describe('practiceLemmaMeanings — scoped so the lemma indexes can be used (T6)', () => {
  it('states the entry scope and open/live conditions on the rows themselves, bounded by the lemmas', async () => {
    const client = clientWith();
    await practiceLemmaMeanings(client as unknown as PrismaClient, userId, ['Quick']);
    const [strings, ...values] = client.$queryRaw.mock.calls[0] as unknown as [string[], ...unknown[]];
    type Part = { strings: string[]; values: unknown[] };
    const render = (parts: string[], vals: unknown[]): string => parts.reduce((out, part, i) => {
      const v = vals[i - 1];
      const inner = typeof v === 'object' && v !== null && 'strings' in v ? render((v as Part).strings, (v as Part).values) : '?';
      return out + inner + part;
    });
    const text = render([...strings], values);
    expect(text).toMatch(/\be\.scope = 'catalog'/);
    expect(text).toMatch(/\be\.owner_user_id/);
    expect(text).toMatch(/\bs\.state = 'open'/);
    expect(text).toContain('lower(e.lemma) = ANY');
    expect(values).toContainEqual(['quick']);
  });
});
