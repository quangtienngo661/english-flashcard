/** E21, D4: the deck the learner saved to last, kept in this browser only; empty when storage is blocked. */
export const LAST_GROUP_KEY = 'wordmet-web.last-group';

export function readLastGroup(): string | null {
  try {
    return window.localStorage.getItem(LAST_GROUP_KEY);
  } catch {
    return null;
  }
}

export function writeLastGroup(id: string): void {
  try {
    window.localStorage.setItem(LAST_GROUP_KEY, id);
  } catch {
    // Private window or blocked storage: the sheet just starts with no deck chosen next time.
  }
}
