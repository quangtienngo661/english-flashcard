import type { ApiClient } from '../../api/client';
import type { UserRef } from '../../api/user-ref';

export type UserStatus = 'active' | 'locked';
export type UserStaffRole = 'admin' | 'editor';

/** One row of `GET /v1/admin/users` (`AdminUserRow` in `apps/api/src/identity/staff/staff.service.ts`). */
export type AdminUser = {
  id: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  email_verified: boolean;
  /** `null` is a learner. */
  staff_role: UserStaffRole | null;
  status: UserStatus;
  created_at: string;
  last_seen_at: string | null;
};

/** `GET /v1/admin/users/:id` and the body of lock / unlock (`AdminUserDetail`). */
export type AdminUserDetail = AdminUser & {
  /** `YYYY-MM-DD`. */
  birth_date: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  locked_at: string | null;
  locked_by: UserRef | null;
  lock_reason: string | null;
};

export type UserFilters = { q: string; status: string };

export const PAGE_SIZE = 20;
/** The API refuses `q` shorter than 2 code points (400); the screen does not ask. */
export const MIN_SEARCH = 2;
export const MAX_SEARCH = 100;
export const UUID = /^[0-9a-f]{8}[-][0-9a-f]{4}[-][0-9a-f]{4}[-][0-9a-f]{4}[-][0-9a-f]{12}$/i;

export const codePoints = (text: string) => [...text].length;
export const normalizeSearch = (text: string) => text.normalize('NFC').trim();

export function usersQuery(filters: UserFilters, pageToken?: string): string {
  const query = new URLSearchParams();
  if (filters.q !== '') query.set('q', normalizeSearch(filters.q));
  if (filters.status !== 'all') query.set('status', filters.status);
  query.set('page_size', String(PAGE_SIZE));
  if (pageToken) query.set('page_token', pageToken);
  return query.toString();
}

export function listUsers(api: ApiClient, filters: UserFilters, pageToken?: string) {
  return api.get<{ items: AdminUser[]; next_page_token: string | null }>(`/v1/admin/users?${usersQuery(filters, pageToken)}`);
}

export function getUser(api: ApiClient, id: string): Promise<AdminUserDetail> {
  return api.get(`/v1/admin/users/${id}`);
}

/** No `Idempotency-Key`: locking a locked account answers 200 and changes nothing. */
export function lockUser(api: ApiClient, id: string, reason: string): Promise<AdminUserDetail> {
  return api.post(`/v1/admin/users/${id}/lock`, { reason });
}

export function unlockUser(api: ApiClient, id: string): Promise<AdminUserDetail> {
  return api.post(`/v1/admin/users/${id}/unlock`);
}

export const STATUS_TONE: Record<UserStatus, 'success' | 'danger'> = { active: 'success', locked: 'danger' };

/** "Nguyễn Lan": the family name first, as the API searches it. */
export const fullName = (u: { given_name: string | null; family_name: string | null }) =>
  [u.family_name, u.given_name].filter(Boolean).join(' ');
