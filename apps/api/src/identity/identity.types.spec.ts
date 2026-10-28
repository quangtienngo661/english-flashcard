import { describe, expect, it } from 'vitest';
import { permissionsFor, ROLE_PERMISSIONS } from './identity.types.js';

describe('Identity permissions', () => {
  const contentPermissions = ['content.edit', 'content.publish', 'content.import', 'taxonomy.manage'];
  const editorPermissions = [...contentPermissions, 'entitlements.grant', 'users.read'];
  const adminPermissions = ['roles.manage', ...contentPermissions, 'settings.manage', 'entitlements.grant', 'users.read'];
  it('B2#67: admin and editor have all four content permissions; only admin has roles.manage and settings.manage and learners have none', () => {
    expect(ROLE_PERMISSIONS).toEqual({ admin: adminPermissions, editor: editorPermissions });
    expect(permissionsFor('admin')).toEqual(adminPermissions);
    expect(permissionsFor('editor')).toEqual(editorPermissions);
    expect(permissionsFor(null)).toEqual([]);
  });

  it('D6: admin and editor both have entitlements.grant; learners have none', () => {
    expect(permissionsFor('admin')).toContain('entitlements.grant');
    expect(permissionsFor('editor')).toContain('entitlements.grant');
    expect(permissionsFor('admin').at(-2)).toBe('entitlements.grant');
    expect(permissionsFor(null)).not.toContain('entitlements.grant');
    // No ai.settings permission (⚠8): the AI numbers stay under settings.manage.
    expect(Object.values(ROLE_PERMISSIONS).flat()).not.toContain('ai.settings');
  });

  it('B2#67: modifying a returned list leaves all four content permissions intact for admin and editor', () => {
    permissionsFor('admin').pop();
    permissionsFor('editor').push('roles.manage');
    expect(permissionsFor('admin')).toEqual(adminPermissions);
    expect(permissionsFor('editor')).toEqual(editorPermissions);
  });
});
