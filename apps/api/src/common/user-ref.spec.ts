import { describe, expect, it } from 'vitest';
import { userRef } from './user-ref.js';

const SYSTEM = '00000000-0000-4000-8000-000000000060';

describe('userRef', () => {
  it('known id → its email, not system', () => {
    expect(userRef('u1', new Map([['u1', 'minh@x']]))).toEqual({ id: 'u1', email: 'minh@x', system: false });
  });

  it('unknown id → email null, not system', () => {
    expect(userRef('u2', new Map([['u1', 'minh@x']]))).toEqual({ id: 'u2', email: null, system: false });
  });

  it('an id in systemIds → system true, email null', () => {
    expect(userRef(SYSTEM, new Map(), new Set([SYSTEM]))).toEqual({ id: SYSTEM, email: null, system: true });
  });
});
