import { describe, expect, it } from 'vitest';
import type { AiModel } from '../ai-api';
import { modelRow } from '../configs/config-test-support';
import { JUDGE_INPUT_FIELDS, emptyJudgeForm, judgeFieldOfViolation, judgeFieldOrder, sameJudgeForm, switchJudgeModel, toJudgeBody, toJudgeForm } from './judge-form';
import { judgeOnFake, judgeRevision, judgeView } from './judge-test-support';

const EXAMPLE = {
  input: {
    target_operation: 'generate_cloze', input: { word: 'go' }, output: { sentence: 'I ___ home.', accepted_answers: ['go'] },
    criteria: [{ code: 'single_answer', question: 'Only one?' }], context: null,
  },
  output: { codes: ['single_answer'], verdicts: ['pass'], reasons: ['Only go fits.'] },
};

describe('judge-form', () => {
  it('the five fields of a judge call are the fields of an example, in the order the API validates them', () => {
    expect(JUDGE_INPUT_FIELDS).toEqual(['target_operation', 'input', 'output', 'criteria', 'context']);
  });

  it('a judge becomes a form: its name, operations, switch, criteria, newest revision text, model and an example with a box per field', () => {
    const form = toJudgeForm(judgeOnFake({ latest: judgeRevision({ examples: [EXAMPLE], model: { id: 'M1', provider: 'fake', model_id: 'fake:ok' }, effort: 'low', max_output_tokens: 800 }) }));
    expect(form).toMatchObject({
      name: 'Chỉ một đáp án', operations: ['generate_cloze'], active: true, criteria: [{ code: 'single_answer', question: expect.any(String) }],
      instructions: 'You review one practice question.', model_ref: 'M1', effort: 'low', thinking: null, max_output_tokens: '800',
    });
    expect(form.examples).toHaveLength(1);
    expect(form.examples[0]!.input).toEqual({
      target_operation: 'generate_cloze', input: '{"word":"go"}', output: '{"sentence":"I ___ home.","accepted_answers":["go"]}',
      criteria: '[{"code":"single_answer","question":"Only one?"}]', context: '',
    });
  });

  it('the body sent is the form read back: JSON boxes parsed, an empty context null, texts trimmed, an empty limit null; nothing about the revision', () => {
    const form = { ...toJudgeForm(judgeView({ latest: judgeRevision({ examples: [EXAMPLE] }) })), name: '  Chỉ một đáp án  ' };
    form.criteria = [{ code: ' single_answer ', question: '  Only one?  ' }];
    const built = toJudgeBody(form);
    expect(built).toEqual({
      ok: true,
      body: {
        name: 'Chỉ một đáp án', operations: ['generate_cloze'], active: true, criteria: [{ code: 'single_answer', question: 'Only one?' }],
        instructions: 'You review one practice question.', examples: [EXAMPLE], model_ref: null, effort: null, thinking: null, max_output_tokens: null,
      },
    });
  });

  it('with the revision the page showed, the body is a save: expected_revision rides along', () => {
    const built = toJudgeBody(toJudgeForm(judgeView()), 3);
    expect(built.ok && 'expected_revision' in built.body ? built.body.expected_revision : null).toBe(3);
  });

  it('an example output that is not a JSON object stops the send and names the example', () => {
    const form = toJudgeForm(judgeView({ latest: judgeRevision({ examples: [EXAMPLE, EXAMPLE] }) }));
    form.examples[1] = { ...form.examples[1]!, output: '[1, 2' };
    expect(toJudgeBody(form)).toEqual({ ok: false, badOutputs: [1] });
  });

  it('a new judge starts with no name, no operation, in use, one empty criterion and no model', () => {
    expect(emptyJudgeForm()).toEqual({
      name: '', operations: [], active: true, criteria: [{ code: '', question: '' }], instructions: '', examples: [], model_ref: null, effort: null, thinking: null,
      max_output_tokens: '',
    });
  });

  it('a form is the same as itself and differs when one box differs', () => {
    const a = toJudgeForm(judgeView());
    expect(sameJudgeForm(a, toJudgeForm(judgeView()))).toBe(true);
    expect(sameJudgeForm(a, { ...a, criteria: [{ ...a.criteria[0]!, question: 'x' }] })).toBe(false);
    expect(sameJudgeForm(a, { ...a, operations: ['lookup_word'] })).toBe(false);
  });

  it('a violation path points at its box: name, operations, a criterion code or question, the model settings, instructions and example boxes', () => {
    const form = toJudgeForm(judgeView({ latest: judgeRevision({ examples: [EXAMPLE] }) }));
    expect(judgeFieldOfViolation('name', form)).toBe('judge-name');
    expect(judgeFieldOfViolation('operations', form)).toBe('judge-operations');
    expect(judgeFieldOfViolation('criteria.0.code', form)).toBe('judge-criterion-0-code');
    expect(judgeFieldOfViolation('criteria.0.question', form)).toBe('judge-criterion-0-question');
    expect(judgeFieldOfViolation('criteria', form)).toBe('judge-criterion-0-code');
    expect(judgeFieldOfViolation('model_ref', form)).toBe('judge-model');
    expect(judgeFieldOfViolation('effort', form)).toBe('judge-effort');
    expect(judgeFieldOfViolation('thinking', form)).toBe('judge-thinking');
    expect(judgeFieldOfViolation('max_output_tokens', form)).toBe('judge-tokens');
    expect(judgeFieldOfViolation('instructions', form)).toBe('prompt-instructions');
    expect(judgeFieldOfViolation('examples[0].input.criteria', form)).toBe('example-0-input-criteria');
    expect(judgeFieldOfViolation('examples[0].output', form)).toBe('example-0-output');
    expect(judgeFieldOfViolation('expected_revision', form)).toBeNull();
  });

  it('boxes are focused in screen order: name, operations, each criterion, the model settings, the instructions, then the examples', () => {
    const form = toJudgeForm(judgeView({ latest: judgeRevision({ examples: [EXAMPLE] }) }));
    form.criteria.push({ code: 'natural', question: 'q' });
    expect(judgeFieldOrder(form).slice(0, 10)).toEqual([
      'judge-name', 'judge-operations', 'judge-criterion-0-code', 'judge-criterion-0-question', 'judge-criterion-1-code', 'judge-criterion-1-question',
      'judge-model', 'judge-effort', 'judge-thinking', 'judge-tokens',
    ]);
    expect(judgeFieldOrder(form).slice(10)).toEqual([
      'prompt-instructions', 'example-0-input-target_operation', 'example-0-input-input', 'example-0-input-output', 'example-0-input-criteria',
      'example-0-input-context', 'example-0-output',
    ]);
  });

  it('choosing a model drops an effort it does not have and a "Tắt" it cannot do; no model clears both', () => {
    const models: AiModel[] = [modelRow('M1', 'anthropic', 'claude-a', { effort_choices: ['low'], thinking_off_available: true }), modelRow('M2', 'anthropic', 'claude-b')];
    const form = { ...toJudgeForm(judgeView()), model_ref: 'M1', effort: 'low', thinking: 'off' as const };
    expect(switchJudgeModel(form, 'M2', models)).toMatchObject({ form: { model_ref: 'M2', effort: null, thinking: null }, droppedEffort: 'low' });
    expect(switchJudgeModel(form, null, models)).toMatchObject({ form: { model_ref: null, effort: null, thinking: null }, droppedEffort: null });
  });
});
