import { describe, expect, it } from 'vitest';
import { userLabel } from './user-ref';

describe('userLabel', () => {
  it('shows the email, else the system label for a system actor, else a dash', () => {
    expect(userLabel({ id: 'u1', email: 'a@x.co', system: false }, 'Hệ thống')).toBe('a@x.co');
    expect(userLabel({ id: 'u2', email: null, system: true }, 'Hệ thống')).toBe('Hệ thống');
    expect(userLabel({ id: 'u3', email: null, system: false }, 'Hệ thống')).toBe('—');
    expect(userLabel(null, 'Hệ thống')).toBe('—');
    expect(userLabel(undefined, 'Hệ thống')).toBe('—');
  });
});
