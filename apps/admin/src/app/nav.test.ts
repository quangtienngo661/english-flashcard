import { describe, expect, it } from 'vitest';
import type { Permission } from '../auth/session-store';
import { canAccess, firstVisiblePath, homePath, NAV, visibleNav } from './nav';

const EDITOR: Permission[] = ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage'];
const ADMIN: Permission[] = [...EDITOR, 'roles.manage'];

const FIGMA_ORDER = [
  ['overview', '/dashboard'],
  ['content', '/uploads'],
  ['content', '/publish-jobs'],
  ['content', '/export'],
  ['content', '/sources'],
  ['content', '/words'],
  ['content', '/senses'],
  ['content', '/topics'],
  ['practice', '/reported'],
  ['practice', '/irregular-forms'],
  ['learners', '/users'],
  ['learners', '/entitlements'],
  ['ai', '/ai/settings'],
  ['ai', '/ai/costs'],
  ['ai', '/ai/eval-sets'],
  ['system', '/staff'],
];

describe('nav', () => {
  it('16 items in 6 groups in Figma order; available only for /uploads, /publish-jobs, /export, /sources, /staff', () => {
    expect(NAV.map((n) => [n.group, n.path])).toEqual(FIGMA_ORDER);
    expect(new Set(NAV.map((n) => n.group)).size).toBe(6);
    expect(NAV.filter((n) => n.available).map((n) => n.path)).toEqual(['/uploads', '/publish-jobs', '/export', '/sources', '/staff']);
    expect(NAV.find((n) => n.path === '/ai/costs')?.plannedStep).toBe('6');
  });

  it('editor sees no AI group and no /staff; admin sees all 16', () => {
    const editorPaths = visibleNav(EDITOR).map((n) => n.path);
    expect(editorPaths).toHaveLength(12);
    expect(editorPaths).not.toContain('/staff');
    expect(visibleNav(EDITOR).some((n) => n.group === 'ai')).toBe(false);
    expect(visibleNav(ADMIN)).toHaveLength(16);
  });

  it('an entry needs every permission it lists', () => {
    const paths = visibleNav(['content.import']).map((n) => n.path);
    expect(paths).toContain('/uploads');
    expect(paths).toContain('/sources');
    expect(paths).not.toContain('/publish-jobs');
    expect(paths).not.toContain('/topics');
  });

  it('firstVisiblePath: the first entry the user may open, or null', () => {
    expect(firstVisiblePath(ADMIN)).toBe('/dashboard');
    expect(firstVisiblePath(['roles.manage'])).toBe('/dashboard');
    expect(firstVisiblePath([])).toBe('/dashboard');
  });

  it('homePath: /uploads when the user may open it, else the first visible page', () => {
    expect(homePath(EDITOR)).toBe('/uploads');
    expect(homePath(ADMIN)).toBe('/uploads');
    expect(homePath(['roles.manage'])).toBe('/dashboard');
  });

  it('canAccess: a path and its children follow the entry permission; unknown paths are allowed', () => {
    expect(canAccess('/staff', EDITOR)).toBe(false);
    expect(canAccess('/staff', ADMIN)).toBe(true);
    expect(canAccess('/ai/costs', EDITOR)).toBe(false);
    expect(canAccess('/ai/costs', ADMIN)).toBe(true);
    expect(canAccess('/uploads/abc', EDITOR)).toBe(true);
    expect(canAccess('/uploads/abc', ['roles.manage'])).toBe(false);
    expect(canAccess('/publish-jobs/1', EDITOR)).toBe(true);
    expect(canAccess('/nope', [])).toBe(true);
  });
});
