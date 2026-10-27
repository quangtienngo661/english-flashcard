/** A person shown in admin objects (API `userRef()`): `email` is null when the account is gone, `system` for the seeded actor. */
export type UserRef = { id: string; email: string | null; system?: boolean };

/** Plain label for a `UserRef`; a ref without `system` (older objects) counts as `system: false`. */
export function userLabel(ref: UserRef, t: (key: string) => string): string {
  if (ref.system === true) return t('common.system');
  return ref.email ?? t('common.unknownUser');
}
