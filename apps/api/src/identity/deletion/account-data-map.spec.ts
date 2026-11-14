import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ACCOUNT_DATA_MAP } from './account-data-map.js';

const MODELS_DIR = fileURLToPath(new URL('../../../prisma/models/', import.meta.url));
const POINTS_AT_USER = /^(user_id|.*_user_id|.*_by)$/;

/** Every `table.column` of every model, from the `.prisma` files (`@map` names win over field names). */
function schemaColumns(): { all: Set<string>; pointers: string[] } {
  const all = new Set<string>();
  const pointers: string[] = [];
  for (const file of readdirSync(MODELS_DIR).filter((name) => name.endsWith('.prisma'))) {
    const text = readFileSync(MODELS_DIR + file, 'utf8');
    for (const model of text.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
      const table = /@@map\("([^"]+)"\)/.exec(model[2])?.[1] ?? model[1];
      for (const line of model[2].split('\n')) {
        const field = /^\s+(\w+)\s+[\w[\]?]+/.exec(line);
        if (!field || line.trim().startsWith('//') || line.trim().startsWith('@@')) continue;
        const column = /@map\("([^"]+)"\)/.exec(line)?.[1] ?? field[1];
        all.add(`${table}.${column}`);
        if (POINTS_AT_USER.test(column)) pointers.push(`${table}.${column}`);
      }
    }
  }
  return { all, pointers };
}

describe('every column that points at a user has an owner (B8A7)', () => {
  const { all, pointers } = schemaColumns();

  it('the parser sees the known pointer columns (control: it is not reading nothing)', () => {
    expect(pointers.length).toBeGreaterThanOrEqual(54);
    expect(pointers).toContain('practice_reports.user_id');
    expect(pointers).toContain('user_identities.user_id');
  });

  it('no pointer column is missing from ACCOUNT_DATA_MAP', () => {
    const missing = pointers.filter((column) => !(column in ACCOUNT_DATA_MAP));
    expect(missing, `Declare these columns in account-data-map.ts: ${missing.join(', ')}`).toEqual([]);
  });

  it('no entry of ACCOUNT_DATA_MAP names a column that does not exist (typo or dropped column)', () => {
    const stale = Object.keys(ACCOUNT_DATA_MAP).filter((column) => !all.has(column));
    expect(stale).toEqual([]);
  });
});
