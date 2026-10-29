import type { AiModel, ConfigView, PromptExample, SaveDraftBody } from '../ai-api';
import { samePrompt, toForm, toPayload, type PromptForm } from '../prompt-form';

/** What the draft editor holds: the Prompt page's form plus the model and its settings as boxes (`max_output_tokens` is a text box's text). */
export type ConfigForm = PromptForm & {
  model_ref: string | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: string;
  note: string;
};

export function toConfigForm(view: ConfigView, inputFields: string[]): ConfigForm {
  return {
    ...toForm(view, inputFields),
    model_ref: view.model?.id ?? null,
    effort: view.effort,
    thinking: view.thinking,
    max_output_tokens: view.max_output_tokens === null ? '' : String(view.max_output_tokens),
    note: view.note ?? '',
  };
}

/** The `PUT …/draft` body, or the positions whose output is not a JSON object (nothing is sent then). An empty limit or note is `null`. */
export function toDraftBody(form: ConfigForm, expectedVersion: number): { ok: true; body: SaveDraftBody } | { ok: false; badOutputs: number[] } {
  const payload = toPayload(form);
  if (!payload.ok) return payload;
  const tokens = form.max_output_tokens.trim();
  return {
    ok: true,
    body: {
      expected_version: expectedVersion,
      instructions: payload.body.instructions,
      examples: payload.body.examples,
      model_ref: form.model_ref,
      effort: form.effort,
      thinking: form.thinking,
      max_output_tokens: tokens === '' ? null : Number(tokens),
      note: form.note.trim() === '' ? null : form.note.trim(),
    },
  };
}

/**
 * Picks a model. An effort or "Tắt" the new model does not offer goes back to the default (design §6.3); `droppedEffort` names the level that went,
 * for the hint under the field. No model clears both.
 */
export function switchConfigModel(form: ConfigForm, modelId: string | null, models: AiModel[]): { form: ConfigForm; droppedEffort: string | null } {
  const model = modelId === null ? undefined : models.find((m) => m.id === modelId);
  const keepsEffort = form.effort !== null && (model?.effort_choices.includes(form.effort) ?? false);
  return {
    form: {
      ...form,
      model_ref: modelId,
      effort: keepsEffort ? form.effort : null,
      thinking: model?.thinking_off_available ? form.thinking : null,
    },
    droppedEffort: model && form.effort !== null && !keepsEffort ? form.effort : null,
  };
}

export const sameConfigForm = (a: ConfigForm, b: ConfigForm): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Did a save whose reply was lost land? The draft on the server holds exactly what was sent (the examples' key order does not matter). */
export function sameDraftContent(draft: ConfigView, sent: SaveDraftBody): boolean {
  return (
    samePrompt(draft, { instructions: sent.instructions, examples: sent.examples as PromptExample[] }) &&
    (draft.model?.id ?? null) === sent.model_ref &&
    draft.effort === sent.effort &&
    draft.thinking === sent.thinking &&
    draft.max_output_tokens === sent.max_output_tokens &&
    (draft.note ?? null) === sent.note
  );
}
