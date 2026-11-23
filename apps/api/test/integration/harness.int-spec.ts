import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createIntegrationPrisma, type IntegrationPrisma } from './support/integration-prisma.js';

describe('Postgres integration test harness (A1.1)', () => {
  let db: IntegrationPrisma;

  beforeAll(async () => {
    db = await createIntegrationPrisma();
  });

  afterAll(async () => {
    await db?.close();
  });

  it('executes raw SQL against the isolated Postgres database', async () => {
    const rows = await db.prisma.$queryRaw<Array<{ one: number }>>`SELECT 1 AS one`;
    expect(rows).toEqual([{ one: 1 }]);
  });

  it('applies every committed Prisma migration', async () => {
    const migrationsDir = fileURLToPath(new URL('../../prisma/migrations', import.meta.url));
    const expected = readdirSync(migrationsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length;

    const rows = await db.prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL
    `;
    expect(rows).toEqual([{ n: expected }]);
  });
});
