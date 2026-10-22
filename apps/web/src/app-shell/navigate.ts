/**
 * A full page load to `path`. The session gate (RequireSession) and the 403 profile-incomplete handler send the learner
 * elsewhere right after the page loads; on the Worker build `router.replace` called that early was sometimes dropped
 * (M1 e2e, 23/10/2026), and a full load re-reads the session anyway.
 */
export function hardReplace(path: string): void {
  window.location.replace(path);
}
