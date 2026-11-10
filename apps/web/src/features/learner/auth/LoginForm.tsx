'use client';

import { Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
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
import { useTurnstile } from '@/app-shell/use-turnstile';
import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/ui/Button';
import { PasswordField } from '@/ui/PasswordField';
import { TextField } from '@/ui/TextField';
import { AuthHeading, FormError, LabelLink, OrDivider, SwitchAuthLink } from './AuthHeading';
import { GoogleSignIn } from './GoogleSignIn';

/** `?error=` slugs the Google trip comes back with (design §9.1); `account-locked` has its own box. */
const GOOGLE_ERRORS = ['google-failed', 'google-unavailable', 'google-busy', 'google-email-unverified'] as const;

const NOTICE_KEY: Record<Notice, 'expired' | 'rateLimited' | 'logoutFailed'> = {
  expired: 'expired',
  'rate-limited': 'rateLimited',
  'logout-failed': 'logoutFailed',
};

/** K/02, K/93: sign-in, then back to `?next` (E1, E2). Says why the session ended (E3, E4) and when the account is locked (E8). */
export function LoginForm() {
  const t = useTranslations('App.auth');
  const tErrors = useTranslations('App.errors');
  const errorText = useErrorMessage();
  const locale = useLocale() as AppLocale;
  const params = useSearchParams();
  const router = useRouter();
  const { state, store } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const returned = params.get('error');
  const [locked, setLocked] = useState(returned === 'account-locked');
  const [error, setError] = useState<string | null>(null);

  const bot = useTurnstile();

  const { submit, busy } = useSubmitOnce(async () => {
    try {
      await store!.login(email.trim(), password, bot.token!);
    } catch (failure) {
      // The token is spent whatever the answer was (wrong password, 429, ...): a new one for the next press.
      bot.reset();
      throw failure;
    }
    hardReplace(safeNext(params.get('next'), locale));
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (bot.token === null) return;
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
    <AuthHeading
      title={t('login.title')}
      size="page"
      banner={
        <>
          {locked && (
            <div role="alert" className="flex gap-3 rounded-wm-md border border-wm-fail bg-wm-fail-soft p-4">
              <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-wm-fail" />
              <div className="flex flex-col gap-1 font-wm-sans text-wm-small text-wm-ink">
                <p className="font-semibold">{t('login.lockedTitle')}</p>
                <p>{t('login.lockedBody')}</p>
              </div>
            </div>
          )}
          {info && (
            <div role="status" className="flex flex-col items-start gap-2 rounded-wm-md bg-wm-accent-soft p-3 font-wm-sans text-wm-small text-wm-ink">
              {info}
              {notice === 'logout-failed' && (
                <Button variant="secondary" onPress={() => void store?.retryLogout()}>
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
        <PasswordField
          label={t('password')}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          labelAside={<LabelLink href={`/${locale}/app/forgot-password`}>{t('login.forgot')}</LabelLink>}
        />
        {bot.widget}
        <FormError message={error ?? (GOOGLE_ERRORS.find((slug) => slug === returned) ? tErrors(returned as (typeof GOOGLE_ERRORS)[number]) : null)} />
        <Button type="submit" size="lg" isPending={busy} isDisabled={!store || bot.token === null}>
          {t('login.submit')}
        </Button>
        <OrDivider />
        <GoogleSignIn next={safeNext(params.get('next'), locale)} />
        <SwitchAuthLink question={t('login.noAccount')} label={t('login.register')} href={`/${locale}/app/register`} />
      </form>
    </AuthHeading>
  );
}
