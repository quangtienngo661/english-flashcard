import { describe, expect, it } from 'vitest';
import { SESSION_WORDS_MAX } from '../../ai/index.js';
import { SCOPE_QUESTIONS_MAX } from '../../settings/index.js';
import { aiCapOf, placementOf, ruleTypesFor, sessionMaxOf, withoutAi } from './session-limits.js';

const fixed = (max: number) => ({ sessionMaxMode: 'fixed' as const, maxQuestionsPerSession: max });
const scope = { sessionMaxMode: 'scope_words' as const, maxQuestionsPerSession: 20 };
const percent = (pct: number) => ({ aiMaxMode: 'percent' as const, aiMaxFixed: 5, aiMaxPercent: pct });
const fixedAi = (n: number) => ({ aiMaxMode: 'fixed' as const, aiMaxFixed: n, aiMaxPercent: 50 });

describe('session limits (practice ai count, 09/11/2026)', () => {
  describe('sessionMaxOf', () => {
    it('fixed 20 with a scope of 4 words → 20', () => {
      expect(sessionMaxOf(fixed(20), 4)).toBe(20);
    });

    it('scope_words is the scope word count, capped at 100: 4 → 4, 1 → 1, 100 → 100, 101 → 100, 300 → 100', () => {
      expect([4, 1, 100, 101, 300].map((words) => sessionMaxOf(scope, words))).toEqual([4, 1, 100, 100, 100]);
    });
  });

  describe('aiCapOf', () => {
    it('percent 50 rounds down: 7 → 3, 10 → 5, 20 → 10, 1 → 0', () => {
      expect([7, 10, 20, 1].map((target) => aiCapOf(percent(50), target))).toEqual([3, 5, 10, 0]);
    });

    it('percent 10 with 5 → 0', () => {
      expect(aiCapOf(percent(10), 5)).toBe(0);
    });

    it('percent 100 with 10 → 10', () => {
      expect(aiCapOf(percent(100), 10)).toBe(10);
    });

    it('percent 0 with 10 → 0', () => {
      expect(aiCapOf(percent(0), 10)).toBe(0);
    });

    it('percent 33 with 3 → 0', () => {
      expect(aiCapOf(percent(33), 3)).toBe(0);
    });

    it('fixed 5 with 10 → 5', () => {
      expect(aiCapOf(fixedAi(5), 10)).toBe(5);
    });

    it('fixed 15 with 10 → 10 (never above the session)', () => {
      expect(aiCapOf(fixedAi(15), 10)).toBe(10);
    });

    it('fixed 0 with 10 → 0', () => {
      expect(aiCapOf(fixedAi(0), 10)).toBe(0);
    });
  });

  describe('placementOf', () => {
    it('admin even, body random → even', () => {
      expect(placementOf('even', 'random')).toBe('even');
    });

    it('admin random, body empty → random', () => {
      expect(placementOf('random', undefined)).toBe('random');
    });

    it('admin learner, body empty → even', () => {
      expect(placementOf('learner', undefined)).toBe('even');
    });

    it('admin learner, body random → random', () => {
      expect(placementOf('learner', 'random')).toBe('random');
    });
  });

  describe('withoutAi', () => {
    it('drops the AI types and an AI cloze; the source becomes null', () => {
      expect(withoutAi(['mcq_definition', 'meaning_in_sentence', 'cloze'], 'ai')).toEqual({ types: ['mcq_definition'], clozeSource: null });
    });

    it('own_then_ai keeps cloze and becomes own', () => {
      expect(withoutAi(['cloze', 'mcq_sentence'], 'own_then_ai')).toEqual({ types: ['cloze'], clozeSource: 'own' });
    });

    it('own cloze is unchanged', () => {
      expect(withoutAi(['cloze'], 'own')).toEqual({ types: ['cloze'], clozeSource: 'own' });
    });
  });

  describe('ruleTypesFor', () => {
    it('AI cloze and mcq_sentence are not rule types', () => {
      expect(ruleTypesFor(['mcq_definition', 'cloze', 'mcq_sentence'], 'ai')).toEqual(['mcq_definition']);
    });

    it('own_then_ai cloze is both an AI and a rule type', () => {
      expect(ruleTypesFor(['cloze'], 'own_then_ai')).toEqual(['cloze']);
    });

    it('own cloze is a rule type', () => {
      expect(ruleTypesFor(['cloze'], 'own')).toEqual(['cloze']);
    });
  });

  it('the scope ceiling is one more than the session words sent to AI', () => {
    expect(SCOPE_QUESTIONS_MAX).toBe(SESSION_WORDS_MAX + 1);
  });
});
