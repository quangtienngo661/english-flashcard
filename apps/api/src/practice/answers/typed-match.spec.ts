import { describe, expect, it } from 'vitest';
import type { PracticeSense } from '../../content/index.js';
import type { AnswerKey } from '../practice.types.js';
import { deploy } from '../testing/ai-senses.js';
import { matchTyped, sessionWordForms } from './typed-match.js';

type TypeWordKey = Extract<AnswerKey, { kind: 'type_word' }>;

const sense = (lemma: string, data: Partial<PracticeSense> = {}) => deploy({ lemma, pos: 'adjective', inflections: [], ...data });
const key = (data: Partial<TypeWordKey> = {}): TypeWordKey => ({
  kind: 'type_word', reveal: { lemma: 'vital', meaning: 'thiết yếu', definition_en: null }, asked_private: false, main: 'vital',
  accepted: ['vital'], also_accepted: [{ form: 'crucial', private: false }], session_private: false, ...data,
});

// Lan's session: `vital` is asked ("Sleep is ___ for good health.", crucial declared); `crucial` and `habit` are the other words.
const vital = sense('vital');
const crucial = sense('crucial');
const habit = sense('habit', { pos: 'noun' });
const forms = (...others: PracticeSense[]) => sessionWordForms({ senseId: vital.sense_id, lemma: 'vital' }, [vital, ...others]);

describe('sessionWordForms', () => {
  it('lists the forms of each session word and leaves out the asked sense', () => {
    const listed = forms(crucial, habit);
    expect(listed.map((word) => word.senseId)).toEqual([crucial.sense_id, habit.sense_id]);
    expect([...listed[0].forms]).toEqual(['crucial']);
  });

  it('CSE4: leaves out every other sense of the asked lemma, ignoring case', () => {
    const fair = sense('fair', { inflections: [{ form: 'fairer', kind: 'comparative' }] });
    const otherFair = sense('Fair', { inflections: [{ form: 'fairs', kind: 'third_person' }] });
    expect(sessionWordForms({ senseId: fair.sense_id, lemma: 'fair' }, [fair, otherFair, crucial]).map((word) => word.senseId))
      .toEqual([crucial.sense_id]);
  });

  it('an empty session gives no word', () => {
    expect(sessionWordForms({ senseId: vital.sense_id, lemma: 'vital' }, [vital])).toEqual([]);
  });
});

describe('matchTyped (design §3.1, the order of matching)', () => {
  it('CS1: the sentence\'s own answer is right', () => {
    expect(matchTyped('vital', key(), forms(crucial, habit))).toEqual({ kind: 'right' });
  });

  it('normalizes: "Crucial." is the declared alternative, credited to the crucial sense', () => {
    expect(matchTyped('Crucial.', key(), forms(crucial, habit))).toEqual({ kind: 'alternative', senseId: crucial.sense_id });
  });

  it('CS3: a session word that was not declared is a session word', () => {
    expect(matchTyped('habit', key(), forms(crucial, habit))).toEqual({ kind: 'session_word' });
  });

  it('CS4: a word outside the session is today\'s answer', () => {
    expect(matchTyped('important', key(), forms(crucial, habit))).toEqual({ kind: 'other' });
  });

  it('CSE3: a declared form that belongs to two session words is an alternative that credits nobody', () => {
    const find = sense('find', { pos: 'verb', inflections: [{ form: 'found', kind: 'past' }] });
    const found = sense('found', { pos: 'verb' });
    const declared = key({ also_accepted: [{ form: 'found', private: false }] });
    expect(matchTyped('found', declared, forms(find, found))).toEqual({ kind: 'alternative', senseId: null });
  });

  it('CSE1: a declared word that is not in this session is an outside word', () => {
    expect(matchTyped('crucial', key(), forms(habit))).toEqual({ kind: 'other' });
  });

  it('CSE2: a key with no also_accepted (written before) gives the session-word message for a session word', () => {
    const { also_accepted: _declared, ...older } = key();
    expect(matchTyped('crucial', older, forms(crucial, habit))).toEqual({ kind: 'session_word' });
  });

  it('CSE4: another form of the asked lemma is not a session word', () => {
    const fair = sense('fair', { inflections: [{ form: 'fairer', kind: 'comparative' }] });
    const otherFair = sense('fair', { inflections: [{ form: 'fairer', kind: 'comparative' }] });
    const asked = key({ main: 'fair', accepted: ['fair'], also_accepted: [] });
    expect(matchTyped('fairer', asked, sessionWordForms({ senseId: fair.sense_id, lemma: 'fair' }, [fair, otherFair]))).toEqual({ kind: 'other' });
  });

  it('CSE5: a valid form of the asked word that this sentence does not accept, and no session word has it, is today\'s answer', () => {
    const brush = sense('brush', { pos: 'verb', inflections: [{ form: 'brushed', kind: 'past' }] });
    const asked = key({ main: 'brush', accepted: ['brush'], also_accepted: [] });
    expect(matchTyped('brushed', asked, sessionWordForms({ senseId: brush.sense_id, lemma: 'brush' }, [brush, habit]))).toEqual({ kind: 'other' });
  });

  it('an empty session: a word that would be a session word is today\'s answer', () => {
    expect(matchTyped('habit', key(), [])).toEqual({ kind: 'other' });
  });

  it('a Bước 4 or own-sentence key has no declared words: only a session word or today\'s answer', () => {
    const plain: TypeWordKey = { kind: 'type_word', reveal: key().reveal, asked_private: false, main: 'vital', accepted: ['vital'] };
    expect(matchTyped('crucial', plain, forms(crucial))).toEqual({ kind: 'session_word' });
    expect(matchTyped('vital', plain, forms(crucial))).toEqual({ kind: 'right' });
  });

  it('a declared alternative never beats the sentence\'s own accepted answer', () => {
    const odd = key({ accepted: ['vital', 'crucial'] });
    expect(matchTyped('crucial', odd, forms(crucial))).toEqual({ kind: 'right' });
  });
});
