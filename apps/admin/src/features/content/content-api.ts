import type { ApiClient } from '../../api/client';

/** `apps/api/src/content/content.constants.ts` — keep in step with the API when either list changes. */
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const VALID_POS = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'determiner',
  'conjunction', 'number', 'modal auxiliary', 'be-verb', 'do-verb', 'have-verb',
  'infinitive-to', 'interjection',
] as const;

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed';

export type SourceView = {
  id: string;
  kind: 'third_party' | 'owner';
  name: string;
  version: string;
  url: string | null;
  license: string;
  attribution: string;
  display_priority: number;
  /** The owner's source and the built-in AGID one: neither can be edited or deleted (set by the API). */
  protected?: boolean;
};
export type NewSource = Omit<SourceView, 'id' | 'kind' | 'protected'>;

export type UploadListItem = { id: string; status: JobStatus; file_name: string; row_count: number; created_at: string };
export type Page<T> = { items: T[]; next_page_token: string | null };

/** Counter keys of `emptyCounters()` in `apps/api/src/content-pipeline/import/`; absent while the batch has not reported yet. */
export type BatchCounters = Partial<
  Record<
    'processed' | 'created' | 'updated' | 'unchanged' | 'rejected' | 'entries_created' | 'variants_created' | 'levels_created' | 'senses_created' | 'revisions_created',
    number
  >
>;
export type BatchView = {
  id: string;
  status: JobStatus;
  file_name: string;
  row_count: number;
  counters: BatchCounters;
  warnings: string[];
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  reverted: boolean;
};
export type RevertReport = {
  removed: Record<'entry' | 'variant' | 'level' | 'sense' | 'revision', number>;
  skipped: Array<{ type: string; id: string; reason: string }>;
};

export type TopicView = { code: string; names: { vi?: string; en?: string }; archived_at: string | null };

/** Empty strings and `undefined` mean "no filter" and are left out of the query string. */
export type SenseFilter = { status?: string; level?: string; pos?: string; topic?: string; batch_id?: string };
export type PublishJobCounters = { processed?: number; pending?: number; published?: number; already_published?: number; refused?: number };
export type PublishJobView = {
  id: string;
  status: JobStatus;
  snapshot_count: number;
  not_ready_count: number;
  counters: PublishJobCounters;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};
export type PublishJobListItem = PublishJobView & { filter: SenseFilter };

const PAGE_SIZE = 20;
const SOURCES = '/v1/admin/content/sources';
const UPLOADS = '/v1/admin/content/uploads';
const JOBS = '/v1/admin/content/senses/publish-jobs';

function pageQuery(pageToken?: string): string {
  const query = new URLSearchParams({ page_size: String(PAGE_SIZE) });
  if (pageToken) query.set('page_token', pageToken);
  return `?${query}`;
}

export async function listSources(api: ApiClient): Promise<SourceView[]> {
  return (await api.get<{ items: SourceView[] }>(SOURCES)).items;
}

export function createSource(api: ApiClient, body: NewSource): Promise<SourceView> {
  return api.post(SOURCES, body);
}

/** Only the keys that changed; `kind` is not editable, and the API refuses an empty body and a protected source. */
export function updateSource(api: ApiClient, id: string, body: Partial<NewSource>): Promise<SourceView> {
  return api.patch(`${SOURCES}/${encodeURIComponent(id)}`, body);
}

/** The API refuses a source that a level or an import batch still refers to (`source-in-use`) and the owner's (`source-protected`). */
export function deleteSource(api: ApiClient, id: string): Promise<void> {
  return api.delete<void>(`${SOURCES}/${encodeURIComponent(id)}`);
}

export function listUploads(api: ApiClient, pageToken?: string): Promise<Page<UploadListItem>> {
  return api.get(`${UPLOADS}${pageQuery(pageToken)}`);
}

export function createUpload(api: ApiClient, file: File, levelSourceId: string | null, key: string): Promise<{ batch_id: string; status: 'queued' }> {
  const form = new FormData();
  form.append('file', file, file.name);
  if (levelSourceId) form.append('level_source_id', levelSourceId);
  return api.postForm(UPLOADS, form, { idempotencyKey: key });
}

export function getUpload(api: ApiClient, id: string): Promise<BatchView> {
  return api.get(`${UPLOADS}/${id}`);
}

export function revertUpload(api: ApiClient, id: string, key: string): Promise<{ report: RevertReport }> {
  return api.post(`${UPLOADS}/${id}/revert`, undefined, { idempotencyKey: key });
}

export function downloadRejected(api: ApiClient, id: string): Promise<Blob> {
  return api.getBlob(`${UPLOADS}/${id}/rejected.csv`);
}

export function exportSenses(api: ApiClient, filter: SenseFilter): Promise<Blob> {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(filter)) if (value) query.set(name, value);
  const suffix = query.size > 0 ? `?${query}` : '';
  return api.getBlob(`/v1/admin/content/senses/export${suffix}`);
}

export async function listTopics(api: ApiClient): Promise<TopicView[]> {
  return (await api.get<{ items: TopicView[] }>('/v1/admin/taxonomy/topics')).items;
}

export function createTopic(api: ApiClient, body: { code: string; names: { vi?: string; en?: string } }): Promise<TopicView> {
  return api.post('/v1/admin/taxonomy/topics', body);
}

/** Rename (`names`) or archive / use again (`archived`); there is no delete. */
export function updateTopic(api: ApiClient, code: string, body: { names: { vi?: string; en?: string } } | { archived: boolean }): Promise<TopicView> {
  return api.patch(`/v1/admin/taxonomy/topics/${encodeURIComponent(code)}`, body);
}

export function createPublishJob(api: ApiClient, filter: SenseFilter, key: string): Promise<{ job_id: string }> {
  return api.post(JOBS, { filter }, { idempotencyKey: key });
}

export function listPublishJobs(api: ApiClient, pageToken?: string): Promise<Page<PublishJobListItem>> {
  return api.get(`${JOBS}${pageQuery(pageToken)}`);
}

export function getPublishJob(api: ApiClient, id: string): Promise<PublishJobView> {
  return api.get(`${JOBS}/${id}`);
}

export function downloadPublishReport(api: ApiClient, id: string): Promise<Blob> {
  return api.getBlob(`${JOBS}/${id}/report.csv`);
}
