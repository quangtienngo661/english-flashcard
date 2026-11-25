import { describe, expect, it } from 'vitest';
import { findDestructive } from './check-migrations.mjs';

describe('findDestructive (OPS-05)', () => {
  it.each([
    'DROP TABLE "x";',
    'ALTER TABLE "users" DROP COLUMN "a";',
    'ALTER TABLE t ALTER COLUMN c SET NOT NULL;',
    'ALTER TABLE t RENAME COLUMN a TO b;',
    'ALTER TABLE t ALTER COLUMN c TYPE text;',
    'ALTER TABLE t ALTER COLUMN c SET DATA TYPE text;',
  ])('flags destructive SQL: %s', (sql) => {
    expect(findDestructive(sql)).toHaveLength(1);
  });

  it.each([
    'ALTER TABLE t ADD COLUMN x int NOT NULL DEFAULT 0;',
    'DROP INDEX i;',
    'DROP CONSTRAINT k;',
    'ALTER TABLE t ALTER COLUMN c DROP NOT NULL;',
  ])('does not flag safe SQL: %s', (sql) => {
    expect(findDestructive(sql)).toEqual([]);
  });

  it('flags two DROP COLUMN clauses in one statement as 2 findings', () => {
    const sql = 'ALTER TABLE "users" DROP COLUMN "failed_login_count", DROP COLUMN "login_locked_until";';
    expect(findDestructive(sql)).toHaveLength(2);
  });

  it('allows destructive SQL when a -- destructive-ok: marker line is present', () => {
    const sql = [
      '-- destructive-ok: contract step after 2026-11-12 deploy',
      'ALTER TABLE "users" DROP COLUMN "failed_login_count", DROP COLUMN "login_locked_until";',
    ].join('\n');
    expect(findDestructive(sql)).toEqual([]);
  });
});
