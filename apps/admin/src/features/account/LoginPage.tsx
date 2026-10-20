import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useTranslations } from 'use-intl';
import { useErrorMessage } from '../../api/use-error-message';
import { SessionLoading } from '../../app/SessionLoading';
import { useSession } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { AuthCard } from './AuthCard';

export function LoginPage() {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const { state, store } = useSession();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [retrying, setRetrying] = useState(false);

  if (state.status === 'signed-in') return <Navigate to={from ?? '/'} replace />;
  if (state.status === 'change-password') return <Navigate to="/change-password" replace />;
  if (state.status === 'loading' || state.status === 'unavailable') return <SessionLoading />;

  const notice = state.notice;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await store.login(email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <AuthCard title={t('account.login.title')} subtitle={t('account.login.subtitle')}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {notice === 'no-access' && <Banner variant="error">{t('errors.noAccess')}</Banner>}
        {notice === 'expired' && <Banner variant="info">{t('notice.expired')}</Banner>}
        {notice === 'logout-failed' && (
          <Banner
            variant="error"
            action={
              <button
                type="button"
                className="underline disabled:opacity-60"
                disabled={retrying}
                onClick={() => {
                  setRetrying(true);
                  void store.retryLogout().finally(() => setRetrying(false));
                }}
              >
                {t('session.retry')}
              </button>
            }
          >
            {t('notice.logoutFailed')}
          </Banner>
        )}
        {notice === 'rate-limited' && <Banner variant="info">{t('errors.rate-limited')}</Banner>}
        {error && <Banner variant="error">{error}</Banner>}
        <TextField
          label={t('account.login.email')}
          type="email"
          name="email"
          autoComplete="username"
          spellCheck={false}
          placeholder={t('account.login.emailPlaceholder')}
          value={email}
          onChange={setEmail}
        />
        <TextField
          label={t('account.login.password')}
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-ui font-medium text-primary underline-offset-2 hover:underline">
            {t('account.login.forgot')}
          </Link>
        </div>
        <Button type="submit" size="touch" isPending={pending} className="w-full">
          {t('account.login.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
