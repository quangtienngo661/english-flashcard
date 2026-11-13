// The Nhóm carousel remembers its centre group for the tab (owner 13/11/2026): back from Một nhóm, or from a session, it opens on
// the group the learner was on, not on the first one. Storage can be missing or blocked; then the carousel starts on the first group.
const KEY = 'wm-groups-centre';

export function rememberCentre(id: string) {
  try {
    sessionStorage.setItem(KEY, id);
  } catch {
    // Private mode or blocked storage: nothing to remember.
  }
}

export function readCentre(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
