import { createRoutesFromElements, Navigate, Route, type RouteObject } from 'react-router';
import { useSession } from '../auth/session-context';
import { ChangePasswordPage } from '../features/account/ChangePasswordPage';
import { ForgotPasswordPage } from '../features/account/ForgotPasswordPage';
import { LoginPage } from '../features/account/LoginPage';
import { UploadsPage } from '../features/uploads/UploadsPage';
import { ComingSoonPage } from '../features/coming-soon/ComingSoonPage';
import { AiModelsPage } from '../features/ai/AiModelsPage';
import { AiOperationsPage } from '../features/ai/AiOperationsPage';
import { AiPromptsPage } from '../features/ai/AiPromptsPage';
import { AiStatusPage } from '../features/ai/AiStatusPage';
import { ExportPage } from '../features/export/ExportPage';
import { PublishJobsPage } from '../features/publish-jobs/PublishJobsPage';
import { SourcesPage } from '../features/sources/SourcesPage';
import { StaffPage } from '../features/staff/StaffPage';
import { TransactionsPage } from '../features/transactions/TransactionsPage';
import { homePath, NAV } from './nav';
import { RequireSession } from './RequireSession';
import { Shell } from './Shell';

/** `/` → Lô nhập; a user who may not open it goes to the first page they may. */
function Home() {
  const { state } = useSession();
  if (state.status !== 'signed-in') return null;
  return <Navigate to={homePath(state.me.permissions)} replace />;
}

/** Route objects, not `<Routes>`: a data router is what lets the shell block navigation (`useBlocker`). */
export const appRoutes: RouteObject[] = createRoutesFromElements(
  <>
    <Route path="login" element={<LoginPage />} />
    <Route path="forgot-password" element={<ForgotPasswordPage />} />
    <Route path="change-password" element={<ChangePasswordPage />} />
    <Route element={<RequireSession />}>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        {/* A list page owns its children (UB8, UB9): `new` opens the form dialog, `:id` the detail panel. */}
        <Route path="uploads" element={<UploadsPage />}>
          <Route path="new" element={null} />
          <Route path=":id" element={null} />
        </Route>
        <Route path="publish-jobs" element={<PublishJobsPage />}>
          <Route path="new" element={null} />
          <Route path=":id" element={null} />
        </Route>
        <Route path="export" element={<ExportPage />} />
        <Route path="sources" element={<SourcesPage />}>
          <Route path="new" element={null} />
        </Route>
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="ai/status" element={<AiStatusPage />} />
        <Route path="ai/models" element={<AiModelsPage />}>
          <Route path="new" element={null} />
          <Route path=":id" element={null} />
        </Route>
        <Route path="ai/operations" element={<AiOperationsPage />} />
        <Route path="ai/prompts" element={<AiPromptsPage />} />
        <Route path="staff" element={<StaffPage />} />
        {NAV.filter((entry) => !entry.available).map((entry) => (
          <Route key={entry.path} path={entry.path.slice(1)} element={<ComingSoonPage item={entry} />} />
        ))}
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </>,
);
