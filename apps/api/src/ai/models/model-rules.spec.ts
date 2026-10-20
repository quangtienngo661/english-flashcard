import { describe, expect, it } from 'vitest';
import { effortChoices, OPENAI_EFFORTS, selectionViolations } from './model-rules.js';

const ANTHROPIC = { effortLevels: ['low', 'medium', 'high', 'xhigh', 'max'], thinkingOff: 'disabled', maxOutputTokens: 64_000 };
const select = (patch: Partial<Parameters<typeof selectionViolations>[0]>) => selectionViolations({
  provider: 'anthropic', model: ANTHROPIC, effort: null, thinking: null, maxOutputTokens: null, ...patch,
});

describe('effortChoices', () => {
  it('openai → the documented list; anthropic → the model levels; fake → none', () => {
    expect(OPENAI_EFFORTS).toEqual(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);
    expect(effortChoices('openai', { effortLevels: [] })).toEqual(OPENAI_EFFORTS);
    expect(effortChoices('anthropic', { effortLevels: ['low', 'high'] })).toEqual(['low', 'high']);
    expect(effortChoices('fake', { effortLevels: ['low'] })).toEqual([]);
  });
});

describe('selectionViolations', () => {
  it('default choices on any model → none', () => {
    expect(select({})).toEqual([]);
    expect(select({ provider: 'fake', model: { effortLevels: [], thinkingOff: null, maxOutputTokens: null } })).toEqual([]);
  });

  it('B6E37: thinking off on a model without disabled/between_tools → violation', () => {
    expect(select({ thinking: 'off', model: { ...ANTHROPIC, thinkingOff: null } }))
      .toEqual(['thinking: this model cannot turn thinking off']);
    expect(select({ provider: 'openai', thinking: 'off', model: { effortLevels: [], thinkingOff: null, maxOutputTokens: null } }))
      .toEqual(['thinking: this model cannot turn thinking off']);
  });

  it('B6E37: off with xhigh and with max → violation; off with high → none', () => {
    expect(select({ thinking: 'off', effort: 'xhigh' })).toEqual(['thinking: off needs effort high or below']);
    expect(select({ thinking: 'off', effort: 'max' })).toEqual(['thinking: off needs effort high or below']);
    expect(select({ thinking: 'off', effort: 'high' })).toEqual([]);
    expect(select({ thinking: 'off', model: { ...ANTHROPIC, thinkingOff: 'between_tools' } })).toEqual([]);
  });

  it('B6E36: openai effort none → none (the API cannot tell)', () => {
    expect(select({ provider: 'openai', effort: 'none', model: { effortLevels: [], thinkingOff: null, maxOutputTokens: null } }))
      .toEqual([]);
    expect(select({ provider: 'openai', effort: 'turbo', model: { effortLevels: [], thinkingOff: null, maxOutputTokens: null } }))
      .toEqual(['effort: not offered by this model']);
  });

  it('anthropic effort outside effort_levels → violation', () => {
    expect(select({ effort: 'minimal' })).toEqual(['effort: not offered by this model']);
    expect(select({ effort: 'medium' })).toEqual([]);
  });

  it('effort_levels [] → only null accepted', () => {
    const model = { effortLevels: [], thinkingOff: null, maxOutputTokens: null };
    expect(select({ model, effort: 'low' })).toEqual(['effort: not offered by this model']);
    expect(select({ provider: 'fake', model, effort: 'low' })).toEqual(['effort: not offered by this model']);
    expect(select({ model, effort: null })).toEqual([]);
  });

  it('max_output_tokens 0 and model max + 1 → violation', () => {
    expect(select({ maxOutputTokens: 0 })).toEqual(['max_output_tokens: Expected 1 to 64000']);
    expect(select({ maxOutputTokens: 64_001 })).toEqual(['max_output_tokens: Expected 1 to 64000']);
    expect(select({ maxOutputTokens: 64_000 })).toEqual([]);
    expect(select({ maxOutputTokens: 1 })).toEqual([]);
  });

  it('D28: anthropic, empty limit, unknown model maximum → no violation; 128 001 → violation', () => {
    const model = { ...ANTHROPIC, maxOutputTokens: null };
    expect(select({ model, maxOutputTokens: null })).toEqual([]);
    expect(select({ model, maxOutputTokens: 128_000 })).toEqual([]);
    expect(select({ model, maxOutputTokens: 128_001 })).toEqual(['max_output_tokens: Expected 1 to 128000']);
  });

  it('several mistakes → one violation each, in field order', () => {
    expect(select({ effort: 'minimal', thinking: 'off', maxOutputTokens: 0, model: { ...ANTHROPIC, thinkingOff: null } })).toEqual([
      'effort: not offered by this model', 'thinking: this model cannot turn thinking off', 'max_output_tokens: Expected 1 to 64000',
    ]);
  });
});
