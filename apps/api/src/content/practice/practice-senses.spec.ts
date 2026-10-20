import { describe, expect, it, vi } from 'vitest';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { practiceCandidates, practiceSenses } from './practice-senses.js';

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
