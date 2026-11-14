/** E21, D4: the groups the learner saved to last, kept in this browser only; empty when storage is blocked. */
export const LAST_GROUP_KEY = 'wordmet-web.last-group';

/** An array of ids (QP1). Older versions stored one bare id; that reads as `[id]`. */
export function readLastGroups(): string[] {
  try {
    const raw = window.localStorage.getItem(LAST_GROUP_KEY);
    if (!raw) return [];
    if (!raw.startsWith('[')) return [raw];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function writeLastGroups(ids: string[]): void {
  try {
    window.localStorage.setItem(LAST_GROUP_KEY, JSON.stringify(ids));
  } catch {
    // Private window or blocked storage: the sheet just starts with no deck chosen next time.
  }
}

/** One group, as the bulk add and the stack targets save it. */
export function writeLastGroup(id: string): void {
  writeLastGroups([id]);
}
