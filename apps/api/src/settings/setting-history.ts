/** One row of `app_setting_changes` for a single key. */
export type SettingKeyChange = { oldValue: unknown; newValue: unknown; changedAt: Date };

/**
 * The value a setting had at `instant` (nhóm B design §8.1, B44). `changes` are oldest first. The value is the `newValue` of the last change
 * strictly before `instant` (a change at exactly `instant` has not happened yet). Before the first change it is that change's `oldValue`, the
 * value in force before any save; a setting that never changed has `current`.
 */
export function settingValueAt(changes: SettingKeyChange[], current: unknown, instant: Date): unknown {
  if (changes.length === 0) return current;
  const before = changes.filter((change) => change.changedAt.getTime() < instant.getTime());
  return before.length > 0 ? before[before.length - 1].newValue : changes[0].oldValue;
}
