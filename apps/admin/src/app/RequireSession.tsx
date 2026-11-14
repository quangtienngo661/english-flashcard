import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '../auth/session-context';
import { SessionLoading } from './SessionLoading';

/** Gate for the protected routes (spec §5): the requested path travels in router state `from`. */
export function RequireSession() {
  const { state } = useSession();
  const location = useLocation();

  if (state.status === 'loading' || state.status === 'unavailable') return <SessionLoading />;
  if (state.status === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  if (state.status === 'change-password') return <Navigate to="/change-password" replace />;
  return <Outlet />;
}
