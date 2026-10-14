import { Navigate, Outlet, useLocation } from 'react-router';
import { useTranslations } from 'use-intl';
import { useSession } from '../auth/session-context';

/** Gate for the protected routes (spec §5): the requested path travels in router state `from`. */
export function RequireSession() {
  const { state } = useSession();
  const location = useLocation();
  const t = useTranslations();

  if (state.status === 'loading') {
    return (
      <p role="status" className="p-8 text-ui text-muted">
        {t('shell.loadingSession')}
      </p>
    );
  }
  if (state.status === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  if (state.status === 'change-password') return <Navigate to="/change-password" replace />;
  return <Outlet />;
}
