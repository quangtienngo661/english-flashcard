import type { ApiClient } from '../../api/client';
import { LEVELS, type Page } from '../content/content-api';

export type Level = (typeof LEVELS)[number];
export type SenseState = 'open' | 'unpublished' | 'retired';
export type RevisionStatus = 'draft' | 'reviewed' | 'published' | 'rejected' | 'superseded';
export type SenseSummary = {
  sense_id: string;
  context_label: string | null;
  state: SenseState;
  live_revision_id: string | null;
  replaces_sense_id: string | null;
  revision: number | null;
  status: RevisionStatus | null;
};
export type Variant = { id?: string; text: string; kind: 'spelling' | 'alias'; accepted_as_answer: boolean };

/** One row of `GET /v1/admin/content/entries`. */
export type EntryView = {
  id: string;
  lemma: string;
  pos: string;
  function_word: boolean;
  function_word_derived: boolean;
  function_word_override: boolean | null;
  variants: Variant[];
  displayed_level: Level | null;
  conflict: boolean;
  senses: SenseSummary[];
};

/** URL filters (A/87): empty = no filter. */
export type WordFilters = { q: string; level: string; has_sense: string; conflict: string; batch_id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const WORD_FILTERS = {
  q: { default: '', valid: (v: string) => v.trim().length > 0 && [...v].length <= 100 },
  level: { default: '', valid: (v: string) => (LEVELS as readonly string[]).includes(v) },
  has_sense: { default: '', valid: (v: string) => v === 'true' || v === 'false' },
  conflict: { default: '', valid: (v: string) => v === 'true' },
  batch_id: { default: '', valid: (v: string) => UUID.test(v) },
};

export function entriesQuery(filters: WordFilters, pageToken?: string): string {
  const query = new URLSearchParams();
  if (filters.q.trim()) query.set('q', filters.q.trim());
  for (const key of ['level', 'has_sense', 'conflict', 'batch_id'] as const) if (filters[key]) query.set(key, filters[key]);
  query.set('page_size', '20');
  if (pageToken) query.set('page_token', pageToken);
  return query.toString();
}

export const listEntries = (api: ApiClient, filters: WordFilters, pageToken?: string) =>
  api.get<Page<EntryView>>(`/v1/admin/content/entries?${entriesQuery(filters, pageToken)}`);

export const setEditorialLevel = (api: ApiClient, id: string, level: Level) =>
  api.put<void>(`/v1/admin/content/entries/${id}/levels/editorial`, { level });

/** Replaces the whole set; ids are not sent back. */
export const setVariants = (api: ApiClient, id: string, variants: Variant[]) =>
  api.put<void>(`/v1/admin/content/entries/${id}/variants`, {
    variants: variants.map(({ text, kind, accepted_as_answer }) => ({ text, kind, accepted_as_answer })),
  });

/** `null` = back to the derived value. */
export const setFunctionWord = (api: ApiClient, id: string, override: boolean | null) =>
  api.put<void>(`/v1/admin/taxonomy/entries/${id}/function-word`, { override });

export const addSense = (api: ApiClient, entryId: string) =>
  api.post<{ sense_id: string; revision_id: string; revision: number }>('/v1/admin/content/senses', { entry_id: entryId });

export type BatchLine = { line: number; status: 'created' | 'exists' | 'invalid'; entry_id?: string; sense_id?: string; warnings: string[] };
export const MAX_PASTE_LINES = 500;

/** The non-empty lines of the pasted text, as the API takes them. */
export const pastedLines = (text: string) => text.split(/\r?\n/).filter((line) => line.trim() !== '');

export const createEntries = (api: ApiClient, lines: string[]) => api.post<{ items: BatchLine[] }>('/v1/admin/content/entries/batch', { lines });

/** "2 nghĩa · 1 đã publish · 1 bản nháp": counts every sense (retired too, as the API's `has_sense`). */
export function senseCounts(senses: SenseSummary[]): { total: number; published: number; draft: number; retired: number } {
  return {
    total: senses.length,
    published: senses.filter((s) => s.state === 'open' && s.live_revision_id !== null).length,
    draft: senses.filter((s) => s.state !== 'retired' && (s.status === 'draft' || s.status === 'reviewed')).length,
    retired: senses.filter((s) => s.state === 'retired').length,
  };
}
