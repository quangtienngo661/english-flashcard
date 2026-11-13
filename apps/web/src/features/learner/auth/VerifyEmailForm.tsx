'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { safeNext } from '@/app-shell/locale-prefix';
import { hardReplace } from '@/app-shell/navigate';
import { clearPendingEmail, clearPendingPassword, readPendingEmail, readPendingPassword } from '@/app-shell/session/pending-email';
import { useSession } from '@/app-shell/session/session-context';
import type { Me } from '@/app-shell/session/session-store';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { useTurnstile } from './use-turnstile';
import { Button } from '@/ui/Button';
import { OtpField } from '@/ui/OtpField';
import { PasswordField } from '@/ui/PasswordField';
import { TextField } from '@/ui/TextField';
import { TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/Toast';
import type { AppLocale } from '@/i18n/routing';
import { AuthHeading, FormError } from './AuthHeading';
import { useFocusFirstInvalid } from './focus-first-invalid';

const DIGITS = 6;
/** The API refuses a new code within this many seconds (auth.otp.email.cooldown). */
const RESEND_AFTER_S = 60;
const INTL_LOCALE: Record<AppLocale, string> = { vi: 'vi-VN', en: 'en-US' };

/** "2 phút", "24 hours": the wait of a locked code in the largest whole unit. */
function waitText(seconds: number, locale: AppLocale): string {
  const [value, unit] = seconds >= 3600 ? [Math.ceil(seconds / 3600), 'hour'] : seconds >= 60 ? [Math.ceil(seconds / 60), 'minute'] : [seconds, 'second'];
  return new Intl.NumberFormat(INTL_LOCALE[locale], { style: 'unit', unit, unitDisplay: 'long' }).format(value);
}

/**
 * K/03: the 6-digit code, signed out (design §4.3, A15). The email comes from sign-up or sign-in (sessionStorage), the password
 * from memory; either missing (reload, new tab) → a field. The right code signs in. Resending waits 60 s; nothing is sent on open.
 */
export function VerifyEmailForm() {
  const t = useTranslations('App.auth');
  const errorText = useErrorMessage();
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const params = useSearchParams();
  const { state, store } = useSession();
  // Read once; the reads repeat harmlessly when Strict Mode renders twice.
  const [pendingEmail] = useState(readPendingEmail);
  const [memoryPassword] = useState(readPendingPassword);
  const [typedEmail, setTypedEmail] = useState('');
  const [typedPassword, setTypedPassword] = useState('');
  const [code, setCode] = useState('');
  // When resending is allowed again, and the clock that counts down to it.
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_AFTER_S * 1000);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ email?: string; password?: string; code?: string }>({});
  const form = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(form);
  const firstStatus = useRef<string | null>(null);
  const submitting = useRef(false);

  const email = pendingEmail ?? typedEmail.trim();
  const password = memoryPassword ?? typedPassword;
  const next = params.get('next');

  const destination = (me: Me | null) =>
    me?.native_language ? safeNext(next, locale) : `/${locale}/app/welcome${next ? `?next=${encodeURIComponent(safeNext(next, locale))}` : ''}`;

  // Leaving the page forgets the password (state survives Strict Mode's simulated remount).
  useEffect(() => () => clearPendingPassword(), []);

  // Another tab signed in (BroadcastChannel → bootstrap): go in. A page opened signed in is AuthGate's; the form's own submit navigates itself.
  useEffect(() => {
    if (state.status === 'loading') return;
    firstStatus.current ??= state.status;
    if (state.status !== 'signed-in' || firstStatus.current === 'signed-in' || submitting.current) return;
    clearPendingEmail();
    hardReplace(destination(state.me));
    // destination only reads the query and locale, fixed for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const { submit, busy } = useSubmitOnce(async () => {
    submitting.current = true;
    try {
      await store!.verifyEmail(email, code, password);
    } catch (failure) {
      submitting.current = false;
      throw failure;
    }
    clearPendingEmail();
    hardReplace(destination(store!.state.status === 'signed-in' ? store!.state.me : null));
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const empty = {
      ...(email ? {} : { email: t('required.email') }),
      ...(password ? {} : { password: t('required.password') }),
      ...(complete ? {} : { code: t('required.code') }),
    };
    setMissing(empty);
    if (Object.keys(empty).length > 0) {
      focusFirstInvalid();
      return;
    }
    try {
      await submit();
    } catch (failure) {
      if (failure instanceof ApiError && failure.problem.slug === 'invalid-otp') setError(t('verify.wrongCode'));
      else if (failure instanceof ApiError && failure.problem.status === 429) {
        setError(t('verify.locked', { time: waitText(failure.retryAfterSeconds ?? RESEND_AFTER_S, locale) }));
      } else setError(errorText(failure));
    }
  }

  // One request per press: the API refuses a second code within 60 s.
  const bot = useTurnstile();
  const resendPress = useSubmitOnce(async () => {
    try {
      await createApiClient({ send: store!.send }).post('/v1/auth/otp', { purpose: 'verify_email', email, turnstile_token: bot.token });
    } finally {
      // This form stays on the page whatever the answer, so the spent token is always replaced.
      bot.reset();
    }
    setResendAt(Date.now() + RESEND_AFTER_S * 1000);
    setNow(Date.now());
    showToast(t('verify.resent'), 'success');
  });

  async function resend() {
    setError(null);
    try {
      await resendPress.submit();
    } catch (failure) {
      setError(errorText(failure));
    }
  }

  const complete = new RegExp(`^\\d{${DIGITS}}$`).test(code);
  const intro = pendingEmail === null
    ? t('verify.bodyNoEmail')
    : params.get('reason') === 'login' ? t('verify.loginBody', { email: pendingEmail }) : t('verify.body', { email: pendingEmail });

  return (
    <AuthHeading title={t('verify.title')} intro={intro} onBack={() => router.back()}>
      <form ref={form} onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-5">
        {pendingEmail === null && (
          <TextField label={t('email')} type="email" value={typedEmail} onChange={setTypedEmail} autoComplete="email" spellCheck={false} error={missing.email} />
        )}
        {memoryPassword === null && (
          <PasswordField label={t('password')} value={typedPassword} onChange={setTypedPassword} autoComplete="current-password" error={missing.password} />
        )}
        <OtpField
          label={t('verify.title')}
          hideLabel
          digitLabel={(n) => t('verify.digit', { n })}
          value={code}
          onChange={setCode}
          length={DIGITS}
          error={missing.code}
        />
        {bot.widget}
        <FormError message={error} />
        <Button type="submit" size="lg" isPending={busy} isDisabled={!store}>
          {t('verify.submit')}
        </Button>
        {wait > 0 ? (
          <p className="text-center font-wm-sans text-wm-small text-wm-muted">{t('verify.resendIn', { seconds: wait })}</p>
        ) : (
          <TextButton className="self-center" isDisabled={resendPress.busy || !email || bot.token === null} onPress={() => void resend()}>
            {t('verify.resend')}
          </TextButton>
        )}
      </form>
    </AuthHeading>
  );
}
