import { Injectable } from '@nestjs/common';
import type { AiOperation } from '../ai.types.js';
import type { RuleResult } from './eval.types.js';
import type { ExpectedForms } from './expected.js';

/**
 * Practice's rules and catalog forms, as `ai` sees them (design §5.2, E2). `ai` never imports Practice or Content (R17 Bước 6);
 * Practice registers an implementation at `onModuleInit`.
 */
export type EvalRules = {
  check(op: AiOperation, input: Record<string, unknown>, output: Record<string, unknown>): Promise<RuleResult>;
  /** Every catalog form of the word with this part of speech (`unspecified` = any), or `null` when the catalog has none. */
  formsOf(word: string, partOfSpeech: string): Promise<string[] | null>;
  matchesExpected(op: 'generate_cloze' | 'generate_meaning_question', output: Record<string, unknown>, expected: ExpectedForms): boolean;
};

/** The operations that have Practice rules; the other three are `not_applicable` (design §5.2). */
export const RULE_OPERATIONS = ['generate_cloze', 'generate_meaning_question', 'generate_sentence_mcq'] as const;

/** Other modules register their rules when they start (as `EntryUsageRegistry` does); the last registration wins. */
@Injectable()
export class EvalRulesRegistry {
  private rules: EvalRules | null = null;

  register(rules: EvalRules): void {
    this.rules = rules;
  }

  get(): EvalRules | null {
    return this.rules;
  }
}

const NOT_APPLICABLE: RuleResult = { status: 'not_applicable', problems: [], reason: null };

export async function ruleResultFor(
  rules: EvalRules | null,
  op: AiOperation,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
): Promise<RuleResult> {
  if (!(RULE_OPERATIONS as readonly string[]).includes(op)) return { ...NOT_APPLICABLE };
  if (!rules) return { status: 'skipped', problems: [], reason: 'no-rules' };
  return rules.check(op, input, output);
}
