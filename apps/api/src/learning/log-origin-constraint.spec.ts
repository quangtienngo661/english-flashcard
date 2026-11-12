import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Found by the round C smoke: `learning_log.origin` had `CHECK (origin = 'practice')`, so the first final answer of a recall session
// failed with a database error although every unit test, which mocks the database, passed. The code writes these origins; the last
// definition of the constraint in the migrations must allow all of them.
const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url);
const ORIGINS_WRITTEN = ['practice', 'recall'];

function lastOriginCheck(): string {
  let found = '';
  for (const folder of readdirSync(MIGRATIONS).filter((name) => /^\d{14}_/.test(name)).sort()) {
    const sql = readFileSync(new URL(`${folder}/migration.sql`, MIGRATIONS), 'utf8');
    for (const match of sql.matchAll(/"?learning_log_origin_check"?\s+CHECK\s*\(((?:[^()]|\([^()]*\))*)\)/gi)) found = match[1];
  }
  return found;
}

describe('learning_log.origin check constraint', () => {
  it('allows every origin the code writes', () => {
    const check = lastOriginCheck();
    expect(check, 'no migration defines learning_log_origin_check').not.toBe('');
    for (const origin of ORIGINS_WRITTEN) expect(check, `origin ${origin}`).toContain(`'${origin}'`);
  });

  it('the origins the code writes are the ones this test lists', () => {
    const sources = ['src/learning/practice/practice-review.service.ts', 'src/learning/practice/recall-answer.service.ts']
      .map((file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')).join('\n');
    const written = [...sources.matchAll(/origin:\s*'(\w+)'/g)].map((match) => match[1]).sort();
    expect(written).toEqual([...ORIGINS_WRITTEN].sort());
  });
});
