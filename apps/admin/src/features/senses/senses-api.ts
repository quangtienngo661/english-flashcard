import type { ApiClient } from '../../api/client';
import { LEVELS, VALID_POS, type Page } from '../content/content-api';
import type { Level, SenseSummary } from '../words/words-api';

export type Missing = 'gloss-missing' | 'example-missing' | 'level-missing';
export type SenseContent = {
  gloss_vi: string | null;
  definition_en: string | null;
  examples_en: string[];
  topics: string[];
  accepted_forms: string[];
};

/** One row of `GET /v1/admin/content/senses` (API 10.3: `missing` on every row). */
export type SenseRow = SenseSummary & {
  entry_id: string;
  lemma: string;
  pos: string;
  displayed_level: Level | null;
  conflict: boolean;
  content: SenseContent | null;
  missing: Missing[];
};

type Actor = { id: string; email: string | null } | null;
/** `GET /v1/admin/content/senses/{id}`: the row plus the last people (of the latest revision, and of the last state change). */
export type SenseDetailView = Omit<SenseRow, 'missing'> & {
  reviewed_by: Actor;
  reviewed_at: string | null;
  published_by: Actor;
  state_changed_by: Actor;
  state_changed_at: string | null;
};

export type SenseFilters = { status: string; level: string; pos: string; topic: string; batch_id: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SENSE_STATUSES = ['unpublishable', 'open_draft', 'published'] as const;
export const SENSE_FILTERS = {
  status: { default: '', valid: (v: string) => (SENSE_STATUSES as readonly string[]).includes(v) },
  level: { default: '', valid: (v: string) => (LEVELS as readonly string[]).includes(v) },
  pos: { default: '', valid: (v: string) => (VALID_POS as readonly string[]).includes(v) },
  topic: { default: '', valid: (v: string) => /^[a-z0-9-]+$/.test(v) },
  batch_id: { default: '', valid: (v: string) => UUID.test(v) },
};

export function sensesQuery(filters: SenseFilters, pageToken?: string): string {
  const query = new URLSearchParams();
  for (const key of ['status', 'level', 'pos', 'topic', 'batch_id'] as const) if (filters[key]) query.set(key, filters[key]);
  query.set('page_size', '20');
  if (pageToken) query.set('page_token', pageToken);
  return query.toString();
}

export const listSenses = (api: ApiClient, filters: SenseFilters, pageToken?: string) =>
  api.get<Page<SenseRow>>(`/v1/admin/content/senses?${sensesQuery(filters, pageToken)}`);

export type BulkAction = 'review' | 'reject' | 'publish' | 'unpublish' | 'retire';
export const BULK_MAX = 500;
/** One row's result, the same shape for the five actions. */
export type BulkResult = { sense_id: string; ok: boolean; reason?: string; violations?: Missing[] };

/** The five bulk actions (A/88), each with every row's own `revision`; the API takes ≤ 500 rows. */
export async function runBulk(api: ApiClient, action: BulkAction, rows: Array<Pick<SenseRow, 'sense_id' | 'revision'>>): Promise<BulkResult[]> {
  const base = '/v1/admin/content/senses';
  if (action === 'review' || action === 'reject') {
    const items = rows.map((r) => ({ sense_id: r.sense_id, revision: r.revision, action: action === 'review' ? 'reviewed' : 'rejected' }));
    return (await api.post<{ items: BulkResult[] }>(`${base}/review`, { items })).items;
  }
  if (action === 'publish') {
    const items = rows.map((r) => ({ sense_id: r.sense_id, revision: r.revision }));
    const { results } = await api.post<{ results: Array<{ sense_id: string; outcome: string; reason?: string; violations?: Missing[] }> }>(
      `${base}/publish`,
      { items },
    );
    return results.map(({ sense_id, outcome, reason, violations }) => ({ sense_id, ok: outcome !== 'refused', reason, violations }));
  }
  return (await api.post<{ results: BulkResult[] }>(`${base}/${action}`, { sense_ids: rows.map((r) => r.sense_id) })).results;
}

export const getSense = (api: ApiClient, id: string) => api.get<SenseDetailView>(`/v1/admin/content/senses/${id}`);

export const saveDraft = (api: ApiClient, id: string, revision: number | null, content: SenseContent) =>
  api.put<{ sense_id: string; revision: number; dropped_topics: string[] }>(`/v1/admin/content/senses/${id}/draft`, { revision, content });

export const quickPublish = (api: ApiClient, id: string, revision: number | null, content: SenseContent) =>
  api.post<{ sense_id: string; revision: number; outcome: 'published' | 'already_published'; dropped_topics: string[] }>(
    `/v1/admin/content/senses/${id}/quick-publish`,
    { revision, content },
  );

/** What the status badge says: the sense's state wins (removed, retired), else the latest revision's status. */
export function statusKey(row: Pick<SenseSummary, 'state' | 'status' | 'live_revision_id'>): string {
  if (row.state === 'retired') return 'retired';
  if (row.state === 'unpublished') return 'unpublished';
  return row.status ?? 'none';
}

/** An open edit on top of a published sense. */
export const hasOpenEdit = (row: Pick<SenseSummary, 'status' | 'live_revision_id'>) =>
  row.live_revision_id !== null && (row.status === 'draft' || row.status === 'reviewed');
