import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AI_OPERATIONS } from '../ai.types.js';
import { INITIAL_PROMPTS } from './initial-prompts.js';
import { promptViolations } from './prompt-rules.js';

const MIGRATIONS = join(import.meta.dirname, '../../../prisma/migrations');
const folder = readdirSync(MIGRATIONS).find((name) => name.endsWith('_ai_initial_prompts'));
// A Windows checkout may turn the file's line endings into CRLF; the migration strips \r the same way.
const migration = () => readFileSync(join(MIGRATIONS, folder ?? 'missing', 'migration.sql'), 'utf8').replace(/\r\n/g, '\n');

describe('initial prompts', () => {
  it('every initial prompt passes promptViolations', () => {
    for (const op of AI_OPERATIONS) {
      expect(INITIAL_PROMPTS[op].instructions.length, op).toBeGreaterThan(0);
      expect(INITIAL_PROMPTS[op].examples.length, op).toBeGreaterThan(0);
      expect(promptViolations(op, INITIAL_PROMPTS[op]), op).toEqual([]);
    }
  });

  it('the seed migration contains each instructions text and each JSON.stringify(examples) verbatim', () => {
    expect(folder).toBeDefined();
    const sql = migration().replace(/''/g, "'");
    for (const op of AI_OPERATIONS) {
      expect(sql, op).toContain(`$p$${INITIAL_PROMPTS[op].instructions}$p$`);
      expect(sql, op).toContain(`'${JSON.stringify(INITIAL_PROMPTS[op].examples)}'::jsonb`);
    }
    expect(sql.match(/\$p\$/g)).toHaveLength(12);
  });
});
