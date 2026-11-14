import { describe, expect, it } from 'vitest';
import { meaningPool } from './meaning-pool.js';
import type { CandidateSense } from './practice-senses.js';

const sense = (lemma: string, glossVi: string | null = `nghĩa ${lemma}`, id = lemma): CandidateSense => ({
  sense_id: id, entry_id: `e-${id}`, scope: 'catalog', lemma, meaning: { text: glossVi ?? '', language: 'vi', translation_missing: false },
  gloss_vi: glossVi, definition_en: null, form_of_entry_id: null, function_word: false, inflections: [],
});
const lemmas = (senses: CandidateSense[]) => senses.map((item) => item.lemma);

describe('meaningPool (design §7.4 step 3)', () => {
  it('excludes the asked lemma and the other excluded lemmas, case-insensitively', () => {
    expect(lemmas(meaningPool([sense('Deploy'), sense('bank'), sense('RIVER')], ['deploy', 'river'], 5))).toEqual(['bank']);
  });

  it('keeps only senses with a Vietnamese gloss (it is sent to AI as other_meanings_vi)', () => {
    expect(lemmas(meaningPool([sense('bank', null), sense('tree'), sense('stone', '  ')], [], 5))).toEqual(['tree']);
  });

  it('one sense per lemma, so two options are never the same word', () => {
    expect(meaningPool([sense('bank', 'ngân hàng', 'b1'), sense('Bank', 'bờ sông', 'b2'), sense('tree')], [], 5)
      .map((item) => item.sense_id)).toEqual(['b1', 'tree']);
  });

  it('keeps the order it was given and stops at count', () => {
    expect(lemmas(meaningPool([sense('a'), sense('b'), sense('c'), sense('d')], [], 3))).toEqual(['a', 'b', 'c']);
    expect(meaningPool([sense('a')], [], 0)).toEqual([]);
  });
});
