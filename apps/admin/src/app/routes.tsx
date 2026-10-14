import { Navigate, Route, Routes } from 'react-router';
import { useSession } from '../auth/session-context';
import { ChangePasswordPage } from '../features/account/ChangePasswordPage';
import { ForgotPasswordPage } from '../features/account/ForgotPasswordPage';
import { LoginPage } from '../features/account/LoginPage';
import { firstVisiblePath } from './nav';
import { PlaceholderPage } from './PlaceholderPage';
import { RequireSession } from './RequireSession';
import { Shell } from './Shell';

/** `/` → the first page the signed-in user may open. */
function Home() {
  const { state } = useSession();
  if (state.status !== 'signed-in') return null;
  return <Navigate to={firstVisiblePath(state.me.permissions) ?? '/uploads'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="change-password" element={<ChangePasswordPage />} />
      <Route element={<RequireSession />}>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="uploads" element={<PlaceholderPage endpoint="/v1/admin/content/uploads?page_size=20" />} />
          <Route path="uploads/:id" element={<PlaceholderPage />} />
          <Route path="publish-jobs" element={<PlaceholderPage />} />
          <Route path="publish-jobs/:id" element={<PlaceholderPage />} />
          <Route path="export" element={<PlaceholderPage />} />
          <Route path="sources" element={<PlaceholderPage />} />
          <Route path="staff" element={<PlaceholderPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
