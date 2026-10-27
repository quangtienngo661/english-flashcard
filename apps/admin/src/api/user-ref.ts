/** A user named in an API response: the id, the address when the id is a known account, and whether it is a system actor. */
export type UserRef = { id: string; email: string | null; system: boolean };

/** How a user reference reads on screen: the address, else `systemLabel` for a system actor, else a dash. */
export function userLabel(ref: UserRef | null | undefined, systemLabel: string): string {
  if (!ref) return '—';
  if (ref.email) return ref.email;
  return ref.system ? systemLabel : '—';
}
