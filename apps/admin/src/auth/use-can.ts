import { useSession } from './session-context';
import type { Permission } from './session-store';

/** Whether the signed-in staff member holds `permission` (false while no one is signed in). */
export function useCan(permission: Permission): boolean {
  const { state } = useSession();
  return state.status === 'signed-in' && state.me.permissions.includes(permission);
}
