import type { Me } from './session-store';

/** Spec §5 gate rule: a staff role enters the app (after a forced password change); no role is turned away. */
export function gate(me: Me): 'app' | 'change-password' | 'no-access' {
  if (me.staff_role === null) return 'no-access';
  return me.must_change_password ? 'change-password' : 'app';
}
