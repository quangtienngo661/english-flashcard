export type RowErrorCode =
  | 'lemma-required'
  | 'lemma-too-long'
  | 'invalid-pos'
  | 'invalid-level'
  | 'level-differs-from-source'
  | 'unknown-topic'
  | 'topic-archived'
  | 'cell-too-long'
  | 'revision-required'
  | 'stale-revision'
  | 'sense-not-found'
  | 'sense-retired'
  | 'sense-entry-mismatch'
  | 'open-draft-conflict'
  | 'gloss-changed'
  | 'duplicate-key-in-file'
  | 'too-many-examples'
  | 'invalid-inflection'
  | 'invalid-form-of'
  | 'form-of-not-found'
  | 'inflections-differ-in-file';

export type RowError = { code: RowErrorCode; message: string };
