import { Test } from '@nestjs/testing';
import { describe, expect, inject, it } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../src/common/db/prisma.module.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';

describe('Prisma connectivity', () => {
  it('runs a query through the Prisma client against the Testcontainers Postgres', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule.forRoot({ connectionString: inject('databaseUrl') })],
    }).compile();

    const prisma = moduleRef.get<PrismaClient>(PRISMA_CLIENT);
    try {
      const res = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
      expect(res[0].ok).toBe(1);
    } finally {
      await prisma.$disconnect();
      await moduleRef.close();
    }
  });
});
