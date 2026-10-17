import { spawnSync } from 'node:child_process';
import { describe, expect, inject, it } from 'vitest';

// Runs against the database the global setup migrated from prisma/migrations.
const diff = (databaseUrl: string) => spawnSync(
  'pnpm', ['exec', 'prisma', 'migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma', '--exit-code', '--script'],
  { env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: 'utf8', shell: process.platform === 'win32' },
);

describe('schema drift (e2e)', () => {
  it('migrate diff between the migrated database and prisma/models is empty (model moves such as MailBudgetBucket keep the table)', () => {
    const result = diff(inject('databaseUrl'));
    expect(result.stdout + result.stderr).toContain('empty migration');
    expect(result.status).toBe(0);
  }, 60_000);
});
