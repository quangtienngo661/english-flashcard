import nlp from 'compromise';
import { readFileSync } from 'node:fs';
import pluralize from 'pluralize';
import type { InflectionKind } from '../content.constants.js';

type Agid = { V: Record<string, [string[], string[], string[], string[]]>; N: Record<string, string[]> };
type Conjugation = { PresentTense?: string; Gerund?: string; PastTense?: string; Participle?: string };
type Transform = {
  verb: { conjugate: (word: string, model: unknown) => Conjugation };
  noun: { toPlural: (word: string, model: unknown) => string };
};

// AGID 2016.01.19, packed by scripts/pack-agid.mjs (notice: THIRD_PARTY_NOTICES.md). Loaded once, on first use.
let agid: Agid | undefined;
function agidData(): Agid {
  agid ??= JSON.parse(readFileSync(new URL('./agid-inflections.json', import.meta.url), 'utf8')) as Agid;
  return agid;
}
const VERB_KINDS = ['third_person', 'present_participle', 'past', 'past_participle'] as const;

function fromCompromise(lemma: string, pos: 'verb' | 'noun'): Array<{ form: string; kind: InflectionKind }> {
  const world = nlp.world() as unknown as { model: unknown; methods: { two: { transform: Transform } } };
  const transform = world.methods.two.transform;
  if (pos === 'noun') return [{ form: transform.noun.toPlural(lemma, world.model), kind: 'plural' }];
  const c = transform.verb.conjugate(lemma, world.model);
  return [
    { form: c.PresentTense ?? '', kind: 'third_person' }, { form: c.Gerund ?? '', kind: 'present_participle' },
    { form: c.PastTense ?? '', kind: 'past' }, { form: c.Participle ?? c.PastTense ?? '', kind: 'past_participle' },
  ];
}

/** Library inflections (D29, D46, D47): every level-0 AGID form in AGID order; compromise only for a verb or noun that
 * AGID lacks; adjectives get none (AGID comparatives were too often wrong) and only reviewed CSV forms apply to them;
 * nouns pluralize treats as uncountable get no plural.
 * Multi-word lemmas and other parts of speech get none; a form equal to the lemma is dropped. */
export function generateInflections(lemma: string, pos: string): Array<{ form: string; kind: InflectionKind }> {
  if (/\s/.test(lemma) || (pos !== 'verb' && pos !== 'noun')) return [];
  const data = agidData();
  let forms: Array<{ form: string; kind: InflectionKind }>;
  if (pos === 'verb') {
    const slots = data.V[lemma] ?? data.V[lemma.toLowerCase()];
    forms = slots ? slots.flatMap((list, index) => list.map((form) => ({ form, kind: VERB_KINDS[index] }))) : fromCompromise(lemma, pos);
  } else {
    // D47: an uncountable noun (pluralize returns the lemma unchanged: music, software, advice) gets no library plural.
    if (pluralize.plural(lemma) === lemma) return [];
    const plurals = data.N[lemma] ?? data.N[lemma.toLowerCase()];
    forms = plurals ? plurals.map((form) => ({ form, kind: 'plural' as const })) : fromCompromise(lemma, pos);
  }
  return forms.filter(({ form }) => form && form !== lemma);
}
