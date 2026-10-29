import { describe, expect, it } from 'vitest';
import type { AiModel, ConfigView } from '../ai-api';
import { sameConfigForm, sameDraftContent, switchConfigModel, toConfigForm, toDraftBody } from './config-form';

const FIELDS = ['word', 'part_of_speech', 'level', 'meaning_vi', 'context_label'];
const example = {
  input: { word: 'go', part_of_speech: 'verb', level: 'A1', meaning_vi: 'đi', context_label: null },
  output: { sentence: 'I ___ home.', accepted_answers: ['go'] },
};

const view = (over: Partial<ConfigView> = {}): ConfigView => ({
  id: 'C4', operation: 'generate_cloze', number: 4, version: 2, status: 'draft', instructions: 'Write one short sentence.', examples: [example],
  model: { id: 'M1', provider: 'fake', model_id: 'fake:ok' }, effort: 'low', thinking: 'off', max_output_tokens: 1200, note: 'try', created_from: 'C3',
  created_by_user: { id: 'u9', email: 'lan@wordmet.com', system: false }, created_at: '2026-10-15T02:12:00.000Z', published_by_user: null, published_at: null, estimate: null,
  ...over,
});

describe('toConfigForm', () => {
  it('turns a config into text boxes: the prompt part as the Prompt page did, the rest as plain values', () => {
    const form = toConfigForm(view(), FIELDS);
    expect(form.instructions).toBe('Write one short sentence.');
    expect(form.examples).toEqual([{
      input: { word: 'go', part_of_speech: 'verb', level: 'A1', meaning_vi: 'đi', context_label: '' },
      output: JSON.stringify(example.output, null, 2),
    }]);
    expect(form).toMatchObject({ model_ref: 'M1', effort: 'low', thinking: 'off', max_output_tokens: '1200', note: 'try' });
  });

  it('no model, no limit and no note become null, empty and empty', () => {
    expect(toConfigForm(view({ model: null, effort: null, thinking: null, max_output_tokens: null, note: null }), FIELDS)).toMatchObject({
      model_ref: null, effort: null, thinking: null, max_output_tokens: '', note: '',
    });
  });
});

describe('toDraftBody', () => {
  it('builds the PUT body with the version the editor started from', () => {
    const result = toDraftBody(toConfigForm(view(), FIELDS), 2);
    expect(result).toEqual({
      ok: true,
      body: {
        expected_version: 2, instructions: 'Write one short sentence.', examples: [example], model_ref: 'M1', effort: 'low', thinking: 'off',
        max_output_tokens: 1200, note: 'try',
      },
    });
  });

  it('an output that is not JSON is refused by its position, and nothing is built', () => {
    const form = toConfigForm(view(), FIELDS);
    form.examples[0]!.output = '{oops';
    expect(toDraftBody(form, 2)).toEqual({ ok: false, badOutputs: [0] });
  });

  it('an empty limit is null, an empty note is null, and the limit is a whole number', () => {
    const form = { ...toConfigForm(view(), FIELDS), max_output_tokens: '', note: '' };
    expect(toDraftBody(form, 0)).toMatchObject({ ok: true, body: { max_output_tokens: null, note: null, expected_version: 0 } });
    expect(toDraftBody({ ...form, max_output_tokens: '4096' }, 0)).toMatchObject({ ok: true, body: { max_output_tokens: 4096 } });
  });
});

const model = (id: string, over: Partial<AiModel> = {}): AiModel => ({
  id, provider: 'openai', model_id: `m-${id}`, shutdown_at: null, lifecycle: null, effort_choices: [], thinking_off_available: false, structured_outputs: true,
  max_output_tokens: null, price: null, note: null, info_checked_at: '2026-10-15T02:12:00.000Z', used_by: [], estimate: null, hidden: false, ...over,
});

describe('switchConfigModel (design §6.3)', () => {
  const form = toConfigForm(view(), FIELDS);

  it('keeps an effort and "Tắt" the new model offers', () => {
    const next = switchConfigModel(form, 'B', [model('B', { effort_choices: ['low', 'high'], thinking_off_available: true })]);
    expect(next.form).toMatchObject({ model_ref: 'B', effort: 'low', thinking: 'off' });
    expect(next.droppedEffort).toBeNull();
  });

  it('puts an effort the new model lacks back to the default and says which one went; "Tắt" goes when the model cannot turn it off', () => {
    const next = switchConfigModel(form, 'B', [model('B', { effort_choices: ['high'] })]);
    expect(next.form).toMatchObject({ model_ref: 'B', effort: null, thinking: null });
    expect(next.droppedEffort).toBe('low');
  });

  it('no model clears effort and thinking and reports nothing dropped; the other fields stay', () => {
    const next = switchConfigModel(form, null, []);
    expect(next.form).toMatchObject({ model_ref: null, effort: null, thinking: null, max_output_tokens: '1200', note: 'try', instructions: form.instructions });
    expect(next.droppedEffort).toBeNull();
  });
});

describe('sameConfigForm', () => {
  it('is true for the same form and false when any one field differs', () => {
    const base = toConfigForm(view(), FIELDS);
    expect(sameConfigForm(base, toConfigForm(view(), FIELDS))).toBe(true);
    expect(sameConfigForm(base, { ...base, instructions: 'x' })).toBe(false);
    expect(sameConfigForm(base, { ...base, model_ref: null })).toBe(false);
    expect(sameConfigForm(base, { ...base, effort: null })).toBe(false);
    expect(sameConfigForm(base, { ...base, thinking: null })).toBe(false);
    expect(sameConfigForm(base, { ...base, max_output_tokens: '1201' })).toBe(false);
    expect(sameConfigForm(base, { ...base, note: 'other' })).toBe(false);
  });
});

describe('sameDraftContent (did a save whose reply was lost land?)', () => {
  it('compares what the draft holds with the body that was sent, whatever the key order of the examples', () => {
    const sent = {
      expected_version: 1, instructions: 'Write one short sentence.',
      examples: [{ output: { accepted_answers: ['go'], sentence: 'I ___ home.' }, input: example.input }], model_ref: 'M1', effort: 'low', thinking: 'off' as const,
      max_output_tokens: 1200, note: 'try',
    };
    expect(sameDraftContent(view(), sent)).toBe(true);
    expect(sameDraftContent(view(), { ...sent, note: null })).toBe(false);
    expect(sameDraftContent(view({ model: null }), sent)).toBe(false);
  });
});
