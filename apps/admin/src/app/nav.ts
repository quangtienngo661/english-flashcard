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

/** 25 items in 6 groups: the admin sidebar of the copy doc §8.0 plus Giao dịch (design §4.4); "Cấu hình" replaced Thao tác and Prompt (nhóm B M2); "Judge" is nhóm B M3; "Câu AI thật" is nhóm B M4. */
export const NAV: NavEntry[] = [
  { group: 'overview', path: '/dashboard', labelKey: 'nav.dashboard', needs: ['ai.view'], available: true },
  { group: 'content', path: '/words', labelKey: 'nav.words', needs: ['content.edit'], available: true },
  { group: 'content', path: '/senses', labelKey: 'nav.senses', needs: ['content.edit'], available: true },
  { group: 'content', path: '/topics', labelKey: 'nav.topics', needs: ['taxonomy.manage'], available: true },
  { group: 'content', path: '/uploads', labelKey: 'nav.uploads', needs: ['content.import'], available: true },
  { group: 'content', path: '/publish-jobs', labelKey: 'nav.publishJobs', needs: ['content.publish'], available: true },
  { group: 'content', path: '/export', labelKey: 'nav.export', needs: ['content.edit'], available: true },
  { group: 'content', path: '/sources', labelKey: 'nav.sources', needs: ['content.import'], available: true },
  { group: 'content', path: '/unknown-forms', labelKey: 'nav.unknownForms', needs: ['content.edit'], available: true },
  { group: 'practice', path: '/reports', labelKey: 'nav.reports', needs: ['content.edit'], available: true },
  { group: 'practice', path: '/report-reasons', labelKey: 'nav.reportReasons', needs: ['settings.manage'], available: true },
  { group: 'practice', path: '/refunds', labelKey: 'nav.refunds', needs: ['settings.manage'], available: true },
  { group: 'learners', path: '/users', labelKey: 'nav.users', needs: ['users.read'], available: true },
  { group: 'learners', path: '/entitlements', labelKey: 'nav.entitlements', needs: ['entitlements.grant'], available: true },
  { group: 'learners', path: '/transactions', labelKey: 'nav.transactions', needs: ['settings.manage'], available: true },
  { group: 'ai', path: '/ai/status', labelKey: 'nav.aiStatus', needs: ['settings.manage'], available: true },
  { group: 'ai', path: '/ai/models', labelKey: 'nav.aiModels', needs: ['settings.manage'], available: true },
  { group: 'ai', path: '/ai/configs', labelKey: 'nav.aiConfigs', needs: ['settings.manage'], available: true },
  { group: 'ai', path: '/ai/eval', labelKey: 'nav.aiEval', needs: ['settings.manage'], available: true },
  { group: 'ai', path: '/ai/real-questions', labelKey: 'nav.aiRealQuestions', needs: ['settings.manage'], available: true },
  { group: 'ai', path: '/ai/judges', labelKey: 'nav.aiJudges', needs: ['settings.manage'], available: true },
  { group: 'ai', path: '/ai/costs', labelKey: 'nav.aiCosts', needs: ['settings.manage'], available: true },
  { group: 'ai', path: '/ai/calls', labelKey: 'nav.aiCalls', needs: ['settings.manage'], available: true },
  { group: 'system', path: '/settings', labelKey: 'nav.settings', needs: ['settings.manage'], available: true },
  { group: 'system', path: '/staff', labelKey: 'nav.staff', needs: ['roles.manage'], available: true },
];

export function visibleNav(permissions: Permission[]): NavEntry[] {
  return NAV.filter((entry) => entry.needs.every((p) => permissions.includes(p)));
}

export function firstVisiblePath(permissions: Permission[]): string | null {
  return visibleNav(permissions)[0]?.path ?? null;
}

/** Where `/`, a successful login and the no-access page's button lead: Lô nhập, else the first page the user may open. */
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
