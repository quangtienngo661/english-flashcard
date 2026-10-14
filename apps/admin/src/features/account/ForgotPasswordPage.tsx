import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { useApi, useSession } from '../../auth/session-context';
import { ApiError } from '../../api/problem';
import { useErrorMessage } from '../../api/use-error-message';
import { checkPasswordPolicy } from '../../auth/password-policy';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { AuthCard } from './AuthCard';
import { PasswordRules } from './PasswordRules';
import { useCountdown } from './useCountdown';

const FALLBACK_WAIT_SECONDS = 60;

export function ForgotPasswordPage() {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const api = useApi();
  const navigate = useNavigate();
  const { state } = useSession();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const sendWait = useCountdown(); // "Gửi mã" / "Gửi lại mã"
  const lockWait = useCountdown(); // the reset code is locked after too many wrong tries
  const busy = useRef(false);

  if (state.status === 'signed-in') return <Navigate to="/" replace />;
  if (state.status === 'change-password') return <Navigate to="/change-password" replace />;

  /** Runs one submit at a time (a double-click or Enter-then-click sends one request). */
  async function once(work: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      await work();
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const sendCode = (resend: boolean) =>
    once(async () => {
      try {
        await api.post('/v1/auth/otp', { purpose: 'reset_password', email: email.trim() });
        setStep('code');
        if (resend) setInfo(t('account.forgot.resent'));
      } catch (e) {
        if (e instanceof ApiError && e.problem.status === 429) sendWait.start(e.retryAfterSeconds ?? FALLBACK_WAIT_SECONDS);
        else setError(errorMessage(e));
      }
    });

  function submitEmail(event: FormEvent) {
    event.preventDefault();
    void sendCode(false);
  }

  function submitReset(event: FormEvent) {
    event.preventDefault();
    const normalized = code.replace(/\s+/g, '');
    const local = checkPasswordPolicy(password);
    setViolations(local);
    setCodeError(null);
    if (local.length > 0) return;
    void once(async () => {
      try {
        await api.post('/v1/auth/password/reset', { email: email.trim(), code: normalized, new_password: password });
        navigate('/login', { replace: true });
      } catch (e) {
        if (e instanceof ApiError) {
          const { problem } = e;
          if (problem.status === 429) lockWait.start(e.retryAfterSeconds ?? FALLBACK_WAIT_SECONDS);
          else if (problem.slug === 'invalid-otp') setCodeError(errorMessage(e));
          else if (problem.slug === 'validation-failed' && problem.violations?.length) setViolations(problem.violations);
          else setError(errorMessage(e));
        } else {
          setError(errorMessage(e));
        }
      }
    });
  }

  const back = (
    <div className="flex justify-center">
      <Link to="/login" className="text-ui font-medium text-primary underline-offset-2 hover:underline">
        {t('account.forgot.back')}
      </Link>
    </div>
  );

  if (step === 'email') {
    const waiting = sendWait.remaining > 0;
    return (
      <AuthCard title={t('account.forgot.title')} subtitle={t('account.forgot.subtitle')}>
        <form onSubmit={submitEmail} className="flex flex-col gap-4" noValidate>
          {error && <Banner variant="error">{error}</Banner>}
          <TextField
            label={t('account.forgot.email')}
            type="email"
            name="email"
            autoComplete="username"
            placeholder={t('account.login.emailPlaceholder')}
            value={email}
            onChange={setEmail}
          />
          <Button type="submit" size="touch" isPending={pending} isDisabled={waiting} className="w-full">
            {waiting ? t('account.forgot.wait', { label: t('account.forgot.send'), seconds: sendWait.remaining }) : t('account.forgot.send')}
          </Button>
          {back}
        </form>
      </AuthCard>
    );
  }

  const locked = lockWait.remaining > 0;
  const resendWaiting = sendWait.remaining > 0;
  return (
    <AuthCard title={t('account.forgot.resetTitle')} subtitle={t('account.forgot.resetSubtitle', { email: email.trim() })}>
      <form onSubmit={submitReset} className="flex flex-col gap-4" noValidate>
        {error && <Banner variant="error">{error}</Banner>}
        {info && <Banner variant="info">{info}</Banner>}
        <div className="flex flex-col gap-1.5">
          <TextField
            label={t('account.forgot.code')}
            name="code"
            autoComplete="one-time-code"
            value={code}
            onChange={setCode}
            error={codeError ?? undefined}
            isDisabled={locked}
          />
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <Button variant="ghost" onPress={() => void sendCode(true)} isDisabled={resendWaiting || pending}>
              {resendWaiting ? t('account.forgot.resendWait', { seconds: sendWait.remaining }) : t('account.forgot.resend')}
            </Button>
            {codeError && (
              <Button variant="ghost" onPress={() => { setStep('email'); setCodeError(null); }}>
                {t('account.forgot.requestNew')}
              </Button>
            )}
          </div>
        </div>
        <TextField
          label={t('account.forgot.newPassword')}
          type="password"
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={violations.length > 0 ? t('account.passwordRules.notMet') : undefined}
        />
        {violations.length > 0 && <PasswordRules violations={violations} />}
        <Button type="submit" size="touch" isPending={pending} isDisabled={locked} className="w-full">
          {locked ? t('account.forgot.wait', { label: t('account.forgot.submit'), seconds: lockWait.remaining }) : t('account.forgot.submit')}
        </Button>
        {back}
      </form>
    </AuthCard>
  );
}
