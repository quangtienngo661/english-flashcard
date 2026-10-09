import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy } from 'wrangler';

export async function openTestD1(): Promise<{ db: D1Database; dispose(): Promise<void> }> {
  const { env, dispose } = await getPlatformProxy<CloudflareEnv>({
    configPath: fileURLToPath(new URL('../../wrangler.jsonc', import.meta.url)),
    persist: false,
  });
  const db = env.DB;
  const migrationsDir = new URL('../../migrations/', import.meta.url);
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const migration = await readFile(new URL(file, migrationsDir), 'utf8');
    for (const statement of migration.split(';')) {
      const sql = statement.trim();
      if (sql) await db.prepare(sql).run();
    }
  }

  return { db, dispose };
}
