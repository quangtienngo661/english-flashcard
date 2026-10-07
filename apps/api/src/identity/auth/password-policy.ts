export type PasswordViolation = 'min_length' | 'max_length' | 'uppercase' | 'lowercase' | 'digit' | 'special';

export function normalizePassword(pw: string): string {
  return pw.normalize('NFC');
}

export function checkPasswordPolicy(pw: string): PasswordViolation[] {
  const normalized = normalizePassword(pw);
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
