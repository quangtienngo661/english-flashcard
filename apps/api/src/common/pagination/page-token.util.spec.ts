import { describe, expect, it } from 'vitest';
import { decodePageToken, encodePageToken } from './page-token.util.js';

describe('page token util', () => {
  it('round-trips a cursor through encode/decode', () => {
    expect(decodePageToken(encodePageToken({ id: 'abc' }))).toEqual({ id: 'abc' });
  });

  it('returns null for a malformed token instead of throwing', () => {
    expect(decodePageToken('not-a-real-token')).toBeNull();
  });
});
