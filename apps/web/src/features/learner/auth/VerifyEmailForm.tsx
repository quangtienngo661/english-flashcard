'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { showToast } from '@/app-ui/Toast';
import { AuthCard, FormError } from './AuthCard';

const DIGITS = 6;
/** The API refuses a new code within this many seconds (auth.otp.email.cooldown). */
const RESEND_AFTER_S = 60;

/**
 * K/03: the 6-digit code. After sign-up (`?sent=1`) the code is already on its way; opened from Settings, this screen asks for
 * one. Resending waits 60 s. No way to skip, as the frame (design §5 M1).
 */
export function VerifyEmailForm() {
  const t = useTranslations('App.auth.verify');
  const errorText = useErrorMessage();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { state, store } = useSession();
  const [digits, setDigits] = useState<string[]>(() => Array(DIGITS).fill(''));
  // When resending is allowed again, and the clock that counts down to it.
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_AFTER_S * 1000);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const askedOnce = useRef(false);

  const api = store ? createApiClient({ send: store.send }) : null;

  // Opened without a fresh code: ask for one once (Strict Mode runs effects twice).
  useEffect(() => {
    if (!api || askedOnce.current || params.get('sent') === '1') return;
    askedOnce.current = true;
    api.post('/v1/auth/otp', { purpose: 'verify_email' }).catch((failure) => setError(errorText(failure)));
  }, [api, params, errorText]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const { submit, busy } = useSubmitOnce(async () => {
    await api!.post('/v1/auth/verify-email', { code: digits.join('') });
    await store!.recheck();
    const me = store!.state.status === 'signed-in' ? store!.state.me : null;
    router.replace(me?.native_language ? `/${locale}/app` : `/${locale}/app/welcome`);
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await submit();
    } catch (failure) {
      setError(errorText(failure));
    }
  }

  async function resend() {
    setError(null);
    try {
      await api!.post('/v1/auth/otp', { purpose: 'verify_email' });
      setResendAt(Date.now() + RESEND_AFTER_S * 1000);
      setNow(Date.now());
      showToast(t('resent'), 'success');
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

  const email = state.status === 'signed-in' ? state.me.email : '';
  const complete = digits.every((d) => d !== '');

  return (
    <AuthCard title={t('title')} intro={t('body', { email })} onBack={() => router.back()}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex gap-2">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              aria-label={t('digit', { n: i + 1 })}
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
          <p className="text-caption text-muted">{t('resendIn', { seconds: wait })}</p>
        ) : (
          <button type="button" onClick={() => void resend()} className="w-fit text-caption font-semibold text-primary underline underline-offset-2">
            {t('resend')}
          </button>
        )}
        <FormError message={error} />
        <Button type="submit" variant="sticker" size="lg" isPending={busy} isDisabled={!complete || !api}>
          {t('submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
