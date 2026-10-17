import { describe, expect, it } from 'vitest';
import { decodeBoundToken, decodePageToken, encodeBoundToken, encodePageToken } from './page-token.util.js';

describe('page token util', () => {
  it('round-trips a cursor through encode/decode', () => {
    expect(decodePageToken(encodePageToken({ id: 'abc' }))).toEqual({ id: 'abc' });
  });

  it('returns null for a malformed token instead of throwing', () => {
    expect(decodePageToken('not-a-real-token')).toBeNull();
  });

  it('B2#62: bound tokens round-trip, reject a different binding or malformed input, and plain tokens still work', () => {
    const payload = { id: 'abc', lemma: 'bank', rank: 2 };
    const token = encodeBoundToken(payload, 'normalized-query');
    expect(decodeBoundToken(token, 'normalized-query')).toEqual(payload);
    expect(decodeBoundToken(token, 'another-query')).toBeNull();
    for (const malformed of [
      '', 'not-a-real-token', `${token}!`, encodePageToken({ id: 'abc' }),
      Buffer.from(JSON.stringify({ binding: 'normalized-query', payload: null })).toString('base64url'),
      Buffer.from(JSON.stringify({ binding: 'normalized-query', payload: ['abc'] })).toString('base64url'),
      Buffer.from(JSON.stringify({ binding: 'normalized-query', payload: { nested: {} } })).toString('base64url'),
      Buffer.from(JSON.stringify({ binding: 'normalized-query', payload: { bool: true } })).toString('base64url'),
    ]) expect(decodeBoundToken(malformed, 'normalized-query')).toBeNull();
    expect(decodeBoundToken(encodeBoundToken({}, ''), '')).toEqual({});
    expect(decodePageToken(encodePageToken({ id: 'unchanged' }))).toEqual({ id: 'unchanged' });
  });
});
