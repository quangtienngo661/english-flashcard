import { describe, expect, it } from 'vitest';
import { userLabel } from './user-ref';

const t = (key: string) => `[${key}]`;

describe('userLabel', () => {
  it('shows the email', () => expect(userLabel({ id: '1', email: 'a@b.c', system: false }, t)).toBe('a@b.c'));
  it('shows "system" for the system actor', () => expect(userLabel({ id: '1', email: null, system: true }, t)).toBe('[common.system]'));
  it('shows "unknown user" when the email is gone', () => expect(userLabel({ id: '1', email: null, system: false }, t)).toBe('[common.unknownUser]'));
  it('treats a ref without `system` as not system', () => {
    expect(userLabel({ id: '1', email: null }, t)).toBe('[common.unknownUser]');
    expect(userLabel({ id: '1', email: 'a@b.c' }, t)).toBe('a@b.c');
  });
});
