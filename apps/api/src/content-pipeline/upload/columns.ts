const identityAndSelectorColumns = new Set([
  'headword',
  'lemma',
  'pos',
  'context_label',
  'sense_id',
  'revision',
  'replace_meaning',
  // Entry level (D29): every row of one entry carries the same value or leaves it empty.
  'inflections',
]);
const levelColumns = new Set(['cefr', 'level']);
const contentColumns = new Set([
  'gloss_vi',
  'definition_en',
  'example_en_1',
  'example_en_2',
  'example_en_3',
  'topics',
  'accepted_forms',
  'form_of',
]);
const extraColumns = new Set([
  'coreinventory 1',
  'coreinventory 2',
  'threshold',
  'notes',
]);

/** Headers are already trimmed and lower-case; problems are warnings only. */
export function classifyColumns(headers: string[]): {
  hasLevelColumn: boolean;
  contentColumns: string[];
  extraColumns: string[];
  ignoredColumns: string[];
  unknownColumns: string[];
  problems: string[];
} {
  const result = {
    hasLevelColumn: false,
    contentColumns: [] as string[],
    extraColumns: [] as string[],
    ignoredColumns: [] as string[],
    unknownColumns: [] as string[],
    problems: [] as string[],
  };
  for (const header of headers) {
    if (header.startsWith('_')) {
      result.ignoredColumns.push(header);
    } else if (levelColumns.has(header)) {
      result.hasLevelColumn = true;
    } else if (contentColumns.has(header)) {
      result.contentColumns.push(header);
    } else if (extraColumns.has(header)) {
      result.extraColumns.push(header);
    } else if (!identityAndSelectorColumns.has(header)) {
      result.unknownColumns.push(header);
      result.problems.push(
        `Unknown column "${header}" is ignored. Check its spelling if you intended a supported column.`,
      );
    }
  }
  return result;
}
