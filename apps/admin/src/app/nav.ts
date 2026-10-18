import type { Permission } from '../auth/session-store';

export type NavGroup = 'overview' | 'content' | 'practice' | 'learners' | 'ai' | 'system';

export type NavEntry = {
  group: NavGroup;
  path: string;
  labelKey: string;
  needs: Permission[];
  /** `false`: the route renders `ComingSoonPage` (spec D23). */
  available: boolean;
  /** Step the feature is planned for (language-neutral, e.g. `'4/7'`); absent when not scheduled. */
  plannedStep?: string;
  /** Extra wording for the "Dự kiến" line: the API already exists, or the step is not confirmed. */
  etaNote?: 'apiReady' | 'unconfirmed';
};

// Admin-only AI pages: the session has no AI permission yet, so `roles.manage` (admin) stands in.
const ADMIN: Permission[] = ['roles.manage'];

/** 16 items in 6 groups, in the order of the Figma `Sidebar`. */
export const NAV: NavEntry[] = [
  { group: 'overview', path: '/dashboard', labelKey: 'nav.dashboard', needs: [], available: false },
  { group: 'content', path: '/uploads', labelKey: 'nav.uploads', needs: ['content.import'], available: true },
  { group: 'content', path: '/publish-jobs', labelKey: 'nav.publishJobs', needs: ['content.publish'], available: true },
  { group: 'content', path: '/export', labelKey: 'nav.export', needs: ['content.edit'], available: true },
  { group: 'content', path: '/sources', labelKey: 'nav.sources', needs: ['content.import'], available: true },
  { group: 'content', path: '/words', labelKey: 'nav.words', needs: [], available: false, etaNote: 'apiReady' },
  { group: 'content', path: '/senses', labelKey: 'nav.senses', needs: [], available: false, etaNote: 'apiReady' },
  { group: 'content', path: '/topics', labelKey: 'nav.topics', needs: ['taxonomy.manage'], available: false, etaNote: 'apiReady' },
  { group: 'practice', path: '/reported', labelKey: 'nav.reported', needs: [], available: false, plannedStep: '4/7' },
  { group: 'practice', path: '/irregular-forms', labelKey: 'nav.irregular', needs: [], available: false, plannedStep: '4/7' },
  { group: 'learners', path: '/users', labelKey: 'nav.users', needs: [], available: false, plannedStep: '5–8', etaNote: 'unconfirmed' },
  { group: 'learners', path: '/entitlements', labelKey: 'nav.entitlements', needs: [], available: false, plannedStep: '5' },
  { group: 'ai', path: '/ai/settings', labelKey: 'nav.aiSettings', needs: ADMIN, available: false, plannedStep: '5–6' },
  { group: 'ai', path: '/ai/costs', labelKey: 'nav.aiCosts', needs: ADMIN, available: false, plannedStep: '6' },
  { group: 'ai', path: '/ai/eval-sets', labelKey: 'nav.evalSets', needs: ADMIN, available: false, plannedStep: '6' },
  { group: 'system', path: '/staff', labelKey: 'nav.staff', needs: ['roles.manage'], available: true },
];

export function visibleNav(permissions: Permission[]): NavEntry[] {
  return NAV.filter((entry) => entry.needs.every((p) => permissions.includes(p)));
}

export function firstVisiblePath(permissions: Permission[]): string | null {
  return visibleNav(permissions)[0]?.path ?? null;
}

/** Where `/`, a successful login and a forbidden path lead: Lô nhập, else the first page the user may open. */
export function homePath(permissions: Permission[]): string {
  return canAccess('/uploads', permissions) ? '/uploads' : (firstVisiblePath(permissions) ?? '/uploads');
}

const entryFor = (pathname: string): NavEntry | undefined =>
  NAV.find((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`));

/** The entry a path belongs to decides: a user without its permissions may not open it or its children. */
export function canAccess(pathname: string, permissions: Permission[]): boolean {
  const entry = entryFor(pathname);
  return entry === undefined || entry.needs.every((p) => permissions.includes(p));
}

/** The page title is the menu label of the entry a path belongs to; forms open as dialogs with their own title (UB9). */
export function navLabelKey(pathname: string): string | undefined {
  return entryFor(pathname)?.labelKey;
}
