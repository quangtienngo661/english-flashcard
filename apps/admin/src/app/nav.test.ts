import { describe, expect, it } from 'vitest';
import type { Permission } from '../auth/session-store';
import { NAV_ICONS } from './nav-icons';
import { canAccess, firstVisiblePath, homePath, NAV, visibleNav } from './nav';

const EDITOR: Permission[] = ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant'];
const ADMIN: Permission[] = [...EDITOR, 'roles.manage', 'settings.manage'];

// Design §4.4 / copy doc §8.0: the sidebar of the admin, group by group.
const MENU_ORDER = [
  ['overview', '/dashboard'],
  ['content', '/words'],
  ['content', '/senses'],
  ['content', '/topics'],
  ['content', '/uploads'],
  ['content', '/publish-jobs'],
  ['content', '/export'],
  ['content', '/sources'],
  ['content', '/unknown-forms'],
  ['practice', '/reports'],
  ['practice', '/report-reasons'],
  ['practice', '/refunds'],
  ['learners', '/users'],
  ['learners', '/entitlements'],
  ['learners', '/transactions'],
  ['ai', '/ai/status'],
  ['ai', '/ai/models'],
  ['ai', '/ai/operations'],
  ['ai', '/ai/prompts'],
  ['ai', '/ai/eval'],
  ['ai', '/ai/costs'],
  ['ai', '/ai/calls'],
  ['system', '/settings'],
  ['system', '/staff'],
];

describe('nav', () => {
  it('24 items in 6 groups in menu order; available only for the screens that exist', () => {
    expect(NAV.map((n) => [n.group, n.path])).toEqual(MENU_ORDER);
    expect(new Set(NAV.map((n) => n.group)).size).toBe(6);
    expect(NAV.filter((n) => n.available).map((n) => n.path)).toEqual(['/uploads', '/publish-jobs', '/export', '/sources', '/transactions', '/ai/status', '/ai/models', '/staff']);
    expect(NAV.find((n) => n.path === '/ai/costs')?.plannedStep).toBe('6');
  });

  it('every entry has an icon', () => {
    for (const n of NAV) expect(NAV_ICONS[n.path], n.path).toBeDefined();
  });

  it('editor sees the 11 entries of A/71e; admin sees all 24', () => {
    expect(visibleNav(EDITOR).map((n) => n.path)).toEqual([
      '/dashboard',
      '/words',
      '/senses',
      '/topics',
      '/uploads',
      '/publish-jobs',
      '/export',
      '/sources',
      '/unknown-forms',
      '/reports',
      '/entitlements',
    ]);
    expect(visibleNav(EDITOR).some((n) => n.group === 'ai')).toBe(false);
    expect(visibleNav(ADMIN)).toHaveLength(24);
  });

  it('the AI group needs settings.manage, not roles.manage', () => {
    for (const n of NAV.filter((x) => x.group === 'ai')) expect(n.needs, n.path).toEqual(['settings.manage']);
    expect(visibleNav([...EDITOR, 'roles.manage']).some((n) => n.group === 'ai')).toBe(false);
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
    expect(canAccess('/transactions', EDITOR)).toBe(false);
    expect(canAccess('/transactions', ADMIN)).toBe(true);
    expect(canAccess('/ai/costs', EDITOR)).toBe(false);
    expect(canAccess('/ai/costs', ADMIN)).toBe(true);
    expect(canAccess('/words', ['content.import'])).toBe(false);
    expect(canAccess('/words', EDITOR)).toBe(true);
    expect(canAccess('/uploads/abc', EDITOR)).toBe(true);
    expect(canAccess('/uploads/abc', ['roles.manage'])).toBe(false);
    expect(canAccess('/publish-jobs/1', EDITOR)).toBe(true);
    expect(canAccess('/nope', [])).toBe(true);
  });
});
