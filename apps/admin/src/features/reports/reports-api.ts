import type { ApiClient } from '../../api/client';
import type { UserRef } from '../../api/user-ref';

export type ReportStatus = 'open' | 'no_error' | 'fixed' | 'confirmed';
export type ResolveStatus = Exclude<ReportStatus, 'open'>;
export type QuestionSource = 'rule' | 'ai';

/** `question_snapshot` as `apps/api/src/practice/reports/snapshot.ts` builds it (private words already masked). */
export type ReportSnapshot = {
  type: string;
  prompt: {
    kind: string;
    meaning?: string;
    lemma?: string;
    sentence?: string;
    highlight?: string;
    options?: string[];
  };
  correct: {
    lemma?: string;
    meaning?: string;
    option_index?: number;
    is_true?: boolean;
    main?: string;
    accepted?: string[];
  };
  hints_shown: Record<'level1' | 'level2' | 'level3', unknown>;
  /** `option_index` is missing on a report older than the field, and null when the learner gave no answer. */
  learner: { answer: string | null; option_index?: number | null; answers_tried: string[]; result: string | null; hint_level: number };
};

/** One row of `GET /v1/admin/practice/reports` and the body of `GET …/reports/:id` and of the resolve call (`staffView`). */
export type Report = {
  id: string;
  sense_id: string | null;
  reason: string;
  reason_label: string;
  note: string | null;
  status: ReportStatus;
  question_snapshot: ReportSnapshot;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_by_role: string | null;
  resolved_by_user: UserRef | null;
  refundable: boolean;
  question_source: QuestionSource;
  ai_operation_id: string | null;
  call_operation_id: string | null;
  model: string | null;
  prompt_revision: number | null;
  ai_charged: boolean;
  /** `true` given back, `false` not given back, `null` not decided yet (the hourly job retries). */
  refunded: boolean | null;
};

export type ReasonAppliesTo = 'ai' | 'non_ai' | 'all';

/** One row of `GET …/report-reasons` (`adminView` in `report-reasons.service.ts`), in the API's `position` order. */
export type ReportReason = {
  code: string;
  label_vi: string;
  label_en: string;
  detail_hint_vi: string | null;
  detail_hint_en: string | null;
  applies_to: ReasonAppliesTo;
  note_required: boolean;
  refundable: boolean;
  active: boolean;
  position: number;
  updated_at: string;
  updated_by_user: UserRef | null;
};

/** The body of "thêm lý do" (`createReasonSchema`); a hint left empty is `null`. */
export type ReasonFields = {
  label_vi: string;
  label_en: string;
  detail_hint_vi: string | null;
  detail_hint_en: string | null;
  applies_to: ReasonAppliesTo;
  note_required: boolean;
  refundable: boolean;
  position: number;
};

export type ReportFilters = { status: string; reason: string; source: string };
const PAGE_SIZE = 20;

/** `status=open` is always sent (the API's default is every status); `all` leaves the filter out. */
export function reportsQuery(filters: ReportFilters, pageToken?: string): string {
  const query = new URLSearchParams();
  if (filters.status !== 'all') query.set('status', filters.status);
  if (filters.reason !== 'all') query.set('reason', filters.reason);
  if (filters.source !== 'all') query.set('source', filters.source);
  query.set('page_size', String(PAGE_SIZE));
  if (pageToken) query.set('page_token', pageToken);
  return query.toString();
}

export function listReports(api: ApiClient, filters: ReportFilters, pageToken?: string) {
  return api.get<{ items: Report[]; next_page_token: string | null }>(`/v1/admin/practice/reports?${reportsQuery(filters, pageToken)}`);
}

export function getReport(api: ApiClient, id: string) {
  return api.get<Report>(`/v1/admin/practice/reports/${encodeURIComponent(id)}`);
}

export function resolveReport(api: ApiClient, id: string, status: ResolveStatus, key: string) {
  return api.post<Report>(`/v1/admin/practice/reports/${encodeURIComponent(id)}/resolve`, { status }, { idempotencyKey: key });
}

export function listReportReasons(api: ApiClient) {
  return api.get<{ items: ReportReason[] }>('/v1/admin/practice/report-reasons');
}

export function createReportReason(api: ApiClient, body: ReasonFields & { code: string }, key: string) {
  return api.post<ReportReason>('/v1/admin/practice/report-reasons', body, { idempotencyKey: key });
}

/** PATCH is idempotent by itself (the same value twice gives the same row), so it carries no key. */
export function updateReportReason(api: ApiClient, code: string, body: Partial<ReasonFields> & { active?: boolean }) {
  return api.patch<ReportReason>(`/v1/admin/practice/report-reasons/${encodeURIComponent(code)}`, body);
}

/** The word the question was about: the snapshot has no field of its own, `correct` is the answer key's reveal. */
export const reportWord = (report: Report): string => report.question_snapshot.correct.lemma ?? '—';
