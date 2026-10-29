import { describe, expect, it } from 'vitest';
import type { AiModel, AiOperationSetting } from './ai-api';
import { sameDraft, switchModel, toBody, toDraft } from './operation-draft';

const model = (over: Partial<AiModel>): AiModel => ({
  id: 'm1', provider: 'openai', model_id: 'gpt-x', shutdown_at: null, lifecycle: null, effort_choices: [], thinking_off_available: false,
  structured_outputs: true, max_output_tokens: null, price: null, note: null, info_checked_at: '2026-10-15T02:12:00.000Z', used_by: [], estimate: null, hidden: false, ...over,
});
const setting: AiOperationSetting = {
  operation: 'lookup_word', model: { id: 'm1', provider: 'openai', model_id: 'gpt-x' }, effort: 'high', thinking: 'off', max_output_tokens: 800,
  version: 4, input_fields: [], estimate: null,
};

describe('operation draft', () => {
  it('round-trips a server row into the PUT body with the row version', () => {
    expect(toBody(toDraft(setting), setting.version)).toEqual({ expected_version: 4, model_ref: 'm1', effort: 'high', thinking: 'off', max_output_tokens: 800 });
    expect(sameDraft(toDraft(setting), toDraft({ ...setting }))).toBe(true);
    expect(sameDraft(toDraft(setting), { ...toDraft(setting), effort: null })).toBe(false);
  });

  it('a model without the chosen effort sends effort back to default and names the level it dropped', () => {
    const next = switchModel(toDraft(setting), 'm2', [model({ id: 'm2', effort_choices: ['low'], thinking_off_available: true })]);
    expect(next.draft).toMatchObject({ modelId: 'm2', effort: null, thinking: 'off' });
    expect(next.droppedEffort).toBe('high');
  });

  it('a model that keeps the effort keeps it; no dropped level', () => {
    const next = switchModel(toDraft(setting), 'm2', [model({ id: 'm2', effort_choices: ['low', 'high'], thinking_off_available: true })]);
    expect(next.draft.effort).toBe('high');
    expect(next.droppedEffort).toBeNull();
  });

  it('a model that cannot turn thinking off clears "Tắt"', () => {
    const next = switchModel(toDraft(setting), 'm2', [model({ id: 'm2', effort_choices: ['high'], thinking_off_available: false })]);
    expect(next.draft.thinking).toBeNull();
  });

  it('"Không có model" clears effort and thinking and keeps the token count', () => {
    const next = switchModel(toDraft(setting), null, []);
    expect(next.draft).toEqual({ modelId: null, effort: null, thinking: null, tokens: 800 });
    expect(next.droppedEffort).toBeNull();
  });
});
