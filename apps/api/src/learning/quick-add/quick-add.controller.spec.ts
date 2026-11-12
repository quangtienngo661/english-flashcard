import { describe, expect, it } from 'vitest';
import { quickAddBody } from './quick-add.controller.js';

const GROUP = '00000000-0000-4000-8000-0000000000a1';
const word = (patch: Record<string, unknown>) => ({ group_id: GROUP, new_word: { lemma: 'rizz', meaning: 'sức hút', ...patch } });

describe('quick-add body — an AI suggestion (Bước 7 design §11.2, D22)', () => {
  it('two examples and ai_suggestion are accepted, trimmed and NFC', () => {
    const parsed = quickAddBody.parse(word({ examples: [' He has rizz. ', 'Rizz is charm.'], ai_suggestion: true }));
    expect(parsed.new_word).toMatchObject({ examples: ['He has rizz.', 'Rizz is charm.'], ai_suggestion: true });
  });

  it('B7E93: three examples, an empty one or one of 301 → refused', () => {
    expect(quickAddBody.safeParse(word({ examples: ['a.', 'b.', 'c.'] })).success).toBe(false);
    expect(quickAddBody.safeParse(word({ examples: ['  '] })).success).toBe(false);
    expect(quickAddBody.safeParse(word({ examples: ['x'.repeat(301)] })).success).toBe(false);
    expect(quickAddBody.safeParse(word({ examples: ['x'.repeat(300)] })).success).toBe(true);
  });

  it('both are optional (Bước 3 bodies unchanged); ai_suggestion must be a boolean', () => {
    expect(quickAddBody.safeParse(word({})).success).toBe(true);
    expect(quickAddBody.safeParse(word({ ai_suggestion: 'yes' })).success).toBe(false);
  });
});

describe('quick-add body — the learner own ipa (round C, H10)', () => {
  it('ipa is optional, trimmed, and loses its slashes', () => {
    expect(quickAddBody.parse(word({ ipa: ' /ˈfəʊbiə/ ' })).new_word).toMatchObject({ ipa: 'ˈfəʊbiə' });
    expect(quickAddBody.safeParse(word({})).success).toBe(true);
    expect(quickAddBody.parse(word({ ipa: null })).new_word).toMatchObject({ ipa: null });
  });

  it('101 characters → refused; 100 → accepted', () => {
    expect(quickAddBody.safeParse(word({ ipa: 'a'.repeat(101) })).success).toBe(false);
    expect(quickAddBody.safeParse(word({ ipa: 'a'.repeat(100) })).success).toBe(true);
  });
});

describe('quick-add body — several groups (QP1)', () => {
  const OTHER = '00000000-0000-4000-8000-0000000000a2';
  const base = { sense_id: '00000000-0000-4000-8000-0000000000b1' };

  it('group_ids with two ids is accepted; group_id alone still is', () => {
    expect(quickAddBody.parse({ ...base, group_ids: [GROUP, OTHER] }).group_ids).toEqual([GROUP, OTHER]);
    expect(quickAddBody.safeParse({ ...base, group_id: GROUP }).success).toBe(true);
  });

  it('duplicate ids collapse, keeping the first order', () => {
    expect(quickAddBody.parse({ ...base, group_ids: [GROUP, OTHER, GROUP] }).group_ids).toEqual([GROUP, OTHER]);
  });

  it('group_ids and group_id together, or neither → refused', () => {
    expect(quickAddBody.safeParse({ ...base, group_id: GROUP, group_ids: [GROUP] }).success).toBe(false);
    expect(quickAddBody.safeParse({ ...base }).success).toBe(false);
  });

  it('0 ids → refused; 10 → accepted; 11 → refused', () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    expect(quickAddBody.safeParse({ ...base, group_ids: [] }).success).toBe(false);
    expect(quickAddBody.safeParse({ ...base, group_ids: ids(10) }).success).toBe(true);
    expect(quickAddBody.safeParse({ ...base, group_ids: ids(11) }).success).toBe(false);
  });
});
