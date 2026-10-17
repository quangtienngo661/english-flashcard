import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ContentRuleError, contentHash, mergeContent, normalizeContent, type RevisionContent } from './revision-content.js';

const base: RevisionContent = {
  glossVi: 'ngân hàng', definitionEn: 'A financial institution.',
  examplesEn: ['I went to the bank.', 'The bank is open.'],
  topicCodes: ['business', 'daily-life'], acceptedForms: ['banks', 'banking'],
};

describe('revision content', () => {
  it('hash stability: contentHash of a revision without formOf equals the value the Bước 2 function gives', () => {
    const go: RevisionContent = { glossVi: 'đi', definitionEn: 'To move.', examplesEn: ['We go home.'],
      topicCodes: ['daily-life', 'business'], acceptedForms: ['goes', 'going'] };
    // Fixed hex computed with the Bước 2 contentHash before formOf existed.
    const bước2 = '75c1824d5dac12bec43da99ae749d5745d7980ca76b2093c863eea7dba1c24e2';
    expect(contentHash(go)).toBe(bước2);
    expect(contentHash({ ...go, formOf: null })).toBe(bước2);
    const linked = contentHash({ ...go, formOf: { entryId: '00000000-0000-4000-8000-0000000000aa', kind: 'past' } });
    expect(linked).not.toBe(bước2);
    expect(contentHash({ ...go, formOf: { entryId: '00000000-0000-4000-8000-0000000000aa', kind: 'past_participle' } })).not.toBe(linked);
  });

  it('D29: mergeContent keeps the base formOf unless the patch sets or clears it', () => {
    const formOf = { entryId: '00000000-0000-4000-8000-0000000000aa', kind: 'past' as const };
    const linked: RevisionContent = { ...base, formOf };
    expect(mergeContent(linked, { glossVi: 'mới' }).formOf).toEqual(formOf);
    expect(mergeContent(linked, { formOf: null }).formOf).toBeNull();
    expect(mergeContent(base, { formOf }).formOf).toEqual(formOf);
  });

  it('B2#29: accepted forms drop duplicates and the lemma itself after normalization', () => {
    expect(normalizeContent({ acceptedForms: [' BANK ', 'Banks', ' banks ', 'BANKING', '  '],
      topicCodes: [' BUSINESS ', 'business', 'Food'], glossVi: ' Cafe\u0301\t meaning ',
      definitionEn: '  A\n definition. ', examplesEn: ['  One\t example. '] }, ' Bank ')).toEqual({
      acceptedForms: ['Banks', 'BANKING'], topicCodes: ['business', 'food'],
      glossVi: 'Café meaning', definitionEn: 'A definition.', examplesEn: ['One example.'],
    });
    expect(normalizeContent({ acceptedForms: ['CAFE\u0301', 'cafés', 'CAFÉS'] }, 'Café').acceptedForms).toEqual(['cafés']);
  });

  it('B2#29: accepted forms keep the case of their first occurrence; only topics are lower-cased', () => {
    expect(normalizeContent({ acceptedForms: ["I'm", "i'm", 'Mondays'] }, 'be').acceptedForms).toEqual(["I'm", 'Mondays']);
  });

  it('B2#26 (merge): absent and blank keeps every field; a given list replaces the whole list', () => {
    expect(mergeContent(base, {})).toEqual(base);
    expect(mergeContent(base, { glossVi: ' \t ', definitionEn: null })).toEqual(base);
    const patch = { glossVi: 'bờ sông', definitionEn: 'A river edge.', examplesEn: ['A new example.'],
      topicCodes: ['food'], acceptedForms: ['riverbank'] };
    expect(mergeContent(base, patch)).toEqual(patch);
    expect(mergeContent(base, { examplesEn: [], topicCodes: [], acceptedForms: [] })).toEqual({
      ...base, examplesEn: [], topicCodes: [], acceptedForms: [],
    });
    expect(base.examplesEn).toEqual(['I went to the bank.', 'The bank is open.']);
  });

  it('more than 3 examples is refused with a stable ContentRuleError code', () => {
    expect(() => normalizeContent({ examplesEn: ['1', '2', '3', '4'] }, 'bank')).toThrow(ContentRuleError);
    expect(() => normalizeContent({ examplesEn: ['1', '2', '3', '4'] }, 'bank')).toThrow('too-many-examples');
    expect(normalizeContent({ examplesEn: ['1', '2', '3'] }, 'bank').examplesEn).toEqual(['1', '2', '3']);
    expect(normalizeContent({ examplesEn: ['1', '', '2', '  ', '3'] }, 'bank').examplesEn).toEqual(['1', '2', '3']);
  });

  it('contentHash uses canonical JSON, ignores set ordering and retains example ordering', () => {
    const canonical = { glossVi: base.glossVi, definitionEn: base.definitionEn, examplesEn: base.examplesEn,
      topicCodes: ['business', 'daily-life'], acceptedForms: ['banking', 'banks'] };
    expect(contentHash(base)).toBe(createHash('sha256').update(JSON.stringify(canonical)).digest('hex'));
    expect(contentHash({ acceptedForms: [...base.acceptedForms].reverse(), topicCodes: [...base.topicCodes].reverse(),
      examplesEn: base.examplesEn, definitionEn: base.definitionEn, glossVi: base.glossVi })).toBe(contentHash(base));
    expect(contentHash({ ...base, examplesEn: [...base.examplesEn].reverse() })).not.toBe(contentHash(base));
  });
});
