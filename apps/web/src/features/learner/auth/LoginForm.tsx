'use client';

import { Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { safeNext } from '@/app-shell/locale-prefix';
import { hardReplace } from '@/app-shell/navigate';
import { setPendingPassword, writePendingEmail } from '@/app-shell/session/pending-email';
import { useSession } from '@/app-shell/session/session-context';
import type { Notice } from '@/app-shell/session/session-store';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { TextField } from '@/app-ui/TextField';
import type { AppLocale } from '@/i18n/routing';
import { AuthCard, FormError, GoogleSoon } from './AuthCard';

const NOTICE_KEY: Record<Notice, 'expired' | 'rateLimited' | 'logoutFailed'> = {
  expired: 'expired',
  'rate-limited': 'rateLimited',
  'logout-failed': 'logoutFailed',
};

/** K/02, K/93: sign-in, then back to `?next` (E1, E2). Says why the session ended (E3, E4) and when the account is locked (E8). */
export function LoginForm() {
  const t = useTranslations('App.auth');
  const errorText = useErrorMessage();
  const locale = useLocale() as AppLocale;
  const params = useSearchParams();
  const router = useRouter();
  const { state, store } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { submit, busy } = useSubmitOnce(async () => {
    await store!.login(email.trim(), password);
    hardReplace(safeNext(params.get('next'), locale));
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLocked(false);
    try {
      await submit();
    } catch (failure) {
      if (failure instanceof ApiError && failure.problem.slug === 'email-not-verified') {
        writePendingEmail(email.trim());
        setPendingPassword(password);
        const next = params.get('next');
        router.replace(`/${locale}/app/verify-email?reason=login${next === null ? '' : `&next=${encodeURIComponent(next)}`}`);
      } else if (failure instanceof ApiError && failure.problem.slug === 'account-locked') setLocked(true);
      else setError(errorText(failure));
    }
  }

  const reason = params.get('reason');
  const notice =
    state.status === 'signed-out' && state.notice
      ? state.notice
      : reason === 'expired' || reason === 'rate-limited'
        ? reason
        : null;
  const info = params.get('reset') === '1' ? t('login.passwordReset') : notice ? t(`login.${NOTICE_KEY[notice]}`) : null;

  return (
    <AuthCard
      title={t('login.title')}
      banner={
        <>
          {locked && (
            <div role="alert" className="flex gap-3 rounded-inner border border-danger bg-danger-soft p-4">
              <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
              <div className="flex flex-col gap-1">
                <p className="text-ui font-semibold text-ink">{t('login.lockedTitle')}</p>
                <p className="text-ui text-ink">{t('login.lockedBody')}</p>
              </div>
            </div>
          )}
          {info && (
            <div role="status" className="flex flex-col items-start gap-2 rounded-inner bg-accent-soft p-3 text-ui text-ink">
              {info}
              {notice === 'logout-failed' && (
                <Button variant="quiet" onPress={() => void store?.retryLogout()}>
                  {t('login.retryLogout')}
                </Button>
              )}
            </div>
          )}
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField label={t('email')} type="email" value={email} onChange={setEmail} autoComplete="email" spellCheck={false} />
        <TextField label={t('password')} type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <Link href={`/${locale}/app/forgot-password`} className="-mt-2 w-fit text-caption font-semibold text-primary underline underline-offset-2">
          {t('login.forgot')}
        </Link>
        <FormError message={error} />
        <Button type="submit" variant="sticker" size="lg" isPending={busy} isDisabled={!store}>
          {t('login.submit')}
        </Button>
        <GoogleSoon />
        <p className="text-ui text-muted">
          {t('login.noAccount')}{' '}
          <Link href={`/${locale}/app/register`} className="font-semibold text-primary underline underline-offset-2">
            {t('login.register')}
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
