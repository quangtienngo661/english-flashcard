import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './normalize-email.js';

describe('normalizeEmail', () => {
  it('IE8: "  Foo@Example.com " → "foo@example.com"', () => {
    expect(normalizeEmail('  Foo@Example.com ')).toBe('foo@example.com');
  });

  it.each([
    `${'a'.repeat(243)}@example.com`, 'example.com', 'a@b@example.com', 'foo bar@example.com',
    'foo@exam\tple.com', '@example.com', 'foo@', '', 42, null, undefined,
  ])('rejects 255 chars, no "@", two "@", inner whitespace or invalid values: %s', (raw) => {
    expect(normalizeEmail(raw)).toBeNull();
  });

  it('accepts the 254-character boundary', () => {
    const email = `${'a'.repeat(242)}@example.com`;
    expect(email.length).toBe(254);
    expect(normalizeEmail(email)).toBe(email);
  });
});
