// Copy of `checkPasswordPolicy` in apps/api/src/identity/auth/password-policy.ts (checked 14/10/2026).
// The server stays the authority; this only lets a form refuse an obviously weak password before a request.
// If the API's rules change, change this file with them.
export type PasswordViolation = 'min_length' | 'max_length' | 'uppercase' | 'lowercase' | 'digit' | 'special';

export function checkPasswordPolicy(password: string): PasswordViolation[] {
  const normalized = password.normalize('NFC');
  const length = [...normalized].length;
  const violations: PasswordViolation[] = [];
  if (length < 8) violations.push('min_length');
  if (length > 128) violations.push('max_length');
  if (!/\p{Lu}/u.test(normalized)) violations.push('uppercase');
  if (!/\p{Ll}/u.test(normalized)) violations.push('lowercase');
  if (!/\p{Nd}/u.test(normalized)) violations.push('digit');
  if (!/[^\p{L}\p{N}]/u.test(normalized)) violations.push('special');
  return violations;
}
