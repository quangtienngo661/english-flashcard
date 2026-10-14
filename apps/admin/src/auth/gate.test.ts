import { describe, expect, it } from 'vitest';
import { gate } from './gate';
import type { Me } from './session-store';

const me = (over: Partial<Me>): Me => ({
  id: 'u1',
  email: 'a@b.co',
  email_verified: true,
  native_language: null,
  timezone: 'Asia/Ho_Chi_Minh',
  staff_role: null,
  permissions: [],
  ...over,
});

describe('gate', () => {
  it('role → app; null+unverified → verify-email; null+verified → no-access', () => {
    expect(gate(me({ staff_role: 'editor', email_verified: false }))).toBe('app');
    expect(gate(me({ staff_role: 'admin' }))).toBe('app');
    expect(gate(me({ staff_role: null, email_verified: false }))).toBe('verify-email');
    expect(gate(me({ staff_role: null, email_verified: true }))).toBe('no-access');
  });
});
