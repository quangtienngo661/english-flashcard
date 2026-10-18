export {
  AGID_SOURCE_ID, FUNCTION_WORD_POS, INFLECTION_KINDS, LEMMA_MAX, LEVELS, MAX_EXAMPLES, MEANING_MAX, OWNER_SOURCE_ID, PRIVATE_POS_UNSET,
  PRIVATE_WORDS_MAX, SENTENCE_MAX, SENTENCES_PER_SENSE_MAX, VALID_POS, isFunctionWordPos,
  type InflectionKind, type Level,
} from './content.constants.js';
export type { EntryByForm, InflectionInput, InflectionSource } from './inflections/inflections.service.js';
export { generateInflections } from './inflections/inflect.js';
export {
  PrivateWordLimitError, type CreatePrivateSenseInput, type CreatePrivateSenseResult, type Meaning, type PrivateWordPatch,
} from './private/private-words.service.js';
export { NotVisibleError, SentenceLimitError, type Sentence } from './sentences/sentences.service.js';
export type { WordSense } from './words/words.service.js';
export type { CandidateSense, PracticeSense } from './practice/practice-senses.js';
export { maskExample, type MaskedExample, type MaskTarget } from './practice/mask-example.js';
export { ContentService } from './content.service.js';
export { BATCH_SCOPE, type BatchScope } from './batch-scope.port.js';
export { entriesExportQuery, sensesExportQuery, type EntriesExportFilter, type SenseFilter } from './catalog/sense-filters.js';
export type { EntryExportRow, ExportRow, ScopeRecord } from './catalog/admin-catalog.queries.js';
export { normalizeText, normalizeLemma, splitHeadword } from './catalog/normalize.js';
export type { SourceView } from './sources/sources.service.js';
export { ContentRuleError, contentHash, mergeContent, normalizeContent, type FormOf, type RevisionContent } from './senses/revision-content.js';
export type { PublishItem, PublishItemResult, PublishViolation, QuickPublishResult, SenseStateResult } from './senses/publish.service.js';
export { CurrentLearner, LearnerContent } from './learner/learner.decorator.js';
export type { Learner } from './learner/learner-content.guard.js';
export { visibleSenseCondition } from './learner/visible-senses.js';
