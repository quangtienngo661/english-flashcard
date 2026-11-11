'use client';

import { Check, CircleAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { BackLink } from '@/app-chrome/BackLink';
import { PageTitle } from '@/app-chrome/PageTitle';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { useAppConfig, useEntitlements } from '@/app-shell/queries';
import { useApi, useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { PasswordField } from '@/ui/PasswordField';
import { SkeletonBlocks } from '@/ui/Skeleton';
import { ErrorState } from '@/ui/States';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import { TextField } from '@/ui/TextField';
import { FormError } from '../auth/AuthHeading';
import { isAutoRenewing, subscriptionsOf } from '../plans/auto-renewing';

const CARD = 'rounded-wm-xl border border-wm-line bg-wm-surface p-4 shadow-wm-card md:p-6';

/**
 * Design §9.4, Figma 121:4503 / 121:4634: what goes and what stays, then "Xác nhận xóa" (the Pro-time note, then the block for a renewing
 * plan or the three confirmations and the red button). The info card is first in the DOM, so every size reads it first; from 768 px CSS
 * `order` moves the confirm card to the left (400 px), as the desktop frame draws it.
 */
export function DeleteAccountPage() {
  const t = useTranslations('App.deleteAccount');
  const locale = useLocale();
  const { state } = useSession();
  const entitlements = useEntitlements();
  const config = useAppConfig();
  const errorText = useErrorMessage();
  if (state.status !== 'signed-in') return null;

  let body;
  if (entitlements.isPending || config.isPending) body = <SkeletonBlocks />;
  else if (entitlements.isError) body = <ErrorState message={errorText(entitlements.error)} onRetry={() => void entitlements.refetch()} />;
  else {
    const renewing = subscriptionsOf(entitlements.data.sources).some(isAutoRenewing);
    body = (
      <div className="flex flex-col gap-4 md:max-w-240 md:flex-row md:items-start md:gap-5">
        <Lists years={config.data?.account?.transaction_retention_years} />
        <ConfirmCard proLost={Boolean(entitlements.data.pro_until)}>
          {renewing ? (
            <div role="alert" className="flex flex-col items-start gap-2">
              <p className="font-wm-sans text-wm-base-strong text-wm-ink">{t('blocked')}</p>
              <Link href={`/${locale}/app/plans`} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal)}>
                {t('blockedLink')}
              </Link>
            </div>
          ) : (
            <DeleteForm hasPassword={(state.me.sign_in_methods ?? ['password']).includes('password')} />
          )}
        </ConfirmCard>
      </div>
    );
  }

  return (
    <>
      <BackLink href={`/${locale}/app/settings`} label={t('back')} />
      <PageTitle>{t('title')}</PageTitle>
      {body}
    </>
  );
}

function ConfirmCard({ proLost, children }: { proLost: boolean; children: ReactNode }) {
  const t = useTranslations('App.deleteAccount');
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn(CARD, 'flex flex-col gap-4 md:order-1 md:w-100 md:shrink-0')}>
      <h2 id={headingId} className="font-wm-display text-xl font-bold text-wm-ink">
        {t('confirmTitle')}
      </h2>
      {proLost && (
        <div role="note" className="flex items-start gap-2 rounded-wm-lg bg-wm-fail-soft p-4 text-wm-fail">
          <CircleAlert aria-hidden className="mt-0.5 size-4.5 shrink-0" />
          <p className="font-wm-sans text-wm-small-strong">{t('proLost')}</p>
        </div>
      )}
      {children}
    </section>
  );
}

function ListItems({ marker, items }: { marker: 'deleted' | 'kept'; items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((text) => (
        <li key={text} className="flex gap-1.5 font-wm-sans text-wm-small text-wm-ink">
          <span aria-hidden className={cn('w-3.5 shrink-0 font-bold', marker === 'deleted' ? 'text-wm-fail' : 'text-wm-muted')}>
            {marker === 'deleted' ? '×' : '·'}
          </span>
          <span className="min-w-0">{text}</span>
        </li>
      ))}
    </ul>
  );
}

function Lists({ years }: { years: number | undefined }) {
  const t = useTranslations('App.deleteAccount');
  const heading = 'font-wm-display text-wm-base font-bold text-wm-ink';
  const deleted = (['learning', 'privateWords', 'plans', 'sessions'] as const).map((key) => t(`deleted.${key}`));
  const kept = [
    years === undefined ? t('kept.paymentsNoYears') : t('kept.payments', { years }),
    t('kept.reports'),
    t('kept.usage'),
    t('kept.totals'),
  ];
  return (
    <div className={cn(CARD, 'flex flex-col gap-4 md:order-2 md:min-w-0 md:flex-1 md:gap-6')}>
      <div className="flex flex-col gap-2">
        <h3 className={heading}>{t('deletedTitle')}</h3>
        <ListItems marker="deleted" items={deleted} />
      </div>
      {/* Phone: a hairline above the second list (Figma 121:4654); desktop: only the gap. */}
      <div className="flex flex-col gap-2 border-t border-wm-line pt-4 md:border-t-0 md:pt-0">
        <h3 className={heading}>{t('keptTitle')}</h3>
        <ListItems marker="kept" items={kept} />
      </div>
    </div>
  );
}

function DeleteForm({ hasPassword }: { hasPassword: boolean }) {
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Checkbox isSelected={understood} onChange={setUnderstood}>
        {t('understand')}
      </Checkbox>
      <TextField label={t('typeEmail')} type="email" value={typedEmail} onChange={setTypedEmail} autoComplete="off" spellCheck={false} />
      {hasPassword ? (
        <PasswordField label={t('password')} value={password} onChange={setPassword} autoComplete="current-password" />
      ) : (
        <div className="flex flex-col items-start gap-2">
          {proven ? (
            <p className="flex items-center gap-1.5 font-wm-sans text-wm-small-strong text-wm-pass">
              <Check aria-hidden className="size-4 shrink-0" />
              {t('googleConfirmed')}
            </p>
          ) : (
            <Button type="button" variant="secondary" onPress={() => void confirmWithGoogle()} isPending={googleBusy}>
              {t('confirmWithGoogle')}
            </Button>
          )}
          {reauth === 'wrong-account' && <p role="alert" className="font-wm-sans text-wm-caption text-wm-fail">{t('wrongAccount')}</p>}
          {reauth === 'failed' && <p role="alert" className="font-wm-sans text-wm-caption text-wm-fail">{t('googleFailed')}</p>}
        </div>
      )}
      <FormError message={error} />
      <Button type="submit" variant="danger" className="self-start" isPending={busy} isDisabled={!ready}>
        {t('submit')}
      </Button>
    </form>
  );
}
