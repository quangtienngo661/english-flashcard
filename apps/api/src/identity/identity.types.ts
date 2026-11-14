export type ClientType = 'web' | 'mobile';
export type OtpPurpose = 'verify_email' | 'reset_password';
export type StaffRole = 'admin' | 'editor';
export type Permission =
  | 'roles.manage' | 'content.edit' | 'content.publish' | 'content.import' | 'taxonomy.manage' | 'settings.manage'
  | 'entitlements.grant' | 'users.read' | 'ai.view';
export type SupportedLanguage = 'vi' | 'en';

export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  admin: [
    'roles.manage', 'content.edit', 'content.publish', 'content.import', 'taxonomy.manage', 'settings.manage', 'entitlements.grant',
    'users.read', 'ai.view',
  ],
  // Bước 5 D6: editors grant too; what they may grant is limited by the grant rules (design §10).
  // AD18: editors read the user list and detail; only admins change users.
  // ai.view (owner 28/10/2026): both roles read the AI dashboard, money included; every AI setting stays settings.manage.
  editor: ['content.edit', 'content.publish', 'content.import', 'taxonomy.manage', 'entitlements.grant', 'users.read', 'ai.view'],
};

export function permissionsFor(role: StaffRole | null): Permission[] {
  return role === null ? [] : [...ROLE_PERMISSIONS[role]];
}
