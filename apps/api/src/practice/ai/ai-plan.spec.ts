import { describe, expect, it } from 'vitest';
import { aiBudget, aiChanceInLaterRound, aiNeeded, aiPlanned, markAiSenses } from './ai-plan.js';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `s${i + 1}`);

describe('markAiSenses (design §6.1 step 3)', () => {
  it('B7E45: 10 kept, all AI-capable, none unseen, limit 5 → positions 2, 4, 6, 8, 10', () => {
    const kept = ids(10);
    expect(markAiSenses(kept, new Set(kept), new Set(), 5)).toEqual(['s2', 's4', 's6', 's8', 's10']);
  });

  it('B7E46: 4 kept, limit 5 → all 4', () => {
    const kept = ids(4);
    expect(markAiSenses(kept, new Set(kept), new Set(), 5)).toEqual(kept);
  });

  it('words with an unseen AI question come first, the rest spread over what is left', () => {
    const kept = ids(10);
    // s1 and s3 have unseen questions; 3 more spread over the 8 others (s2, s4–s10) → 3rd, 6th, 8th of them.
    expect(markAiSenses(kept, new Set(kept), new Set(['s1', 's3']), 5)).toEqual(['s1', 's3', 's5', 's8', 's10']);
  });

  it('only AI-capable words are marked (R5: 2 with a Vietnamese meaning → 2)', () => {
    const kept = ids(10);
    expect(markAiSenses(kept, new Set(['s3', 's7']), new Set(), 5)).toEqual(['s3', 's7']);
  });

  it('an unseen question of a word that is not AI-capable does not mark it; limit 0 marks nothing', () => {
    const kept = ids(4);
    expect(markAiSenses(kept, new Set(['s2']), new Set(['s1']), 2)).toEqual(['s2']);
    expect(markAiSenses(kept, new Set(kept), new Set(['s1']), 0)).toEqual([]);
  });
});

describe('aiPlanned (design §6.1 step 4)', () => {
  it('B7E45: typing + AI cloze, 10 questions, 10 words all marked to 5 → 5', () => {
    expect(aiPlanned(10, 2, 1, 5, 10)).toBe(5);
  });

  it('R5: as above but only 2 words with a Vietnamese meaning → min(5, 2 + 0) = 2', () => {
    expect(aiPlanned(10, 2, 1, 2, 10)).toBe(2);
  });

  it('AI types only, 10 questions, 10 capable words → 10', () => {
    expect(aiPlanned(10, 3, 3, 10, 10)).toBe(10);
  });

  it('B7E46: 10 questions, 4 words, typing + AI cloze → min(5, 4 + 6) = 5', () => {
    expect(aiPlanned(10, 2, 1, 4, 4)).toBe(5);
  });

  it('no AI type chosen → 0', () => {
    expect(aiPlanned(10, 2, 0, 0, 10)).toBe(0);
  });
});

describe('aiNeeded (design §6.1 step 5)', () => {
  it('B7E2: 5 planned, no unseen question → 5', () => {
    expect(aiNeeded(5, 0)).toBe(5);
  });

  it('B7E3: 5 planned, 2 marked words with an unseen question → 3', () => {
    expect(aiNeeded(5, 2)).toBe(3);
  });

  it('more unseen than planned → 0', () => {
    expect(aiNeeded(2, 3)).toBe(0);
  });
});

describe('aiBudget (design §6.3, R9)', () => {
  it('planned − asked AI items (void included) − pending requests', () => {
    // 5 planned; 2 asked AI items, one of them void, both counted; 1 request generating or ready and unattached.
    expect(aiBudget(5, 2, 1)).toBe(2);
  });

  it('never below 0', () => {
    expect(aiBudget(2, 2, 1)).toBe(0);
  });
});

describe('aiChanceInLaterRound (design §6.3)', () => {
  it('r ÷ q, capped to 0..1', () => {
    expect(aiChanceInLaterRound(2, 4)).toBe(0.5);
    expect(aiChanceInLaterRound(3, 2)).toBe(1);
    expect(aiChanceInLaterRound(0, 4)).toBe(0);
    expect(aiChanceInLaterRound(2, 0)).toBe(0);
  });
});
