// Review probes (independent review 18/10/2026) — not part of the product suite; lives only in the review worktree.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { eligibleCandidates, type QuestionWord } from './distractors.js';

function word(lemma: string, data: Partial<QuestionWord> = {}): QuestionWord {
  return {
    sense_id: randomUUID(), entry_id: randomUUID(), scope: 'catalog', lemma, gloss_vi: null, definition_en: null,
    form_of_entry_id: null, function_word: false, ...data,
  };
}

describe('review probes: PX1 distractors', () => {
  it('PX1a multiple choice: asked fast "nhanh"; quick has a sense "nhanh" and a sense "nhanh trí"', () => {
    const fast = word('fast', { gloss_vi: 'nhanh' });
    const quick1 = word('quick', { gloss_vi: 'nhanh' });
    const quick2 = word('quick', { entry_id: quick1.entry_id, gloss_vi: 'nhanh trí' });
    const slow = word('slow', { gloss_vi: 'chậm' });
    const kept = eligibleCandidates(fast, [quick1, quick2, slow]).map((w) => `${w.lemma}:${w.gloss_vi}`);
    console.log('PX1a kept distractors:', JSON.stringify(kept));
    expect(kept.length).toBeGreaterThan(0);
  });

  it('PX1a order-swapped control: quick "nhanh trí" listed before quick "nhanh"', () => {
    const fast = word('fast', { gloss_vi: 'nhanh' });
    const quick2 = word('quick', { gloss_vi: 'nhanh trí' });
    const quick1 = word('quick', { entry_id: quick2.entry_id, gloss_vi: 'nhanh' });
    const kept = eligibleCandidates(fast, [quick2, quick1]).map((w) => `${w.lemma}:${w.gloss_vi}`);
    console.log('PX1a (swapped order) kept distractors:', JSON.stringify(kept));
  });

  it('PX1b true/false: asked deploy#1; deploy#2 "bố trí (quân)"; arrange "sắp xếp, bố trí"', () => {
    const deploy1 = word('deploy', { gloss_vi: 'triển khai (phần mềm)' });
    const deploy2 = word('deploy', { entry_id: deploy1.entry_id, gloss_vi: 'bố trí (quân)' });
    const arrange = word('arrange', { gloss_vi: 'sắp xếp, bố trí' });
    const kept = eligibleCandidates(deploy1, [deploy2, arrange]).map((w) => `${w.lemma}:${w.gloss_vi}`);
    console.log('PX1b kept candidates:', JSON.stringify(kept));
  });
});
