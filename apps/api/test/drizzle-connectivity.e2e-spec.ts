import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, expect, inject, it } from 'vitest';
import { DRIZZLE_DB, DrizzleModule } from '../src/common/db/drizzle.module.js';

describe('Drizzle connectivity', () => {
  it('runs a query through the Drizzle client against the Testcontainers Postgres', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DrizzleModule.forRoot({ connectionString: inject('databaseUrl') })],
    }).compile();

    const db = moduleRef.get<NodePgDatabase>(DRIZZLE_DB);
    const res = await db.execute(sql`SELECT 1 AS ok`);
    expect(res.rows[0].ok).toBe(1);

    await moduleRef.close();
  });
});
