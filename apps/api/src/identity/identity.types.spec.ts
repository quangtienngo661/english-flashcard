import { describe, expect, it } from 'vitest';
import { permissionsFor, ROLE_PERMISSIONS } from './identity.types.js';

describe('Identity permissions', () => {
  const contentPermissions = ['content.edit', 'content.publish', 'content.import', 'taxonomy.manage'];
  it('B2#67: admin and editor have all four content permissions; only admin has roles.manage and learners have none', () => {
    expect(ROLE_PERMISSIONS).toEqual({ admin: ['roles.manage', ...contentPermissions], editor: contentPermissions });
    expect(permissionsFor('admin')).toEqual(['roles.manage', ...contentPermissions]);
    expect(permissionsFor('editor')).toEqual(contentPermissions);
    expect(permissionsFor(null)).toEqual([]);
  });

  it('B2#67: modifying a returned list leaves all four content permissions intact for admin and editor', () => {
    permissionsFor('admin').pop();
    permissionsFor('editor').push('roles.manage');
    expect(permissionsFor('admin')).toEqual(['roles.manage', ...contentPermissions]);
    expect(permissionsFor('editor')).toEqual(contentPermissions);
  });
});
