import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AI_SYSTEM_ACTOR_ID, JUDGE_CODE_PATTERN, JUDGE_CRITERIA_MAX, JUDGE_NAME_MAX, JUDGE_QUESTION_MAX,
} from '../ai.constants.js';
import { AI_OPERATIONS } from '../ai.types.js';
import { INITIAL_JUDGE } from './initial-judges.js';

const MIGRATIONS = join(import.meta.dirname, '../../../prisma/migrations');
const folders = readdirSync(MIGRATIONS).filter((name) => name.endsWith('_nhom_b_m3_judge'));
// A Windows checkout may turn the file's line endings into CRLF; the migration strips \r the same way.
const sql = (): string => readFileSync(join(MIGRATIONS, folders[0] ?? 'missing', 'migration.sql'), 'utf8').replace(/\r\n/g, '\n');

describe('initial judge (nhóm B M3, D12, D33)', () => {
  it('is "Chỉ một đáp án" for generate_cloze with one criterion, inside the limits a saved judge must meet', () => {
    expect(INITIAL_JUDGE.name).toBe('Chỉ một đáp án');
    expect(INITIAL_JUDGE.name.length).toBeLessThanOrEqual(JUDGE_NAME_MAX);
    expect(INITIAL_JUDGE.operations).toEqual(['generate_cloze']);
    for (const operation of INITIAL_JUDGE.operations) expect(AI_OPERATIONS).toContain(operation);
    expect(INITIAL_JUDGE.criteria.map((criterion) => criterion.code)).toEqual(['single_answer']);
    expect(INITIAL_JUDGE.criteria.length).toBeLessThanOrEqual(JUDGE_CRITERIA_MAX);
    for (const criterion of INITIAL_JUDGE.criteria) {
      expect(criterion.code).toMatch(JUDGE_CODE_PATTERN);
      expect(criterion.question.length).toBeGreaterThan(0);
      expect(criterion.question.length).toBeLessThanOrEqual(JUDGE_QUESTION_MAX);
    }
    expect(INITIAL_JUDGE.examples).toEqual([]);
    expect(INITIAL_JUDGE.instructions.length).toBeGreaterThan(0);
  });

  it('JUDGE_CODE_PATTERN takes snake_case codes of at most 40 characters and nothing else', () => {
    for (const code of ['single_answer', 'a', 'natural_2']) expect(code, code).toMatch(JUDGE_CODE_PATTERN);
    for (const code of ['', 'Single', '1abc', 'with space', 'a-b', 'a'.repeat(41)]) expect(code, code).not.toMatch(JUDGE_CODE_PATTERN);
  });

  it('exactly one migration seeds it: the instructions between $p$ markers and the criteria as JSON, verbatim', () => {
    expect(folders).toHaveLength(1);
    const text = sql().replace(/''/g, "'");
    expect(text).toContain(`$p$${INITIAL_JUDGE.instructions}$p$`);
    expect(text).toContain(`'${JSON.stringify(INITIAL_JUDGE.criteria)}'::jsonb`);
    expect(text).toContain(`'${INITIAL_JUDGE.name}'`);
    expect(sql().match(/\$p\$/g)?.length).toBe(2);
  });

  it('the seed is made by the system actor and names no model (an admin chooses one)', () => {
    const text = sql();
    expect(text).toContain(`'${AI_SYSTEM_ACTOR_ID}'`);
    expect(text).toMatch(/"model_ref"/);
    expect(text).toMatch(/'\[\]'::jsonb, NULL, '/);
  });

  it('the migration adds the CHECKs and the one-active-pass index the schema file only comments', () => {
    const text = sql();
    for (const name of [
      'ai_judges_operations_check', 'ai_judge_passes_one_active_key', 'ai_judge_passes_kind_check', 'ai_judge_passes_status_check',
      'ai_judge_passes_kind_run_check', 'ai_judge_scores_verdict_check', 'ai_labels_verdict_check', 'ai_calls_purpose_check',
    ]) expect(text, name).toContain(name);
    expect(text).toMatch(/ai_calls_purpose_check[\s\S]*'judge'/);
  });
});
