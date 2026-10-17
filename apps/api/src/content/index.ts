export {
  FUNCTION_WORD_POS, INFLECTION_KINDS, LEVELS, MAX_EXAMPLES, OWNER_SOURCE_ID, VALID_POS, isFunctionWordPos,
  type InflectionKind, type Level,
} from './content.constants.js';
export type { EntryByForm, InflectionInput, InflectionSource } from './inflections/inflections.service.js';
export { ContentService } from './content.service.js';
export { BATCH_SCOPE, type BatchScope } from './batch-scope.port.js';
export { entriesExportQuery, sensesExportQuery, type EntriesExportFilter, type SenseFilter } from './catalog/sense-filters.js';
export type { EntryExportRow, ExportRow, ScopeRecord } from './catalog/admin-catalog.queries.js';
export { normalizeText, normalizeLemma, splitHeadword } from './catalog/normalize.js';
export type { SourceView } from './sources/sources.service.js';
export { ContentRuleError, contentHash, mergeContent, normalizeContent, type RevisionContent } from './senses/revision-content.js';
export type { PublishItem, PublishItemResult, PublishViolation, QuickPublishResult, SenseStateResult } from './senses/publish.service.js';
