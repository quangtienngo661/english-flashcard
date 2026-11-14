import { describe, expect, it, vi } from 'vitest';
import type { RuleResult } from './eval.types.js';
import { EvalRulesRegistry, RULE_OPERATIONS, ruleResultFor, type EvalRules } from './eval-rules.port.js';

const IN = { word: 'deploy' };
const OUT = { sentence: 'We ___ it.', accepted_answers: ['deploy'] };
const STUB_RESULT: RuleResult = { status: 'fail', problems: ['answer-mismatch'], reason: null };

function stubRules(): EvalRules {
  return {
    check: vi.fn(async () => STUB_RESULT),
    formsOf: vi.fn(async () => null),
    matchesExpected: vi.fn(() => true),
  };
}

describe('ruleResultFor', () => {
  it('B9: an operation with Practice rules but no registered port is skipped for no-rules', async () => {
    expect(await ruleResultFor(null, 'generate_cloze', IN, OUT)).toEqual({ status: 'skipped', problems: [], reason: 'no-rules' });
  });

  it('B9: an operation without Practice rules is not applicable, with or without a port', async () => {
    const rules = stubRules();
    expect(await ruleResultFor(null, 'lookup_word', IN, OUT)).toEqual({ status: 'not_applicable', problems: [], reason: null });
    expect(await ruleResultFor(rules, 'translate_sentence', IN, OUT)).toEqual({ status: 'not_applicable', problems: [], reason: null });
    expect(rules.check).not.toHaveBeenCalled();
  });

  it('B9: the port decides for the three operations with rules', async () => {
    const rules = stubRules();
    for (const op of RULE_OPERATIONS) expect(await ruleResultFor(rules, op, IN, OUT)).toBe(STUB_RESULT);
    expect(rules.check).toHaveBeenCalledTimes(3);
    expect(rules.check).toHaveBeenCalledWith('generate_cloze', IN, OUT);
  });

  it('design §5.2: the rule operations are cloze, meaning question and sentence choice', () => {
    expect([...RULE_OPERATIONS]).toEqual(['generate_cloze', 'generate_meaning_question', 'generate_sentence_mcq']);
  });
});

describe('EvalRulesRegistry', () => {
  it('E2: nothing is registered at first; the last registration wins (like the entry usage probes)', () => {
    const registry = new EvalRulesRegistry();
    expect(registry.get()).toBeNull();
    const [first, second] = [stubRules(), stubRules()];
    registry.register(first);
    expect(registry.get()).toBe(first);
    registry.register(second);
    expect(registry.get()).toBe(second);
  });
});
