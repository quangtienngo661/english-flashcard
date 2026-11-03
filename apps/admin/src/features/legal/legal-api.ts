import type { ApiClient } from '../../api/client';

export type LegalStatus = 'draft' | 'published' | 'superseded';

/** `GET /v1/admin/legal/versions`: one row per version, without the texts. */
export type LegalSummary = {
  id: string;
  number: number;
  version: string;
  status: LegalStatus;
  row_version: number;
  effective_date: string | null;
  has_english: boolean;
  updated_at: string;
  published_at: string | null;
  published_by: { id: string; email: string | null } | null;
};

/** `GET /v1/admin/legal/versions/:id`: the summary and the four Markdown texts. */
export type LegalVersion = LegalSummary & {
  privacy_vi: string;
  terms_vi: string;
  privacy_en: string | null;
  terms_en: string | null;
};

/** What a save replaces: the four texts and the date, under the `row_version` the page was opened with. */
export type LegalSaveBody = {
  expected_version: number;
  privacy_vi: string;
  terms_vi: string;
  privacy_en: string | null;
  terms_en: string | null;
  effective_date: string | null;
};

export const legalKeys = {
  list: ['legal', 'versions'] as const,
  one: (id: string) => ['legal', 'versions', id] as const,
};

export const listLegalVersions = (api: ApiClient) =>
  api.get<{ items: LegalSummary[]; next_page_token: string | null }>('/v1/admin/legal/versions?page_size=100');

export const getLegalVersion = (api: ApiClient, id: string) => api.get<LegalVersion>(`/v1/admin/legal/versions/${id}`);

/** A new draft: a copy of `copyFrom`, else of the published version, else empty. */
export const createLegalDraft = (api: ApiClient, copyFrom: string | null, idempotencyKey: string) =>
  api.post<LegalVersion>('/v1/admin/legal/versions', copyFrom === null ? {} : { copy_from: copyFrom }, { idempotencyKey });

export const saveLegalDraft = (api: ApiClient, id: string, body: LegalSaveBody, idempotencyKey: string) =>
  api.put<LegalVersion>(`/v1/admin/legal/versions/${id}`, body, { idempotencyKey });

export const publishLegalDraft = (api: ApiClient, id: string, expectedVersion: number, idempotencyKey: string) =>
  api.post<LegalVersion>(`/v1/admin/legal/versions/${id}/publish`, { expected_version: expectedVersion }, { idempotencyKey });

export const deleteLegalDraft = (api: ApiClient, id: string) => api.delete<void>(`/v1/admin/legal/versions/${id}`);
