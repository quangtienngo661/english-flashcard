import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { inject } from 'vitest';

export async function createIsolatedDatabase(): Promise<string> {
  const sharedUrl = inject('databaseUrl');
  const name = `test_${randomUUID().replaceAll('-', '')}`;
  const client = new pg.Client({ connectionString: sharedUrl });
  await client.connect();
  try {
    // The identifier contains only our fixed prefix and random hexadecimal digits.
    await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }
  const url = new URL(sharedUrl);
  url.pathname = `/${name}`;
  const databaseUrl = url.toString();
  // Invoke the installed Prisma CLI directly: no shell or package-manager download.
  const cli = fileURLToPath(import.meta.resolve('prisma/build/index.js'));
  execFileSync(process.execPath, [cli, 'migrate', 'deploy'], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
  return databaseUrl;
}
