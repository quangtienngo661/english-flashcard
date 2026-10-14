import type { Permission } from '../auth/session-store';

export type NavEntry = { path: string; labelKey: string; needs: Permission[] };

export const NAV: NavEntry[] = [
  { path: '/uploads', labelKey: 'nav.uploads', needs: ['content.import'] },
  { path: '/publish-jobs', labelKey: 'nav.publishJobs', needs: ['content.publish'] },
  { path: '/export', labelKey: 'nav.export', needs: ['content.edit'] },
  { path: '/sources', labelKey: 'nav.sources', needs: ['content.import'] },
  { path: '/staff', labelKey: 'nav.staff', needs: ['roles.manage'] },
];

export function visibleNav(permissions: Permission[]): NavEntry[] {
  return NAV.filter((entry) => entry.needs.every((p) => permissions.includes(p)));
}

export function firstVisiblePath(permissions: Permission[]): string | null {
  return visibleNav(permissions)[0]?.path ?? null;
}

const entryFor = (pathname: string): NavEntry | undefined =>
  NAV.find((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`));

/** The entry a path belongs to decides: a user without its permissions may not open it or its children. */
export function canAccess(pathname: string, permissions: Permission[]): boolean {
  const entry = entryFor(pathname);
  return entry === undefined || entry.needs.every((p) => permissions.includes(p));
}

export function navLabelKey(pathname: string): string | undefined {
  return entryFor(pathname)?.labelKey;
}
