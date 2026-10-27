import type { AiModel, AiOperationSetting, SaveOperationBody } from './ai-api';

/** What a row of the Thao tác screen is showing while it is being edited. */
export type Draft = { modelId: string | null; effort: string | null; thinking: 'off' | null; tokens: number | null };

export const toDraft = (setting: AiOperationSetting): Draft => ({
  modelId: setting.model?.id ?? null,
  effort: setting.effort,
  thinking: setting.thinking,
  tokens: setting.max_output_tokens,
});

export const sameDraft = (a: Draft, b: Draft): boolean =>
  a.modelId === b.modelId && a.effort === b.effort && a.thinking === b.thinking && a.tokens === b.tokens;

export const toBody = (draft: Draft, version: number): SaveOperationBody => ({
  expected_version: version,
  model_ref: draft.modelId,
  effort: draft.effort,
  thinking: draft.thinking,
  max_output_tokens: draft.tokens,
});

/**
 * Picks a model. An effort or "Tắt" the new model does not offer goes back to the default on the form (design §6.3);
 * `droppedEffort` names the level that went, for the hint under the field.
 */
export function switchModel(draft: Draft, modelId: string | null, models: AiModel[]): { draft: Draft; droppedEffort: string | null } {
  const model = modelId === null ? undefined : models.find((m) => m.id === modelId);
  const keepsEffort = draft.effort !== null && (model?.effort_choices.includes(draft.effort) ?? false);
  return {
    draft: {
      ...draft,
      modelId,
      effort: keepsEffort ? draft.effort : null,
      thinking: model?.thinking_off_available ? draft.thinking : null,
    },
    droppedEffort: model && draft.effort !== null && !keepsEffort ? draft.effort : null,
  };
}
