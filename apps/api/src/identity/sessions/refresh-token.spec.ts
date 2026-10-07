import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { newRefreshToken } from './refresh-token.js';

describe('Refresh tokens', () => {
  it('B1#15: generates distinct 32-byte base64url tokens and their SHA-256 hashes', () => {
    const first = newRefreshToken();
    const second = newRefreshToken();
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(first.token, 'base64url')).toHaveLength(32);
    expect(first.hash).toBe(createHash('sha256').update(first.token).digest('hex'));
    expect(second.token).not.toBe(first.token);
    expect(second.hash).not.toBe(first.hash);
  });
});
