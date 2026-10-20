import { useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, useErrorMessage, type ErrorDetails } from '../../api/use-error-message';
import { checkPasswordPolicy } from '../../auth/password-policy';
import { useSession } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { SessionLoading } from '../../app/SessionLoading';
import { AuthCard } from './AuthCard';
import { PasswordRules } from './PasswordRules';

/** Forced password change (spec §5): the only screen a staff user with `must_change_password` can reach. */
export function ChangePasswordPage() {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const errorDetails = useErrorDetails();
  const { state, store } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  if (state.status === 'signed-out') return <Navigate to="/login" replace />;
  if (state.status === 'signed-in') return <Navigate to="/" replace />;
  if (state.status === 'unavailable') return <SessionLoading />;
  if (state.status === 'loading') {
    return (
      <p role="status" className="p-8 text-ui text-muted">
        {t('shell.loadingSession')}
      </p>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    setCurrentError(null);
    setConfirmError(null);
    setError(null);
    const local = checkPasswordPolicy(next);
    setViolations(local);
    const mismatch = next !== confirm;
    if (mismatch) setConfirmError(t('account.changePassword.mismatch'));
    if (local.length > 0 || mismatch) return;

    busy.current = true;
    setPending(true);
    try {
      await store.changePassword(current, next);
    } catch (e) {
      if (e instanceof ApiError && e.problem.slug === 'invalid-current-password') setCurrentError(errorMessage(e));
      else if (e instanceof ApiError && e.problem.slug === 'validation-failed' && e.problem.violations?.length) {
        setViolations(e.problem.violations);
      } else setError(errorDetails(e));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <AuthCard title={t('account.changePassword.title')} subtitle={t('account.changePassword.subtitle')}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Banner variant="error" code={error.code}>{error.message}</Banner>}
        <TextField
          label={t('account.changePassword.current')}
          type="password"
          name="current-password"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
          error={currentError ?? undefined}
        />
        <TextField
          label={t('account.changePassword.new')}
          type="password"
          name="new-password"
          autoComplete="new-password"
          value={next}
          onChange={setNext}
          error={violations.length > 0 ? t('account.passwordRules.notMet') : undefined}
        />
        {violations.length > 0 && <PasswordRules violations={violations} />}
        <TextField
          label={t('account.changePassword.confirm')}
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={confirmError ?? undefined}
        />
        <Button type="submit" size="touch" isPending={pending} className="w-full">
          {t('account.changePassword.submit')}
        </Button>
        <Button variant="ghost" onPress={() => void store.logout()}>
          {t('account.changePassword.logout')}
        </Button>
      </form>
    </AuthCard>
  );
}
