import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { openJson, sealJson } from './sealed-cookie.js';

const key = randomBytes(32);
const NOW = new Date('2026-10-29T12:00:00Z');

describe('sealed cookies', () => {
  it('opens what it sealed until the expiry and not a millisecond after', () => {
    const sealed = sealJson({ a: 1, b: 'x' }, 600, key, NOW);
    expect(openJson(sealed, key, new Date(NOW.getTime() + 599_999))).toEqual({ a: 1, b: 'x' });
    expect(openJson(sealed, key, new Date(NOW.getTime() + 600_000))).toBeNull();
  });

  it('the state is not readable in the cookie', () => {
    expect(sealJson({ codeVerifier: 'verifier-secret' }, 600, key, NOW)).not.toContain('verifier-secret');
  });

  it('a flipped byte, another key, garbage, empty and undefined all open to null', () => {
    const sealed = sealJson({ a: 1 }, 600, key, NOW);
    const [iv, tag, text] = sealed.split('.');
    const flipped = [iv, tag, Buffer.from(Buffer.from(text, 'base64url').map((b, i) => (i === 0 ? b ^ 1 : b))).toString('base64url')].join('.');
    expect(openJson(flipped, key, NOW)).toBeNull();
    expect(openJson(sealed, randomBytes(32), NOW)).toBeNull();
    for (const bad of ['garbage', 'a.b.c', '', undefined]) expect(openJson(bad, key, NOW)).toBeNull();
  });
});
