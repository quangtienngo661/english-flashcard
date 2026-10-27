import type { ApiClient } from '../../api/client';
import type { UserRef } from '../../api/user-ref';
import { ADMIN_ZONE } from '../transactions/transactions-api';

export type GrantStatus = 'active' | 'scheduled' | 'revoked' | 'expired' | 'replaced';
export type GrantKind = 'plan' | 'limits';
export type LimitKey = 'practice_sessions_per_day' | 'ai_practice_per_cycle' | 'ai_lookup_per_cycle';
export const LIMIT_KEYS: LimitKey[] = ['practice_sessions_per_day', 'ai_practice_per_cycle', 'ai_lookup_per_cycle'];

/** The newest date change of a grant (`GrantChangeWithUser`, `apps/api/src/entitlements/grants/grants.service.ts`). */
export type GrantChange = {
  id: string;
  grant_id: string;
  changed_by: string;
  changed_by_role: string;
  changed_by_user: UserRef;
  old_starts_at: string;
  new_starts_at: string;
  old_ends_at: string;
  new_ends_at: string;
  reason: string;
  created_at: string;
};

/** One row of `GET /v1/admin/entitlements/grants` and the body of revoke / update (`GrantView`). */
export type AdminGrant = {
  id: string;
  user_id: string;
  kind: GrantKind;
  plan: 'pro' | null;
  limits: Partial<Record<LimitKey, number>> | null;
  starts_at: string;
  ends_at: string;
  reason: string;
  granted_by: string;
  granted_by_role: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
  paid_renewal_action: string | null;
  created_at: string;
  user: UserRef;
  granted_by_user: UserRef;
  revoked_by_user: UserRef | null;
  status: GrantStatus;
  last_change: GrantChange | null;
};

/** What the filters hold in the URL; `'all'` / `''` are the defaults. */
export type GrantFilters = { user_email: string; granted_by_email: string; active: string; expiring_within_days: string };

export const PAGE_SIZE = 20;
export const MAX_EMAIL = 320;
export const MAX_REASON = 300;
export const MAX_EXPIRING_DAYS = 365;

/** The sentence keys `errors.grant-not-allowed` is refined by (`GrantRefusalReason`, `grant-rules.ts`). */
export const REFUSAL_REASONS = ['self-grant', 'target-is-admin', 'target-is-staff', 'ai-limits-admin-only', 'target-has-paid-subscription'] as const;
export type RefusalReason = (typeof REFUSAL_REASONS)[number];
export const isRefusalReason = (reason: string | undefined): reason is RefusalReason =>
  reason !== undefined && (REFUSAL_REASONS as readonly string[]).includes(reason);

export function grantsQuery(filters: GrantFilters, pageToken?: string): string {
  const query = new URLSearchParams();
  if (filters.user_email !== '') query.set('user_email', filters.user_email);
  if (filters.granted_by_email !== '') query.set('granted_by_email', filters.granted_by_email);
  if (filters.active !== 'all') query.set('active', filters.active);
  if (filters.expiring_within_days !== '') query.set('expiring_within_days', filters.expiring_within_days);
  query.set('page_size', String(PAGE_SIZE));
  if (pageToken) query.set('page_token', pageToken);
  return query.toString();
}

export function listGrants(api: ApiClient, filters: GrantFilters, pageToken?: string) {
  return api.get<{ items: AdminGrant[]; next_page_token: string | null }>(`/v1/admin/entitlements/grants?${grantsQuery(filters, pageToken)}`);
}

/** No `Idempotency-Key`: revoking a revoked grant answers 200 and changes nothing (D38). */
export function revokeGrant(api: ApiClient, id: string, reason: string): Promise<AdminGrant> {
  return api.post(`/v1/admin/entitlements/grants/${id}/revoke`, { reason });
}

/** `GET /v1/admin/entitlements/lookup`: the learner behind an address, and whether this staff account may grant to them. */
export type LearnerLookup = { user: { id: string; email: string }; grantable: boolean; reason: RefusalReason | null };

/** 404 `not-found` when no account has this email; 429 on the `entitlements.lookup` rule (60 an hour). */
export function lookupLearner(api: ApiClient, email: string): Promise<LearnerLookup> {
  return api.get(`/v1/admin/entitlements/lookup?email=${encodeURIComponent(email)}`);
}

export type CreateGrantBody = {
  user_id: string;
  kind: GrantKind;
  plan?: 'pro';
  limits?: Partial<Record<LimitKey, number>>;
  starts_at?: string;
  ends_at: string;
  reason: string;
  confirm_turn_off_paid_renewal?: true;
};

/** Needs an `Idempotency-Key`; the retry after the A/79b confirmation is a different body, so it gets a new key. */
export function createGrant(api: ApiClient, body: CreateGrantBody, idempotencyKey: string): Promise<AdminGrant> {
  return api.post('/v1/admin/entitlements/grants', body, { idempotencyKey });
}

export type GrantDatesBody = { starts_at?: string; ends_at?: string; reason: string };

/** No `Idempotency-Key`: the same dates again change nothing. */
export function updateGrantDates(api: ApiClient, id: string, body: GrantDatesBody): Promise<AdminGrant> {
  return api.patch(`/v1/admin/entitlements/grants/${id}`, body);
}

// Dates are Vietnam days (`+07:00`, no daylight saving), as the Giao dịch screen. A grant's "Tới ngày" is its last day, so the
// grant ends at the midnight after it; the last day of an instant is therefore the day of one millisecond before it.

const dayFormat = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: ADMIN_ZONE });

/** `YYYY-MM-DD` of an instant in Vietnam. */
export const vnDay = (at: string | Date): string => dayFormat.format(new Date(at));

/** The last day a grant (or one end of a change) covers: `YYYY-MM-DD`. */
export const lastDay = (endsAt: string): string => vnDay(new Date(new Date(endsAt).getTime() - 1));

/** The start instant of a Vietnam day. */
export const startOfDay = (day: string): string => `${day}T00:00:00+07:00`;

/** The instant a grant whose last day is `day` ends: midnight after it. */
export function endAfterDay(day: string): string {
  const at = new Date(`${day}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + 1);
  return startOfDay(at.toISOString().slice(0, 10));
}
