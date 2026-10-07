import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { open, seal } from './grace-cipher.js';

describe('Refresh grace cipher', () => {
  it('B1#16: round-trips with a fresh 12-byte IV and 16-byte authentication tag', () => {
    const key = randomBytes(32);
    const plain = randomBytes(32).toString('base64url');
    const sealed = seal(plain, key);
    const [iv, tag, ciphertext] = sealed.split('.').map((part) => Buffer.from(part, 'base64url'));
    expect(iv).toHaveLength(12);
    expect(tag).toHaveLength(16);
    expect(ciphertext.toString()).not.toContain(plain);
    expect(open(sealed, key)).toBe(plain);
    expect(seal(plain, key)).not.toBe(sealed);
  });

  it.each([0, 1, 2])('B1#16: tampering with part %i fails authentication', (index) => {
    const key = randomBytes(32);
    const parts = seal('successor', key).split('.');
    const bytes = Buffer.from(parts[index], 'base64url');
    bytes[0] ^= 1;
    parts[index] = bytes.toString('base64url');
    expect(() => open(parts.join('.'), key)).toThrow();
  });

  it('B1#16: a different key cannot decrypt the successor', () => {
    expect(() => open(seal('successor', randomBytes(32)), randomBytes(32))).toThrow();
  });

  it.each(['', 'a.b', 'a.b.c.d', '!.!.!', '..'])('B1#16: malformed envelope %j is rejected', (value) => {
    expect(() => open(value, randomBytes(32))).toThrow();
  });
});
