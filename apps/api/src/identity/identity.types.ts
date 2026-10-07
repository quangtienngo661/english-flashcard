export type ClientType = 'web' | 'mobile';
export type OtpPurpose = 'verify_email' | 'reset_password';
export type StaffRole = 'admin' | 'editor';
export type Permission = 'roles.manage';
export type SupportedLanguage = 'vi' | 'en';

export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  admin: ['roles.manage'],
  editor: [],
};

export function permissionsFor(role: StaffRole | null): Permission[] {
  return role === null ? [] : [...ROLE_PERMISSIONS[role]];
}
