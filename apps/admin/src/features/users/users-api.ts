import type { ApiClient } from '../../api/client';
import type { UserRef } from '../../api/user-ref';

export type UserStatus = 'active' | 'locked' | 'deleting';
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
  /** Bước 8: how the account can sign in. */
  sign_in_methods?: Array<'password' | 'google'>;
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
  /** AD18. */
  timezone: string;
  /** Bước 8: the learner has a plan that renews; deleting the account switches the renewal off first (D31). */
  auto_renewing?: boolean;
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

/** AD18: what the admin may change; every key optional, at least one sent. */
export type UserChanges = Partial<{ email: string; given_name: string; family_name: string | null; birth_date: string; timezone: string }>;

export function updateUser(api: ApiClient, id: string, changes: UserChanges): Promise<AdminUserDetail> {
  return api.patch(`/v1/admin/users/${id}`, changes);
}

/** AD18: no `password` key means the API generates one; it reaches the user only by mail. Every session is signed out. */
export function resetUserPassword(api: ApiClient, id: string, body: { password?: string; must_change_password: boolean }): Promise<AdminUserDetail> {
  return api.post(`/v1/admin/users/${id}/password`, body);
}

/**
 * Bước 8 (D17): the admin types the account's email again. 204 = gone; 202 `{ status: 'pending' }` = left `deleting`, a job finishes it.
 * No `Idempotency-Key`: deleting an account that is already deleting just runs the second step again (B8E43).
 */
export function deleteUser(api: ApiClient, id: string, confirmEmail: string): Promise<{ status: 'pending' } | undefined> {
  return api.post(`/v1/admin/users/${id}/delete`, { confirm_email: confirmEmail });
}

export const STATUS_TONE: Record<UserStatus, 'success' | 'danger' | 'warning'> = { active: 'success', locked: 'danger', deleting: 'warning' };

/** "Nguyễn Lan": the family name first, as the API searches it. */
export const fullName = (u: { given_name: string | null; family_name: string | null }) =>
  [u.family_name, u.given_name].filter(Boolean).join(' ');
