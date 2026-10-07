import { describe, expect, it } from 'vitest';
import { permissionsFor, ROLE_PERMISSIONS } from './identity.types.js';

describe('Identity permissions', () => {
  it('B1#26: admin has roles.manage; editor and null have none', () => {
    expect(ROLE_PERMISSIONS).toEqual({ admin: ['roles.manage'], editor: [] });
    expect(permissionsFor('admin')).toEqual(['roles.manage']);
    expect(permissionsFor('editor')).toEqual([]);
    expect(permissionsFor(null)).toEqual([]);
  });

  it('B1#26: modifying a returned list does not grant or remove role permissions', () => {
    permissionsFor('admin').pop();
    permissionsFor('editor').push('roles.manage');
    expect(permissionsFor('admin')).toEqual(['roles.manage']);
    expect(permissionsFor('editor')).toEqual([]);
  });
});
