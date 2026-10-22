import { Folder, House, NotebookText, Search, type LucideIcon } from 'lucide-react';

export type TabId = 'today' | 'groups' | 'practice' | 'lookup';

/** The four main tabs (K/10 top bar, tab bar `284:156`) and the app paths each one owns. */
export const TABS: Array<{ id: TabId; path: string; icon: LucideIcon; owns: RegExp }> = [
  { id: 'today', path: '/app', icon: NotebookText, owns: /^\/app$/ },
  { id: 'groups', path: '/app/groups', icon: Folder, owns: /^\/app\/(groups|group|topic|review)(\/|$)/ },
  { id: 'practice', path: '/app/practice', icon: House, owns: /^\/app\/practice(\/|$)/ },
  { id: 'lookup', path: '/app/lookup', icon: Search, owns: /^\/app\/(lookup|word)(\/|$)/ },
];

/** The tab a path belongs to (`/vi/app/group?id=…` → groups), or null for pages outside the tabs (Settings, Plans). */
export function currentTab(pathname: string): TabId | null {
  const appPath = pathname.replace(/^\/(vi|en)/, '');
  return TABS.find((tab) => tab.owns.test(appPath))?.id ?? null;
}
