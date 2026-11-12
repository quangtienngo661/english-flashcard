import { z } from 'zod';
import { normalizeText } from '../catalog/normalize.js';
import { MAX_EXAMPLES } from '../content.constants.js';
import type { RevisionContent } from './revision-content.js';

/** One text cell of a sense body: normalized, no NUL, at most 2,000 characters (design §5, PE10). */
export const cell = z.string().transform(normalizeText).refine((value) => !value.includes('\0') && [...value].length <= 2_000);

/** The sense content shared by the draft, create and quick-publish routes (snake_case API fields). */
export const contentSchema = z.strictObject({
  gloss_vi: cell.nullable().optional(), definition_en: cell.nullable().optional(),
  examples_en: z.array(cell).max(MAX_EXAMPLES).optional(), topics: z.array(cell).optional(),
  accepted_forms: z.array(cell).optional(),
  // Round C (H11): UK / US transcription without slashes; checked by normalizeContent (`ipa-invalid` names the field and the character).
  ipa_uk: cell.nullable().optional(), ipa_us: cell.nullable().optional(),
});
export type ContentBody = z.infer<typeof contentSchema>;

export function toContent(body: ContentBody): Partial<RevisionContent> {
  return {
    ...(body.gloss_vi !== undefined ? { glossVi: body.gloss_vi } : {}),
    ...(body.definition_en !== undefined ? { definitionEn: body.definition_en } : {}),
    ...(body.examples_en !== undefined ? { examplesEn: body.examples_en } : {}),
    ...(body.topics !== undefined ? { topicCodes: body.topics } : {}),
    ...(body.accepted_forms !== undefined ? { acceptedForms: body.accepted_forms } : {}),
    ...(body.ipa_uk !== undefined ? { ipaUk: body.ipa_uk } : {}),
    ...(body.ipa_us !== undefined ? { ipaUs: body.ipa_us } : {}),
  };
}
