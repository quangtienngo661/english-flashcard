import pg from 'pg';
import { describe, expect, inject, it } from 'vitest';

describe('DB connectivity', () => {
  it('connects to the Testcontainers Postgres and runs SELECT 1', async () => {
    const client = new pg.Client({ connectionString: inject('databaseUrl') });
    await client.connect();
    const res = await client.query('SELECT 1 AS ok');
    expect(res.rows[0].ok).toBe(1);
    await client.end();
  });
});
