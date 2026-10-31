import { describe, expect, it } from 'vitest';
import type { AiModel } from './ai-api';
import { modelChoices } from './model-choices';

const model = (id: string, over: Partial<AiModel> = {}): AiModel => ({
  id, provider: 'openai', model_id: `m-${id}`, shutdown_at: null, lifecycle: null, effort_choices: [], thinking_off_available: false, structured_outputs: true,
  max_output_tokens: null, price: null, note: null, info_checked_at: '2026-10-15T02:12:00.000Z', used_by: [], estimate: null, hidden: false, ...over,
});

const active = model('active', { lifecycle: 'active' });
const retired = model('retired', { lifecycle: 'retired' });
const unknown = model('unknown');
const hidden = model('hidden', { hidden: true });

describe('modelChoices (D40, B50)', () => {
  it('offers the models that are neither hidden nor retired, in the order given', () => {
    expect(modelChoices([active, retired, unknown, hidden], null)).toEqual([active, unknown]);
  });

  it('keeps the selected model even when it is hidden or retired, in its place in the list', () => {
    expect(modelChoices([active, retired, unknown, hidden], 'hidden')).toEqual([active, unknown, hidden]);
    expect(modelChoices([active, retired, unknown, hidden], 'retired')).toEqual([active, retired, unknown]);
  });

  it('an id that is not in the list adds nothing, and an empty list stays empty', () => {
    expect(modelChoices([active], 'gone')).toEqual([active]);
    expect(modelChoices([], 'x')).toEqual([]);
  });
});
