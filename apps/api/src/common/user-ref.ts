/** A user named in a response: the id, the address when the id is a known account, and whether it is a system actor. */
export type UserRef = { id: string; email: string | null; system: boolean };

/** Pure builder; `emails` comes from one `IdentityService.emailsOf` call per page (kept here so `common/` imports no module). */
export function userRef(id: string, emails: ReadonlyMap<string, string>, systemIds: ReadonlySet<string> = new Set()): UserRef {
  return { id, email: emails.get(id) ?? null, system: systemIds.has(id) };
}
