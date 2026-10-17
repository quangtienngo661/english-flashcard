import { describe, expect, it } from 'vitest';
import { IRREGULAR_CASES } from '../../../test/fixtures/irregular-forms.js';
import { INFLECTION_KINDS } from '../content.constants.js';
import { generateInflections } from './inflect.js';

/** The first form of each kind, in kind order: what a word page shows first. */
function firstPerKind(forms: Array<{ form: string; kind: string }>): Array<[string, string]> {
  const first = new Map<string, string>();
  for (const { kind, form } of forms) if (!first.has(kind)) first.set(kind, form);
  return INFLECTION_KINDS.filter((kind) => first.has(kind)).map((kind) => [kind, first.get(kind)!]);
}

describe('generateInflections (D29, D46: AGID first)', () => {
  it.each(IRREGULAR_CASES.map((c) => [`${c.lemma}/${c.pos}`, c] as const))('fixture %s', (_, c) => {
    const got = firstPerKind(generateInflections(c.lemma, c.pos));
    expect(got.map(([kind]) => kind)).toEqual(c.forms.map(([kind]) => kind));
    for (const [index, [, expected]] of c.forms.entries()) expect(expected.split('|')).toContain(got[index][1]);
  });

  it('the fixture has exactly 50 cases', () => {
    expect(IRREGULAR_CASES).toHaveLength(50);
  });

  it('deploy → deploys, deploying, deployed (past), deployed (past_participle)', () => {
    expect(generateInflections('deploy', 'verb')).toEqual([
      { form: 'deploys', kind: 'third_person' }, { form: 'deploying', kind: 'present_participle' },
      { form: 'deployed', kind: 'past' }, { form: 'deployed', kind: 'past_participle' },
    ]);
  });

  it('a preposition and "turn to" yield []', () => {
    expect(generateInflections('to', 'preposition')).toEqual([]);
    expect(generateInflections('turn to', 'verb')).toEqual([]);
  });

  it('every level-0 form is kept in AGID order: ring has past ringed then rang', () => {
    expect(generateInflections('ring', 'verb').filter(({ kind }) => kind === 'past').map(({ form }) => form)).toEqual(['ringed', 'rang']);
  });

  it('variant levels and marked forms are left out: dream keeps dreamed only, leaf keeps leaves only', () => {
    expect(generateInflections('dream', 'verb').filter(({ kind }) => kind === 'past').map(({ form }) => form)).toEqual(['dreamed']);
    expect(generateInflections('leaf', 'noun')).toEqual([{ form: 'leaves', kind: 'plural' }]);
  });

  it('D46: adjectives get no library forms, even ones AGID lists (happy) or lists wrongly (beautiful)', () => {
    for (const lemma of ['happy', 'beautiful', 'good', 'transitive']) expect(generateInflections(lemma, 'adjective')).toEqual([]);
  });

  it('a verb or noun missing from AGID falls back to compromise', () => {
    expect(generateInflections('yeet', 'verb')).toEqual([
      { form: 'yeets', kind: 'third_person' }, { form: 'yeeting', kind: 'present_participle' },
      { form: 'yeeted', kind: 'past' }, { form: 'yeeted', kind: 'past_participle' },
    ]);
    expect(generateInflections('blorp', 'noun')).toEqual([{ form: 'blorps', kind: 'plural' }]);
  });

  it('a capitalised lemma uses its own AGID line or the lower-case one', () => {
    expect(generateInflections('August', 'noun')).toEqual([{ form: 'Augusts', kind: 'plural' }]);
  });
});
