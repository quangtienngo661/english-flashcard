import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  ContentRuleError, INFLECTION_KINDS, LEVELS, MAX_EXAMPLES, normalizeContent, normalizeText,
  OWNER_SOURCE_ID, splitHeadword, VALID_POS, type InflectionKind, type Level, type RevisionContent,
} from '../../content/index.js';
import type { RowError } from './row-errors.js';

export type NormalizedRow = {
  rowNumber: number;
  lemma: string;
  variants: string[];
  pos: string;
  level: Level | null;
  levelExtra: Record<string, string> | null;
  content: Partial<RevisionContent> | null;
  senseId: string | null;
  revision: number | null;
  contextLabel: string | null;
  replaceMeaning: boolean;
  /** Reviewed forms for the entry; null keeps what the entry has (empty cell or no column). */
  inflections: Array<{ form: string; kind: InflectionKind }> | null;
  /** The base this sense is a form of; 'clear' removes the link; null keeps it. */
  formOf: { lemma: string; pos: string; kind: InflectionKind } | 'clear' | null;
};

const kindList = INFLECTION_KINDS.join(', ');
const isKind = (value: string): value is InflectionKind => INFLECTION_KINDS.some((kind) => kind === value);

/** `kind:form; kind:form`, normalized and grouped by kind; within a kind the cell's order is kept (it is stored). */
export function parseInflections(cell: string): Array<{ form: string; kind: InflectionKind }> | RowError {
  // "-" records a reviewed decision that the entry has no inflected forms (M3).
  if (normalizeText(cell) === '-') return [];
  const forms = new Map<string, { form: string; kind: InflectionKind }>();
  for (const piece of splitList(cell)) {
    const colon = piece.indexOf(':');
    const kind = normalizeText(piece.slice(0, Math.max(colon, 0))).toLowerCase();
    const form = normalizeText(piece.slice(colon + 1));
    if (colon < 0 || !isKind(kind) || !form || form.includes('\0') || [...form].length > maxLemmaLength) {
      return { code: 'invalid-inflection',
        message: `Dạng chia ${JSON.stringify(piece)} không hợp lệ. Viết kind:form, cách nhau bằng dấu chấm phẩy; kind là một trong: ${kindList}. Ghi "-" nếu từ này không có dạng chia.` };
    }
    forms.set(`${kind}\0${form}`, { form, kind });
  }
  return [...forms.values()].sort((a, b) => INFLECTION_KINDS.indexOf(a.kind) - INFLECTION_KINDS.indexOf(b.kind));
}

export function formatInflections(forms: ReadonlyArray<{ form: string; kind: string }>): string {
  return forms.map(({ kind, form }) => `${kind}:${form}`).join('; ');
}

// The parts of speech each kind can come from (L9): a verb form of a noun is not a link.
const KIND_POS: Record<InflectionKind, readonly string[]> = {
  third_person: ['verb', 'be-verb', 'do-verb', 'have-verb'], present_participle: ['verb', 'be-verb', 'do-verb', 'have-verb'],
  past: ['verb', 'be-verb', 'do-verb', 'have-verb'], past_participle: ['verb', 'be-verb', 'do-verb', 'have-verb'],
  plural: ['noun'], comparative: ['adjective', 'adverb'], superlative: ['adjective', 'adverb'],
};

/** `lemma/pos:kind`, e.g. go/verb:past_participle; `-` clears. */
function parseFormOf(cell: string): NormalizedRow['formOf'] | RowError {
  const value = normalizeText(cell);
  if (!value) return null;
  if (value === '-') return 'clear';
  const colon = value.lastIndexOf(':');
  const slash = value.lastIndexOf('/', colon);
  const lemma = value.slice(0, Math.max(slash, 0));
  const pos = value.slice(slash + 1, colon).toLowerCase();
  const kind = value.slice(colon + 1).toLowerCase();
  if (colon < 0 || slash <= 0 || value.includes('\0') || [...lemma].length > maxLemmaLength
    || !VALID_POS.some((valid) => valid === pos) || !isKind(kind) || !KIND_POS[kind].includes(pos)) {
    return { code: 'invalid-form-of',
      message: `Form_of ${JSON.stringify(cell)} không hợp lệ. Viết lemma/pos:kind (ví dụ go/verb:past_participle), "-" để bỏ liên kết; kind là một trong: ${kindList}, và phải hợp loại từ của từ gốc (động từ: dạng động từ; danh từ: plural; tính từ, trạng từ: comparative, superlative).` };
  }
  return { lemma, pos, kind };
}

const contentColumns = [
  'gloss_vi', 'definition_en', 'example_en_1', 'example_en_2', 'example_en_3',
  'topics', 'accepted_forms',
] as const;
const exampleColumns = ['example_en_1', 'example_en_2', 'example_en_3'] as const;
const extraColumns = ['coreinventory 1', 'coreinventory 2', 'threshold', 'notes'] as const;
const uuidSchema = z.uuid();
const maxLemmaLength = 100;
const maxCellLength = 2_000;

function splitList(value: string): string[] {
  return value.split(';').map((piece) => piece.trim()).filter(Boolean);
}

export function normalizeRow(
  rowNumber: number,
  cells: Record<string, string>,
  layout: { hasLevelColumn: boolean },
): { ok: true; row: NormalizedRow } | { ok: false; errors: RowError[] } {
  const errors: RowError[] = [];
  const rawHeadword = cells.headword ?? cells.lemma ?? '';
  const { lemma, variants } = splitHeadword(rawHeadword);
  const lemmaLength = [...lemma].length;
  if (!lemma) {
    errors.push({ code: 'lemma-required',
      message: `Headword ${JSON.stringify(rawHeadword)} thiếu lemma. Điền lemma không để trống.` });
  }
  if (lemmaLength > maxLemmaLength) {
    errors.push({ code: 'lemma-too-long',
      message: `Lemma ${JSON.stringify(lemma)} có ${lemmaLength} ký tự; tối đa ${maxLemmaLength} ký tự.` });
  }

  const rawPos = cells.pos ?? '';
  const pos = normalizeText(rawPos).toLowerCase();
  if (!VALID_POS.some((value) => value === pos)) {
    errors.push({ code: 'invalid-pos',
      message: `Loại từ ${JSON.stringify(rawPos)} không hợp lệ. Giá trị hợp lệ: ${VALID_POS.join(', ')}.` });
  }

  let level: Level | null = null;
  let levelExtra: Record<string, string> | null = null;
  if (layout.hasLevelColumn) {
    const rawLevel = cells.cefr ?? cells.level ?? '';
    const normalizedLevel = normalizeText(rawLevel).toUpperCase();
    if (normalizedLevel) {
      level = LEVELS.find((value) => value === normalizedLevel) ?? null;
      if (level === null) {
        errors.push({ code: 'invalid-level',
          message: `Level ${JSON.stringify(rawLevel)} không hợp lệ. Giá trị hợp lệ: ${LEVELS.join(', ')}.` });
      }
    }
    const extra: Record<string, string> = {};
    for (const column of extraColumns) {
      if (Object.hasOwn(cells, column) && cells[column].trim()) extra[column] = cells[column];
    }
    if (Object.keys(extra).length > 0) levelExtra = extra;
  }

  const contentCells: Record<string, string> = {};
  for (const column of [...contentColumns, 'form_of', 'inflections'] as const) {
    if (Object.hasOwn(cells, column)) {
      // Exactly one anchored pass, before normalization, length checks or hashing (§8).
      contentCells[column] = cells[column].replace(/^'[=+\-@]/u, (prefix) => prefix.slice(1));
    }
  }
  const inflections = contentCells.inflections?.trim() ? parseInflections(contentCells.inflections) : null;
  if (inflections !== null && !Array.isArray(inflections)) errors.push(inflections);
  const formOf = parseFormOf(contentCells.form_of ?? '');
  if (formOf !== null && typeof formOf === 'object' && 'code' in formOf) errors.push(formOf);
  else if (formOf !== null && formOf !== 'clear' && formOf.lemma === lemma && formOf.pos === pos) {
    errors.push({ code: 'invalid-form-of', message: `Form_of ${JSON.stringify(contentCells.form_of)} trỏ tới chính từ của dòng này; một dạng chia phải trỏ tới từ gốc khác.` });
  }
  delete contentCells.form_of;
  delete contentCells.inflections;
  const lengthCheckedCells = { ...contentCells };
  if (Object.hasOwn(cells, 'context_label')) lengthCheckedCells.context_label = cells.context_label;
  for (const [column, value] of Object.entries(lengthCheckedCells)) {
    const length = [...value].length;
    if (length > maxCellLength) {
      errors.push({ code: 'cell-too-long',
        message: `Ô ${JSON.stringify(column)} có ${length} ký tự; tối đa ${maxCellLength} ký tự.` });
    }
  }

  let content: Partial<RevisionContent> | null = null;
  if (Object.values(contentCells).some((value) => value.trim())) {
    const partial: Partial<RevisionContent> = {};
    if (Object.hasOwn(contentCells, 'gloss_vi')) partial.glossVi = contentCells.gloss_vi.trim() ? contentCells.gloss_vi : null;
    if (Object.hasOwn(contentCells, 'definition_en')) partial.definitionEn = contentCells.definition_en.trim() ? contentCells.definition_en : null;
    if (exampleColumns.some((column) => Object.hasOwn(contentCells, column))) {
      partial.examplesEn = exampleColumns.map((column) => contentCells[column] ?? '').filter((value) => value.trim());
    }
    if (Object.hasOwn(contentCells, 'topics')) partial.topicCodes = splitList(contentCells.topics);
    if (Object.hasOwn(contentCells, 'accepted_forms')) partial.acceptedForms = splitList(contentCells.accepted_forms);
    try {
      content = normalizeContent(partial, lemma);
    } catch (error) {
      if (error instanceof ContentRuleError && error.code === 'too-many-examples') {
        errors.push({ code: 'too-many-examples',
          message: `Các ví dụ ${JSON.stringify(partial.examplesEn)} vượt giới hạn ${MAX_EXAMPLES} câu không trống.` });
      } else {
        // normalizeContent also rejects NUL with validation-failed. The shared row-code
        // contract has only cell-too-long for cell validation; preserve the actual cause
        // in the message. Oversized cells have already been reported individually above.
        for (const [column, value] of Object.entries(contentCells)) {
          if (value.includes('\0')) {
            errors.push({ code: 'cell-too-long',
              message: `Ô ${JSON.stringify(column)} có giá trị ${JSON.stringify(value)} chứa ký tự NUL, không hợp lệ cho nội dung (${[...value].length} ký tự; giới hạn ${maxCellLength}).` });
          }
        }
      }
    }
  }

  const contextLabel = normalizeText(cells.context_label ?? '') || null;
  const rawSenseId = cells.sense_id ?? '';
  const normalizedSenseId = normalizeText(rawSenseId);
  let senseId: string | null = null;
  if (normalizedSenseId) {
    const parsed = uuidSchema.safeParse(normalizedSenseId);
    if (parsed.success) senseId = parsed.data;
    else errors.push({ code: 'sense-not-found',
      message: `Sense_id ${JSON.stringify(rawSenseId)} không phải định danh UUID hợp lệ.` });
  }

  let revision: number | null = null;
  if (senseId !== null) {
    const rawRevision = cells.revision ?? '';
    const normalizedRevision = normalizeText(rawRevision);
    const candidate = Number(normalizedRevision);
    if (/^[1-9]\d*$/u.test(normalizedRevision) && Number.isSafeInteger(candidate)) revision = candidate;
    else errors.push({ code: 'revision-required',
      message: `Sense_id ${JSON.stringify(senseId)} cần revision là số nguyên dương không có số 0 ở đầu; giá trị nhận được: ${JSON.stringify(rawRevision)}.` });
  }
  const replaceMeaning = normalizeText(cells.replace_meaning ?? '').toLowerCase() === 'true';

  if (errors.length > 0) return { ok: false, errors };
  const link = formOf as NormalizedRow['formOf'];
  return { ok: true, row: {
    rowNumber, lemma, variants, pos, level, levelExtra,
    // A form_of cell naming a base is a content change on its own; "-" alone only clears a named sense's link, so a
    // row with nothing else never creates an empty draft sense (M4). The processor resolves the base to an entry id.
    content: content ?? ((link !== null && link !== 'clear') || (link === 'clear' && senseId !== null) ? {} : null),
    senseId, revision, contextLabel, replaceMeaning,
    inflections: inflections as NormalizedRow['inflections'], formOf: link,
  } };
}

function tupleKey(tuple: Array<string | null>): { key: string; hash: string } {
  const key = JSON.stringify(tuple);
  return { key, hash: createHash('sha256').update(key, 'utf8').digest('hex') };
}

/** Debuggable JSON [sourceId, lemma, pos]; SHA-256 hex of that exact UTF-8 JSON.
 * Inputs are already normalized by normalizeRow; case-sensitive lemmas stay distinct.
 */
export function levelKey(
  row: Pick<NormalizedRow, 'lemma' | 'pos'>,
  sourceId: string,
): { key: string; hash: string } {
  return tupleKey([sourceId, row.lemma, row.pos]);
}

/** JSON [OWNER_SOURCE_ID, lemma, pos, senseId ?? contextLabel ?? null], hashed as above.
 * This hashes identity only; revision content is hashed separately by contentHash.
 */
export function contentKey(
  row: Pick<NormalizedRow, 'lemma' | 'pos' | 'contextLabel' | 'senseId'>,
): { key: string; hash: string } {
  return tupleKey([OWNER_SOURCE_ID, row.lemma, row.pos, row.senseId ?? row.contextLabel ?? null]);
}
