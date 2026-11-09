import { describe, expect, it } from 'vitest';
import {
  aiBudget, aiChanceInLaterRound, aiNeeded, aiPlanned, evenWantsAi, markAiSenses, markAiSensesRandom, plannedFromCount, roundOneAiLimit,
} from './ai-plan.js';

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

describe('roundOneAiLimit (practice ai count §5)', () => {
  it('one round: all K in round 1 — (4, 10, 10) → 4, (3, 4, 4) → 3', () => {
    expect(roundOneAiLimit(4, 10, 10)).toBe(4);
    expect(roundOneAiLimit(3, 4, 4)).toBe(3);
  });

  it('several rounds: round(K × kept ÷ target) — (8, 20, 8) → 3, (5, 20, 8) → 2', () => {
    expect(roundOneAiLimit(8, 20, 8)).toBe(3);
    expect(roundOneAiLimit(5, 20, 8)).toBe(2);
  });
});

describe('markAiSensesRandom (practice ai count §5)', () => {
  const kept = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const all = new Set(kept);

  it('random 0: the unseen words b and g first, then the first remaining ones, in kept order', () => {
    expect(markAiSensesRandom(kept, all, new Set(['b', 'g']), 4, () => 0)).toEqual(['a', 'b', 'c', 'g']);
  });

  it('random 0.999: the unseen words, then the last remaining ones', () => {
    expect(markAiSensesRandom(kept, all, new Set(['b', 'g']), 4, () => 0.999)).toEqual(['b', 'g', 'i', 'j']);
  });

  it('limit 0 → none', () => {
    expect(markAiSensesRandom(kept, all, new Set(['b', 'g']), 0, () => 0)).toEqual([]);
  });

  it('an unseen word that is not AI-capable is not marked', () => {
    expect(markAiSensesRandom(kept, all, new Set(['z']), 1, () => 0)).toEqual(['a']);
  });

  it('limit above the capable words → all 10', () => {
    expect(markAiSensesRandom(kept, all, new Set(['b', 'g']), 20, () => 0.5)).toEqual(kept);
  });
});

describe('plannedFromCount (practice ai count §4 step 5)', () => {
  it('(5, 3, 3, 3) → 3: no later round, only 3 marked', () => {
    expect(plannedFromCount(5, 3, 3, 3)).toBe(3);
  });

  it('(8, 3, 8, 20) → 8: later rounds hold the rest', () => {
    expect(plannedFromCount(8, 3, 8, 20)).toBe(8);
  });

  it('(2, 0, 4, 4) → 0: nothing marked, no later round', () => {
    expect(plannedFromCount(2, 0, 4, 4)).toBe(0);
  });
});

describe('evenWantsAi (practice ai count §5, rounds ≥ 2)', () => {
  it('planned 8, target 20: budget 5 at answered 8 → AI (3 placed < round(8 × 9 ÷ 20) = 4)', () => {
    expect(evenWantsAi(8, 5, 8, 20)).toBe(true);
  });

  it('budget 4 at answered 9 → not AI (4 placed = round(8 × 10 ÷ 20))', () => {
    expect(evenWantsAi(8, 4, 9, 20)).toBe(false);
  });

  it('budget 4 at answered 16 → AI (4 placed < 7, and 4 left of 4 budget)', () => {
    expect(evenWantsAi(8, 4, 16, 20)).toBe(true);
  });

  it('budget 0 → never', () => {
    expect(evenWantsAi(8, 0, 10, 20)).toBe(false);
  });
});
