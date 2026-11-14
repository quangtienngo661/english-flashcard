import type { ApiClient } from '../../api/client';

/** One row of `GET /v1/admin/practice/unknown-forms` (`UnknownFormsAdminService.list`): a form AI used that the tables lack. */
export type UnknownForm = {
  id: string;
  /** The lemma, lower case. */
  lemma_key: string;
  form: string;
  rejected_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

/** What `POST /v1/admin/content/word-forms` answers: the row to delete again if the staff member undoes. */
export type AcceptedForm = { id: string; lemma_key: string; form: string };

const PAGE_SIZE = 20;

export function listUnknownForms(api: ApiClient, pageToken?: string) {
  const query = new URLSearchParams({ page_size: String(PAGE_SIZE) });
  if (pageToken) query.set('page_token', pageToken);
  return api.get<{ items: UnknownForm[]; next_page_token: string | null }>(`/v1/admin/practice/unknown-forms?${query.toString()}`);
}

/** `lemma` is the row's `lemma_key`. 409 `word-form-exists` when the table already has it. */
export function acceptForm(api: ApiClient, body: { lemma: string; form: string }, key: string) {
  return api.post<AcceptedForm>('/v1/admin/content/word-forms', body, { idempotencyKey: key });
}

/** Takes back an accepted form (the toast's [Hoàn tác]). */
export function undoForm(api: ApiClient, id: string) {
  return api.delete<void>(`/v1/admin/content/word-forms/${encodeURIComponent(id)}`);
}

/** Not a real form (a synonym, a typo): drops the row from the list. */
export function ignoreForm(api: ApiClient, id: string) {
  return api.delete<void>(`/v1/admin/practice/unknown-forms/${encodeURIComponent(id)}`);
}
