import type { Me } from './session-store';

/** Spec §5 gate rule: a staff role enters the app; no role + unverified verifies the email; no role + verified is turned away. */
export function gate(me: Me): 'app' | 'verify-email' | 'no-access' {
  if (me.staff_role !== null) return 'app';
  return me.email_verified ? 'no-access' : 'verify-email';
}
