import { describe, expect, it } from 'vitest';
import { canAccess, firstVisiblePath, NAV, visibleNav } from './nav';
import type { Permission } from '../auth/session-store';

const EDITOR: Permission[] = ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage'];
const ADMIN: Permission[] = [...EDITOR, 'roles.manage'];

describe('nav', () => {
  it('B25#1 (nav): editor permissions hide /staff; admin sees all five', () => {
    expect(visibleNav(EDITOR).map((n) => n.path)).toEqual(['/uploads', '/publish-jobs', '/export', '/sources']);
    expect(visibleNav(ADMIN).map((n) => n.path)).toEqual(['/uploads', '/publish-jobs', '/export', '/sources', '/staff']);
    expect(NAV).toHaveLength(5);
  });

  it('an entry needs every permission it lists', () => {
    expect(visibleNav(['content.import']).map((n) => n.path)).toEqual(['/uploads', '/sources']);
    expect(visibleNav([])).toEqual([]);
  });

  it('firstVisiblePath: the first entry the user may open, or null', () => {
    expect(firstVisiblePath(ADMIN)).toBe('/uploads');
    expect(firstVisiblePath(['roles.manage'])).toBe('/staff');
    expect(firstVisiblePath([])).toBeNull();
  });

  it('canAccess: a path and its children follow the entry permission; unknown paths are allowed', () => {
    expect(canAccess('/staff', EDITOR)).toBe(false);
    expect(canAccess('/staff', ADMIN)).toBe(true);
    expect(canAccess('/uploads/abc', EDITOR)).toBe(true);
    expect(canAccess('/uploads/abc', ['roles.manage'])).toBe(false);
    expect(canAccess('/publish-jobs/1', EDITOR)).toBe(true);
    expect(canAccess('/nope', [])).toBe(true);
  });
});
