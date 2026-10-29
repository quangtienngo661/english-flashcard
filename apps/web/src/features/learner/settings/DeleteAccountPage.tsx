'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { useAppConfig, useEntitlements } from '@/app-shell/queries';
import { useApi, useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Checkbox } from '@/app-ui/Checkbox';
import { TextField } from '@/app-ui/TextField';
import { ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { FormError } from '../auth/AuthCard';
import { isAutoRenewing, subscriptionsOf } from '../plans/auto-renewing';

/** Design §9.4: what goes, what stays, the block for a renewing plan, then the three confirmations and the red button. */
export function DeleteAccountPage() {
  const t = useTranslations('App.deleteAccount');
  const locale = useLocale();
  const { state } = useSession();
  const entitlements = useEntitlements();
  const config = useAppConfig();
  if (state.status !== 'signed-in') return null;

  let body;
  if (entitlements.isPending || config.isPending) body = <FullScreenSpinner />;
  else if (entitlements.isError) body = <ErrorState message="" onRetry={() => void entitlements.refetch()} />;
  else {
    const renewing = subscriptionsOf(entitlements.data.sources).some(isAutoRenewing);
    const years = config.data?.account?.transaction_retention_years;
    body = (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Lists years={years} />
        {renewing ? (
          <div role="alert" className="flex flex-col gap-3 rounded-card border border-danger bg-danger-soft p-5">
            <p className="text-body font-semibold text-ink">{t('blocked')}</p>
            <Link href={`/${locale}/app/plans`} className="w-fit text-ui font-semibold text-primary underline underline-offset-2">
              {t('blockedLink')}
            </Link>
          </div>
        ) : (
          <DeleteForm email={state.me.email} hasPassword={(state.me.sign_in_methods ?? ['password']).includes('password')} />
        )}
      </div>
    );
  }

  return (
    <AppShell variant="sub" back={{ href: `/${locale}/app/settings`, label: t('back') }}>
      <PageTitle>{t('title')}</PageTitle>
      {body}
    </AppShell>
  );
}

function Lists({ years }: { years: number | undefined }) {
  const t = useTranslations('App.deleteAccount');
  const deleted = ['learning', 'privateWords', 'plans', 'sessions'] as const;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
        <h2 className="text-body font-semibold text-ink">{t('deletedTitle')}</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-ui text-ink">
          {deleted.map((key) => (
            <li key={key}>{t(`deleted.${key}`)}</li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
        <h2 className="text-body font-semibold text-ink">{t('keptTitle')}</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-ui text-ink">
          <li>{years === undefined ? t('kept.paymentsNoYears') : t('kept.payments', { years })}</li>
          <li>{t('kept.reports')}</li>
          <li>{t('kept.usage')}</li>
          <li>{t('kept.totals')}</li>
        </ul>
      </section>
    </div>
  );
}

function DeleteForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const t = useTranslations('App.deleteAccount');
  const locale = useLocale();
  const api = useApi();
  const { store } = useSession();
  const errorText = useErrorMessage();
  const params = useSearchParams();
  const reauth = params.get('reauth');
  const [understood, setUnderstood] = useState(false);
  const [typedEmail, setTypedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  // The Google proof lasts five minutes (B8E19): once the API says it ran out, `?reauth=ok` in the address no longer counts.
  const [proofExpired, setProofExpired] = useState(false);

  // A Google-only account proves itself with a Google trip (the cookie it leaves is sent with the delete request, D25).
  const proven = hasPassword ? password !== '' : reauth === 'ok' && !proofExpired;
  const ready = understood && typedEmail.trim() !== '' && proven;

  const { submit, busy } = useSubmitOnce(async () => {
    const result = await api.post<{ status: 'pending' } | undefined>('/v1/me/account/delete', {
      confirm_email: typedEmail.trim(), acknowledged: true, ...(hasPassword ? { password } : {}),
    });
    store?.endAfterDeletion();
    hardReplace(`/${locale}/app/account-deleted${result?.status === 'pending' ? '?pending=1' : ''}`);
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await submit();
    } catch (failure) {
      if (failure instanceof ApiError && failure.problem.slug === 'reauth-required') setProofExpired(true);
      setError(errorText(failure));
    }
  }

  async function confirmWithGoogle() {
    setError(null);
    setGoogleBusy(true);
    try {
      const { start_url } = await api.post<{ start_url: string }>('/v1/auth/google/reauth', { locale });
      window.location.assign(start_url);
    } catch (failure) {
      setGoogleBusy(false);
      setError(failure instanceof ApiError ? errorText(failure) : errorText(failure));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 md:p-6">
      <Checkbox isSelected={understood} onChange={setUnderstood}>
        {t('understand')}
      </Checkbox>
      <TextField label={t('typeEmail')} type="email" value={typedEmail} onChange={setTypedEmail} autoComplete="off" spellCheck={false} placeholder={email} />
      {hasPassword ? (
        <TextField label={t('password')} type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      ) : (
        <div className="flex flex-col gap-2">
          <Button type="button" variant="quiet" className="w-fit" onPress={() => void confirmWithGoogle()} isPending={googleBusy} isDisabled={proven}>
            {proven ? t('googleConfirmed') : t('confirmWithGoogle')}
          </Button>
          {reauth === 'wrong-account' && <p role="alert" className="text-caption text-danger">{t('wrongAccount')}</p>}
          {reauth === 'failed' && <p role="alert" className="text-caption text-danger">{t('googleFailed')}</p>}
        </div>
      )}
      <FormError message={error} />
      <Button type="submit" variant="danger" size="lg" className="w-fit" isPending={busy} isDisabled={!ready}>
        {t('submit')}
      </Button>
    </form>
  );
}
