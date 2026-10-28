'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { safeNext } from '@/app-shell/locale-prefix';
import { hardReplace } from '@/app-shell/navigate';
import { clearPendingEmail, clearPendingPassword, readPendingEmail, readPendingPassword } from '@/app-shell/session/pending-email';
import { useSession } from '@/app-shell/session/session-context';
import type { Me } from '@/app-shell/session/session-store';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { showToast } from '@/app-ui/Toast';
import { TextField } from '@/app-ui/TextField';
import type { AppLocale } from '@/i18n/routing';
import { AuthCard, FormError } from './AuthCard';

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
  const [digits, setDigits] = useState<string[]>(() => Array(DIGITS).fill(''));
  // When resending is allowed again, and the clock that counts down to it.
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_AFTER_S * 1000);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
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
      await store!.verifyEmail(email, digits.join(''), password);
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
  const resendPress = useSubmitOnce(async () => {
    await createApiClient({ send: store!.send }).post('/v1/auth/otp', { purpose: 'verify_email', email });
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

  function put(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits((current) => current.map((d, i) => (i === index ? digit : d)));
    if (digit && index < DIGITS - 1) boxes.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) boxes.current[index - 1]?.focus();
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    if (!pasted) return;
    event.preventDefault();
    setDigits(Array.from({ length: DIGITS }, (_, i) => pasted[i] ?? ''));
    boxes.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
  }

  const complete = digits.every((d) => d !== '');
  const intro = pendingEmail === null
    ? t('verify.bodyNoEmail')
    : params.get('reason') === 'login' ? t('verify.loginBody', { email: pendingEmail }) : t('verify.body', { email: pendingEmail });

  return (
    <AuthCard title={t('verify.title')} intro={intro} onBack={() => router.back()}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {pendingEmail === null && (
          <TextField label={t('email')} type="email" value={typedEmail} onChange={setTypedEmail} autoComplete="email" spellCheck={false} />
        )}
        {memoryPassword === null && (
          <TextField label={t('password')} type="password" value={typedPassword} onChange={setTypedPassword} autoComplete="current-password" />
        )}
        <div className="flex gap-2">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              aria-label={t('verify.digit', { n: i + 1 })}
              value={digit}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={2}
              onChange={(e) => put(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
              className="size-12 min-w-0 flex-1 rounded-control border-2 border-border-strong bg-surface text-center text-title font-semibold text-ink outline-none focus-visible:border-primary"
            />
          ))}
        </div>
        {wait > 0 ? (
          <p className="text-caption text-muted">{t('verify.resendIn', { seconds: wait })}</p>
        ) : (
          <button
            type="button"
            disabled={resendPress.busy || !email}
            onClick={() => void resend()}
            className="w-fit text-caption font-semibold text-primary underline underline-offset-2 disabled:text-muted disabled:no-underline"
          >
            {t('verify.resend')}
          </button>
        )}
        <FormError message={error} />
        <Button type="submit" variant="sticker" size="lg" isPending={busy} isDisabled={!complete || !store || !email || !password}>
          {t('verify.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
