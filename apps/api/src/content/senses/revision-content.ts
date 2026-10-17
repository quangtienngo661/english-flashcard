import { createHash } from 'node:crypto';
import { normalizeText } from '../catalog/normalize.js';
import { MAX_EXAMPLES, type InflectionKind } from '../content.constants.js';

export class ContentRuleError extends Error {
  constructor(readonly code: string) {
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
};

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
  return result;
}

export function mergeContent(base: RevisionContent, patch: Partial<RevisionContent>): RevisionContent {
  return {
    glossVi: patch.glossVi?.trim() ? patch.glossVi : base.glossVi,
    definitionEn: patch.definitionEn?.trim() ? patch.definitionEn : base.definitionEn,
    examplesEn: [...(patch.examplesEn ?? base.examplesEn)],
    topicCodes: [...(patch.topicCodes ?? base.topicCodes)],
    acceptedForms: [...(patch.acceptedForms ?? base.acceptedForms)],
    ...(patch.formOf !== undefined ? { formOf: patch.formOf } : base.formOf !== undefined ? { formOf: base.formOf } : {}),
  };
}

export function contentHash(content: RevisionContent): string {
  return createHash('sha256').update(JSON.stringify({
    glossVi: content.glossVi, definitionEn: content.definitionEn, examplesEn: content.examplesEn,
    topicCodes: [...new Set(content.topicCodes)].sort(), acceptedForms: [...new Set(content.acceptedForms)].sort(),
    // Only a set link joins the hash, so every revision stored before D29 keeps its hash.
    ...(content.formOf ? { formOf: { entryId: content.formOf.entryId, kind: content.formOf.kind } } : {}),
  })).digest('hex');
}
