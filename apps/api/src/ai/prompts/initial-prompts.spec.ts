import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AI_SYSTEM_ACTOR_ID } from '../ai.constants.js';
import { AI_OPERATIONS } from '../ai.types.js';
import { INITIAL_PROMPTS } from './initial-prompts.js';
import { promptViolations } from './prompt-rules.js';

const MIGRATIONS = join(import.meta.dirname, '../../../prisma/migrations');
// Bước 6 seeds the first three operations; Bước 7 seeds three more and generate_cloze revision 2 (plan Task 6).
const folders = readdirSync(MIGRATIONS).filter((name) => name.endsWith('_ai_initial_prompts') || name.endsWith('_buoc7_ai_operations'));
// A Windows checkout may turn the file's line endings into CRLF; the migration strips \r the same way.
const migration = (folder: string) => readFileSync(join(MIGRATIONS, folder, 'migration.sql'), 'utf8').replace(/\r\n/g, '\n');

describe('initial prompts', () => {
  it('every initial prompt passes promptViolations', () => {
    for (const op of AI_OPERATIONS) {
      expect(INITIAL_PROMPTS[op].instructions.length, op).toBeGreaterThan(0);
      expect(INITIAL_PROMPTS[op].examples.length, op).toBeGreaterThan(0);
      expect(promptViolations(op, INITIAL_PROMPTS[op]), op).toEqual([]);
    }
  });

  it('some seed migration contains each instructions text and each JSON.stringify(examples) verbatim', () => {
    expect(folders).toHaveLength(2);
    const sql = folders.map(migration).join('\n').replace(/''/g, "'");
    for (const op of AI_OPERATIONS) {
      expect(sql, op).toContain(`$p$${INITIAL_PROMPTS[op].instructions}$p$`);
      expect(sql, op).toContain(`'${JSON.stringify(INITIAL_PROMPTS[op].examples)}'::jsonb`);
    }
  });

  it('each seeded row has one $p$ pair: two markers per examples literal', () => {
    for (const folder of folders) {
      const sql = migration(folder);
      expect(sql.match(/\$p\$/g)?.length, folder).toBe(2 * (sql.match(/'::jsonb/g)?.length ?? 0));
    }
  });

  it('generate_cloze revision 2 replaces only the untouched revision 1 of the system actor (design §15, R13)', () => {
    const sql = migration(folders.find((name) => name.endsWith('_buoc7_ai_operations')) ?? 'missing');
    expect(sql).toContain(
      `WHERE "operation" = 'generate_cloze' AND "revision" = 1 AND "updated_by" = '${AI_SYSTEM_ACTOR_ID}'`,
    );
    expect(sql).toContain('SELECT "operation", "instructions", "examples", "revision", "updated_by" FROM updated;');
  });
});
