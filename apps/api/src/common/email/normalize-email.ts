export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || /\s/.test(email)) return null;
  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return email;
}

/**
 * The check for an address that is about to be stored (register, staff create or change; design Bước 1 §5): a domain of
 * dotted, non-empty labels and no control character. `normalizeEmail` stays loose on purpose, so an account already stored
 * with a dotless domain can still sign in (B1-10).
 */
export function isValidEmailSyntax(email: string): boolean {
  if (/\p{Cc}/u.test(email)) return false;
  const domain = email.split('@')[1] ?? '';
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every((label) => label.length > 0);
}
