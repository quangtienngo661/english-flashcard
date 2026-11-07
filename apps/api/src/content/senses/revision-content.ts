import { createHash } from 'node:crypto';
import { normalizeText } from '../catalog/normalize.js';
import { MAX_EXAMPLES, type InflectionKind } from '../content.constants.js';
import { checkIpa, IPA_MAX_LENGTH, normalizeIpa } from './ipa.js';

export class ContentRuleError extends Error {
  /** `extensions`: detail for the problem response (`ipa-invalid` names the field and the character). */
  constructor(readonly code: string, readonly extensions?: Record<string, unknown>) {
    super(code);
    this.name = 'ContentRuleError';
  }
}

export type FormOf = { entryId: string; kind: InflectionKind };
export type RevisionContent = {
  glossVi: string | null;
  definitionEn: string | null;
  examplesEn: string[];
  topicCodes: string[];
  acceptedForms: string[];
  /** "This sense is a form of <entry>" (D29). Absent and null both mean no link. */
  formOf?: FormOf | null;
  /**
   * Round C: the UK and US transcription (no slashes), the data source it came from (null = typed by hand) and the learner's own
   * for a private word. Absent and null both mean none; a stored revision without them hashes as it did before.
   */
  ipaUk?: string | null;
  ipaUs?: string | null;
  ipaSourceId?: string | null;
  ipaCustom?: string | null;
};

/** Reads a revision row's ipa columns into RevisionContent shape; a column that is null stays absent (spread it into readContent results). */
export function revisionIpa(revision: { ipaUk?: string | null; ipaUs?: string | null; ipaSourceId?: string | null; ipaCustom?: string | null }):
  Pick<RevisionContent, 'ipaUk' | 'ipaUs' | 'ipaSourceId' | 'ipaCustom'> {
  return {
    ...(revision.ipaUk ? { ipaUk: revision.ipaUk } : {}), ...(revision.ipaUs ? { ipaUs: revision.ipaUs } : {}),
    ...(revision.ipaSourceId ? { ipaSourceId: revision.ipaSourceId } : {}), ...(revision.ipaCustom ? { ipaCustom: revision.ipaCustom } : {}),
  };
}

/** Reads a revision row's form-of columns into RevisionContent shape (spread it into readContent results). */
export function revisionFormOf(revision: { formOfEntryId: string | null; formKind: string | null }): Pick<RevisionContent, 'formOf'> {
  return revision.formOfEntryId && revision.formKind
    ? { formOf: { entryId: revision.formOfEntryId, kind: revision.formKind as InflectionKind } } : {};
}

function text(value: string): string {
  const normalized = normalizeText(value);
  if (normalized.includes('\0') || [...normalized].length > 2_000) throw new ContentRuleError('validation-failed');
  return normalized;
}

export function normalizeContent(partial: Partial<RevisionContent>, lemma: string): Partial<RevisionContent> {
  const result: Partial<RevisionContent> = {};
  for (const key of ['glossVi', 'definitionEn'] as const) {
    if (partial[key] !== undefined) result[key] = partial[key] === null ? null : text(partial[key]) || null;
  }
  if (partial.examplesEn !== undefined) {
    // Count after dropping blank cells: three examples plus an empty fourth column is still three.
    const examples = partial.examplesEn.map(text).filter(Boolean);
    if (examples.length > MAX_EXAMPLES) throw new ContentRuleError('too-many-examples');
    result.examplesEn = examples;
  }
  if (partial.topicCodes !== undefined) {
    result.topicCodes = [...new Set(partial.topicCodes.map((value) => text(value).toLowerCase()).filter(Boolean))];
  }
  if (partial.acceptedForms !== undefined) {
    // Design §5 lowers topics only. Accepted forms are compared case-insensitively (duplicates and the
    // lemma itself are dropped) but keep the spelling of their first occurrence ("I'm", proper nouns).
    const seen = new Set([normalizeText(lemma).toLowerCase()]);
    result.acceptedForms = partial.acceptedForms.map(text).filter((form) => {
      const key = form.toLowerCase();
      if (!form || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (partial.formOf !== undefined) result.formOf = partial.formOf;
  for (const [key, field] of [['ipaUk', 'ipa_uk'], ['ipaUs', 'ipa_us']] as const) {
    const given = partial[key];
    if (given === undefined) continue;
    const value = given === null ? '' : normalizeIpa(given);
    if ([...value].length > IPA_MAX_LENGTH) throw new ContentRuleError('validation-failed');
    const check = checkIpa(value);
    if (!check.ok) throw new ContentRuleError('ipa-invalid', { field, char: check.char });
    result[key] = value || null;
  }
  // The learner's own note is free text (DC22): no character check, only the length.
  if (partial.ipaCustom !== undefined) {
    const value = partial.ipaCustom === null ? '' : text(partial.ipaCustom);
    if ([...value].length > IPA_MAX_LENGTH) throw new ContentRuleError('validation-failed');
    result.ipaCustom = value || null;
  }
  if (partial.ipaSourceId !== undefined) result.ipaSourceId = partial.ipaSourceId;
  return result;
}

/** Absent in the patch keeps the base; null clears; a value replaces. A key neither side has stays out of the result. */
function carry<K extends 'ipaUk' | 'ipaUs' | 'ipaCustom'>(key: K, base: RevisionContent, patch: Partial<RevisionContent>):
  Pick<RevisionContent, K> | Record<string, never> {
  if (patch[key] !== undefined) return { [key]: patch[key] } as Pick<RevisionContent, K>;
  return base[key] !== undefined ? { [key]: base[key] } as Pick<RevisionContent, K> : {};
}

export function mergeContent(base: RevisionContent, patch: Partial<RevisionContent>): RevisionContent {
  // A transcription edited by hand is no longer the source's: the source goes unless the patch names one (CSV with `ipa_source_id`).
  const ipaEdited = (['ipaUk', 'ipaUs'] as const).some((key) => patch[key] !== undefined && patch[key] !== (base[key] ?? null));
  const ipaSourceId = patch.ipaSourceId !== undefined ? patch.ipaSourceId : ipaEdited ? null : base.ipaSourceId;
  return {
    glossVi: patch.glossVi?.trim() ? patch.glossVi : base.glossVi,
    definitionEn: patch.definitionEn?.trim() ? patch.definitionEn : base.definitionEn,
    examplesEn: [...(patch.examplesEn ?? base.examplesEn)],
    topicCodes: [...(patch.topicCodes ?? base.topicCodes)],
    acceptedForms: [...(patch.acceptedForms ?? base.acceptedForms)],
    ...(patch.formOf !== undefined ? { formOf: patch.formOf } : base.formOf !== undefined ? { formOf: base.formOf } : {}),
    ...carry('ipaUk', base, patch), ...carry('ipaUs', base, patch), ...carry('ipaCustom', base, patch),
    ...(ipaSourceId !== undefined ? { ipaSourceId } : {}),
  };
}

export function contentHash(content: RevisionContent): string {
  return createHash('sha256').update(JSON.stringify({
    glossVi: content.glossVi, definitionEn: content.definitionEn, examplesEn: content.examplesEn,
    topicCodes: [...new Set(content.topicCodes)].sort(), acceptedForms: [...new Set(content.acceptedForms)].sort(),
    // Only a set link joins the hash, so every revision stored before D29 keeps its hash.
    ...(content.formOf ? { formOf: { entryId: content.formOf.entryId, kind: content.formOf.kind } } : {}),
    // Likewise the transcription fields (round C): only a set one joins the hash.
    ...(content.ipaUk ? { ipaUk: content.ipaUk } : {}), ...(content.ipaUs ? { ipaUs: content.ipaUs } : {}),
    ...(content.ipaSourceId ? { ipaSourceId: content.ipaSourceId } : {}), ...(content.ipaCustom ? { ipaCustom: content.ipaCustom } : {}),
  })).digest('hex');
}
