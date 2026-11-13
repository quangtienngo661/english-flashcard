import type { ApiClient } from '../../api/client';

/** One row of `GET /v1/admin/faq`, in the API's order (position, then creation). */
export type AdminFaqItem = {
  id: string;
  position: number;
  question: string;
  answer: string;
  published: boolean;
  row_version: number;
  updated_at: string;
  updated_by: { id: string; email: string | null } | null;
};

/** The body of a create; a PATCH sends the same fields under `expected_version`. */
export type FaqFields = { question: string; answer: string; position: number; published: boolean };

export const faqKeys = { list: ['faq'] as const };

export const listFaq = (api: ApiClient) => api.get<{ items: AdminFaqItem[] }>('/v1/admin/faq');

export const createFaq = (api: ApiClient, body: FaqFields, idempotencyKey: string) =>
  api.post<AdminFaqItem>('/v1/admin/faq', body, { idempotencyKey });

/** A stale `expectedVersion` is refused with 409 `faq-version-conflict`. */
export const updateFaq = (api: ApiClient, id: string, expectedVersion: number, body: FaqFields, idempotencyKey: string) =>
  api.patch<AdminFaqItem>(`/v1/admin/faq/${id}`, { expected_version: expectedVersion, ...body }, { idempotencyKey });

export const deleteFaq = (api: ApiClient, id: string) => api.delete<void>(`/v1/admin/faq/${id}`);
