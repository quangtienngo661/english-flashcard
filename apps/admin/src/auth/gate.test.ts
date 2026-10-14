import { describe, expect, it } from 'vitest';
import { gate } from './gate';
import type { Me } from './session-store';

const me = (over: Partial<Me>): Me => ({
  id: 'u1',
  email: 'a@b.co',
  email_verified: true,
  must_change_password: false,
  native_language: null,
  timezone: 'Asia/Ho_Chi_Minh',
  staff_role: null,
  permissions: [],
  ...over,
});

describe('gate', () => {
  it('role+flag → change-password; role → app; null (verified or not) → no-access', () => {
    expect(gate(me({ staff_role: 'editor', must_change_password: true }))).toBe('change-password');
    expect(gate(me({ staff_role: 'admin', must_change_password: true }))).toBe('change-password');
    expect(gate(me({ staff_role: 'editor' }))).toBe('app');
    expect(gate(me({ staff_role: 'admin', email_verified: false }))).toBe('app');
    expect(gate(me({ staff_role: null, email_verified: false }))).toBe('no-access');
    expect(gate(me({ staff_role: null, email_verified: true }))).toBe('no-access');
  });
});
