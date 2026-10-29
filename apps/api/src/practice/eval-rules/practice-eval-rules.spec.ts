import { describe, expect, it, vi } from 'vitest';
import type { PracticeSense } from '../../content/index.js';
import { mergeSenses, PracticeEvalRules } from './practice-eval-rules.js';

function sense(over: Partial<PracticeSense> = {}): PracticeSense {
  return {
    sense_id: 's1', entry_id: 'e1', scope: 'catalog', lemma: 'deploy', meaning: { language: 'vi', text: 'triển khai' } as never,
    gloss_vi: 'triển khai', definition_en: 'to put into use', form_of_entry_id: null, function_word: false,
    inflections: [
      { form: 'deployed', kind: 'past' }, { form: 'deployed', kind: 'past_participle' }, { form: 'deploying', kind: 'present_participle' },
      { form: 'deploys', kind: 'third_person' },
    ],
    context_label: null, examples: [], variants: [], accepted: [], pos: 'verb', level: 'B2', live_revision_id: 'r1', extra_forms: [], ...over,
  } as PracticeSense;
}

function setup(senses: PracticeSense[] = [sense()]) {
  const content = { catalogPracticeSensesByLemma: vi.fn(async () => senses) };
  const ai = { registerEvalRules: vi.fn() };
  const rules = new PracticeEvalRules(content as never, ai as never);
  return { rules, content, ai };
}

const CLOZE_IN = { word: 'deploy', part_of_speech: 'verb' };

describe('PracticeEvalRules.onModuleInit', () => {
  it('E2: registers itself once with the AI gateway', () => {
    const { rules, ai } = setup();
    rules.onModuleInit();
    expect(ai.registerEvalRules).toHaveBeenCalledExactlyOnceWith(rules);
  });
});

describe('PracticeEvalRules.check', () => {
  it('B8: a cloze whose answers are valid forms and whose sentence hides the word passes', async () => {
    const { rules, content } = setup();
    const result = await rules.check('generate_cloze', CLOZE_IN, { sentence: 'We will ___ it.', accepted_answers: ['deploy'] });
    expect(result).toEqual({ status: 'pass', problems: [], reason: null });
    expect(content.catalogPracticeSensesByLemma).toHaveBeenCalledWith('deploy', 'verb', 'vi');
  });

  it('an answer that is not a form of the word → unknown-form:<answer as sent>', async () => {
    const { rules } = setup();
    expect(await rules.check('generate_cloze', CLOZE_IN, { sentence: 'We will ___ it.', accepted_answers: ['deployment'] }))
      .toEqual({ status: 'fail', problems: ['unknown-form:deployment'], reason: null });
  });

  it('a sentence that shows the word outside the blank → reveals-word, after any unknown-form', async () => {
    const { rules } = setup();
    expect(await rules.check('generate_cloze', CLOZE_IN, { sentence: 'We deploy it, then ___ again.', accepted_answers: ['deploy'] }))
      .toEqual({ status: 'fail', problems: ['reveals-word'], reason: null });
    expect(await rules.check('generate_cloze', CLOZE_IN, { sentence: 'We deploy it, then ___ again.', accepted_answers: ['launch'] }))
      .toEqual({ status: 'fail', problems: ['unknown-form:launch', 'reveals-word'], reason: null });
  });

  it('a meaning question whose form appears twice → word-not-once; an unknown form → unknown-form:<form>', async () => {
    const { rules } = setup();
    expect(await rules.check('generate_meaning_question', CLOZE_IN, { sentence: 'They deploy and deploy.', word_in_sentence: 'deploy' }))
      .toEqual({ status: 'fail', problems: ['word-not-once'], reason: null });
    expect(await rules.check('generate_meaning_question', CLOZE_IN, { sentence: 'They launch it.', word_in_sentence: 'launch' }))
      .toEqual({ status: 'fail', problems: ['unknown-form:launch'], reason: null });
    expect(await rules.check('generate_meaning_question', CLOZE_IN, { sentence: 'They deploy it.', word_in_sentence: 'deploy' }))
      .toEqual({ status: 'pass', problems: [], reason: null });
  });

  it('a sentence MCQ with a distractor outside the candidates → mcq-check; a good one passes', async () => {
    const { rules } = setup();
    const input = { ...CLOZE_IN, answer_form: 'deployed', candidates: ['launched', 'sent', 'moved'] };
    expect(await rules.check('generate_sentence_mcq', input, { sentence: 'They ___ it.', distractors: ['launched', 'sent', 'outsider'] }))
      .toEqual({ status: 'fail', problems: ['mcq-check'], reason: null });
    expect(await rules.check('generate_sentence_mcq', input, { sentence: 'They ___ it.', distractors: ['launched', 'sent', 'moved'] }))
      .toEqual({ status: 'pass', problems: [], reason: null });
  });

  it('B8: a word the catalog does not have → skipped, not-in-catalog', async () => {
    const { rules } = setup([]);
    expect(await rules.check('generate_cloze', { word: 'lit', part_of_speech: 'adjective' }, { sentence: 'It is ___.', accepted_answers: ['lit'] }))
      .toEqual({ status: 'skipped', problems: [], reason: 'not-in-catalog' });
  });

  it('design §5.2: part_of_speech "unspecified" looks at every part of speech', async () => {
    const { rules, content } = setup();
    await rules.check('generate_cloze', { word: 'deploy', part_of_speech: 'unspecified' }, { sentence: 'We will ___ it.', accepted_answers: ['deploy'] });
    expect(content.catalogPracticeSensesByLemma).toHaveBeenCalledWith('deploy', null, 'vi');
  });

  it('the operations without Practice rules are not applicable and read nothing', async () => {
    const { rules, content } = setup();
    expect(await rules.check('lookup_word', CLOZE_IN, {})).toEqual({ status: 'not_applicable', problems: [], reason: null });
    expect(await rules.check('translate_sentence', CLOZE_IN, {})).toEqual({ status: 'not_applicable', problems: [], reason: null });
    expect(await rules.check('check_private_word', CLOZE_IN, {})).toEqual({ status: 'not_applicable', problems: [], reason: null });
    expect(content.catalogPracticeSensesByLemma).not.toHaveBeenCalled();
  });
});

describe('PracticeEvalRules.formsOf', () => {
  it('lists every normalized form of the word, lemma first', async () => {
    const { rules, content } = setup();
    expect(await rules.formsOf('deploy', 'verb')).toEqual(['deploy', 'deployed', 'deploying', 'deploys']);
    expect(content.catalogPracticeSensesByLemma).toHaveBeenCalledWith('deploy', 'verb', 'vi');
  });

  it('unspecified merges every entry of the lemma: variants and inflections in first-seen order', async () => {
    const noun = sense({ lemma: 'run', pos: 'noun', inflections: [], variants: ['runne'] });
    const verb = sense({ sense_id: 's2', lemma: 'run', pos: 'verb', inflections: [{ form: 'ran', kind: 'past' }] });
    const { rules, content } = setup([noun, verb]);
    expect(await rules.formsOf('run', 'unspecified')).toEqual(['run', 'runne', 'ran']);
    expect(content.catalogPracticeSensesByLemma).toHaveBeenCalledWith('run', null, 'vi');
  });

  it('no sense → null', async () => {
    expect(await setup([]).rules.formsOf('lit', 'adjective')).toBeNull();
  });
});

describe('PracticeEvalRules.matchesExpected', () => {
  const { rules } = setup();

  it('Review focus 2: forms are compared as grading normalizes them (case, trailing dot, curly apostrophe)', () => {
    expect(rules.matchesExpected('generate_cloze', { accepted_answers: ['Deployed'] }, { forms: ['deployed'] })).toBe(true);
    expect(rules.matchesExpected('generate_cloze', { accepted_answers: ['don’t'] }, { forms: ["don't"] })).toBe(true);
    expect(rules.matchesExpected('generate_cloze', { accepted_answers: ['deploy.'] }, { forms: [' Deploy '] })).toBe(true);
  });

  it('B2: an accepted answer outside the expected forms fails the cloze', () => {
    expect(rules.matchesExpected('generate_cloze', { accepted_answers: ['deploy', 'deploys'] }, { forms: ['deploy'] })).toBe(false);
    expect(rules.matchesExpected('generate_cloze', { accepted_answers: [] }, { forms: ['deploy'] })).toBe(false);
  });

  it('a meaning question passes when the word used is an expected form', () => {
    expect(rules.matchesExpected('generate_meaning_question', { word_in_sentence: 'Deploys.' }, { forms: ['deploys'] })).toBe(true);
    expect(rules.matchesExpected('generate_meaning_question', { word_in_sentence: 'deployed' }, { forms: ['deploys'] })).toBe(false);
  });
});

describe('mergeSenses', () => {
  it('takes the first sense and unions variants, accepted forms, inflections (by form + kind) and extra forms', () => {
    const a = sense({ variants: ['a1'], accepted: ['x'], extra_forms: ['e1'], inflections: [{ form: 'ran', kind: 'past' }] });
    const b = sense({
      sense_id: 's2', lemma: 'other', variants: ['a1', 'b1'], accepted: ['y'], extra_forms: ['e1', 'e2'],
      inflections: [{ form: 'ran', kind: 'past' }, { form: 'ran', kind: 'past_participle' }],
    });
    const merged = mergeSenses([a, b]);
    expect(merged.sense_id).toBe('s1');
    expect(merged.lemma).toBe('deploy');
    expect(merged.variants).toEqual(['a1', 'b1']);
    expect(merged.accepted).toEqual(['x', 'y']);
    expect(merged.extra_forms).toEqual(['e1', 'e2']);
    expect(merged.inflections).toEqual([{ form: 'ran', kind: 'past' }, { form: 'ran', kind: 'past_participle' }]);
  });
});
