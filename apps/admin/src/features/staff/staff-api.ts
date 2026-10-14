import type { ApiClient } from '../../api/client';
import { ApiError } from '../../api/problem';

export type StaffRole = 'admin' | 'editor';
export type StaffUser = { id: string; email: string; email_verified: boolean; staff_role: StaffRole | null };

const PAGE_SIZE = 20;

export function listStaff(api: ApiClient, pageToken?: string): Promise<{ items: StaffUser[]; next_page_token: string | null }> {
  const query = new URLSearchParams({ page_size: String(PAGE_SIZE) });
  if (pageToken) query.set('page_token', pageToken);
  return api.get(`/v1/admin/staff?${query}`);
}

/** `null` when no user has that email (404 `not-found`). */
export async function findUser(api: ApiClient, email: string): Promise<StaffUser | null> {
  try {
    return await api.get<StaffUser>(`/v1/admin/users?${new URLSearchParams({ email })}`);
  } catch (error) {
    if (error instanceof ApiError && error.problem.slug === 'not-found') return null;
    throw error;
  }
}

export function setStaffRole(api: ApiClient, id: string, role: StaffRole | null): Promise<StaffUser> {
  return api.put(`/v1/admin/users/${id}/staff-role`, { staff_role: role });
}

/** Spec §7.4. No `password` key means the API generates one and mails it; the response never carries a password. */
export function createStaffAccount(
  api: ApiClient,
  body: { email: string; staff_role: StaffRole; password?: string; must_change_password: boolean; timezone: string },
): Promise<StaffUser> {
  return api.post('/v1/admin/users', body);
}
