import { Navigate, Route, Routes } from 'react-router';
import { useSession } from '../auth/session-context';
import { ChangePasswordPage } from '../features/account/ChangePasswordPage';
import { ForgotPasswordPage } from '../features/account/ForgotPasswordPage';
import { LoginPage } from '../features/account/LoginPage';
import { BatchPage } from '../features/uploads/BatchPage';
import { UploadForm } from '../features/uploads/UploadForm';
import { UploadsPage } from '../features/uploads/UploadsPage';
import { ComingSoonPage } from '../features/coming-soon/ComingSoonPage';
import { ExportPage } from '../features/export/ExportPage';
import { PublishJobForm } from '../features/publish-jobs/PublishJobForm';
import { PublishJobPage } from '../features/publish-jobs/PublishJobPage';
import { PublishJobsPage } from '../features/publish-jobs/PublishJobsPage';
import { SourceForm, SourcesPage } from '../features/sources/SourcesPage';
import { StaffPage } from '../features/staff/StaffPage';
import { homePath, NAV } from './nav';
import { RequireSession } from './RequireSession';
import { Shell } from './Shell';

/** `/` → Lô nhập; a user who may not open it goes to the first page they may. */
function Home() {
  const { state } = useSession();
  if (state.status !== 'signed-in') return null;
  return <Navigate to={homePath(state.me.permissions)} replace />;
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
          <Route path="uploads" element={<UploadsPage />} />
          <Route path="uploads/new" element={<UploadForm />} />
          <Route path="uploads/:id" element={<BatchPage />} />
          <Route path="publish-jobs" element={<PublishJobsPage />} />
          <Route path="publish-jobs/new" element={<PublishJobForm />} />
          <Route path="publish-jobs/:id" element={<PublishJobPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="sources/new" element={<SourceForm />} />
          <Route path="staff" element={<StaffPage />} />
          {NAV.filter((entry) => !entry.available).map((entry) => (
            <Route key={entry.path} path={entry.path.slice(1)} element={<ComingSoonPage item={entry} />} />
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
