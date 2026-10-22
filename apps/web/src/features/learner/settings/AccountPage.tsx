'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useEntitlements, useAppConfig } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import type { Me } from '@/app-shell/session/session-store';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { DateOfBirthField } from '@/app-ui/DateOfBirthField';
import { TextField } from '@/app-ui/TextField';
import { showToast } from '@/app-ui/Toast';
import { FormError } from '../auth/AuthCard';
import { useUpdateProfile, type ProfilePatch } from './settings-api';
import { ShortcutList } from './Shortcuts';

/** K/91, K/92: name and birth date (design §8.1); email read-only. Saves only what changed. */
export function AccountPage() {
  const t = useTranslations('App.account');
  const locale = useLocale();
  const { state } = useSession();
  if (state.status !== 'signed-in') return null;
  return (
    <AppShell variant="sub" back={{ href: `/${locale}/app/settings`, label: t('back') }} aside={<AccountAside />}>
      <PageTitle>{t('title')}</PageTitle>
      {/* Keyed by profile so a save that reloads /me starts the form from the stored values. */}
      <AccountForm key={`${state.me.given_name}|${state.me.family_name}|${state.me.birth_date}`} me={state.me} />
    </AppShell>
  );
}

function AccountForm({ me }: { me: Me }) {
  const t = useTranslations('App.account');
  const tSettings = useTranslations('App.settings');
  const errorText = useErrorMessage();
  const { store } = useSession();
  const updateProfile = useUpdateProfile();
  const [givenName, setGivenName] = useState(me.given_name ?? '');
  const [familyName, setFamilyName] = useState(me.family_name ?? '');
  // undefined: untouched; null: typed but not a valid 13+ date.
  const [birthDate, setBirthDate] = useState<string | null | undefined>(undefined);
  const [tooYoung, setTooYoung] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch: ProfilePatch = {
    ...(givenName.trim() !== (me.given_name ?? '') ? { given_name: givenName.trim() } : {}),
    ...(familyName.trim() !== (me.family_name ?? '') ? { family_name: familyName.trim() || null } : {}),
    ...(birthDate && birthDate !== me.birth_date ? { birth_date: birthDate } : {}),
  };
  const changed = Object.keys(patch).length > 0;
  const valid = birthDate !== null && givenName.trim() !== '';

  const { submit, busy } = useSubmitOnce(async () => {
    await updateProfile(patch);
    await store?.recheck();
    showToast(tSettings('saved'), 'success');
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setTooYoung(false);
    try {
      await submit();
    } catch (failure) {
      if (failure instanceof ApiError && failure.problem.slug === 'age-below-minimum') setTooYoung(true);
      else setError(errorText(failure));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 md:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('givenName')} value={givenName} onChange={setGivenName} autoComplete="given-name" maxLength={50} />
        <TextField label={t('familyName')} value={familyName} onChange={setFamilyName} autoComplete="family-name" maxLength={50} />
      </div>
      <div className="max-w-xs">
        <DateOfBirthField
          label={t('birthDate')}
          initial={me.birth_date}
          onChange={(iso) => {
            setTooYoung(false);
            setBirthDate(iso);
          }}
          serverError={tooYoung ? 'tooYoung' : null}
        />
      </div>
      <div className="flex max-w-md flex-col gap-1.5">
        <TextField label={t('email')} value={me.email} onChange={() => {}} isReadOnly />
        {me.email_verified && <span className="text-caption font-semibold text-success">{t('verified')}</span>}
      </div>
      <FormError message={error} />
      <Button type="submit" variant="sticker" size="lg" className="w-fit" isPending={busy} isDisabled={!changed || !valid}>
        {t('save')}
      </Button>
    </form>
  );
}

function AccountAside() {
  const t = useTranslations('App');
  const { data: entitlements } = useEntitlements();
  const { data: config } = useAppConfig();
  const plan = entitlements?.plan ?? 'free';
  const perDay = plan === 'free' ? config?.plans.free.practice_sessions_per_day : config?.plans.pro.practice_sessions_per_day;
  return (
    <>
      <section className="rounded-card bg-accent-soft p-5 shadow-ledge-accent">
        <h2 className="text-body font-semibold text-ink">{t('account.planCard')}</h2>
        {perDay !== undefined && (
          <p className="text-caption text-muted">{t('account.planLine', { plan: t(`chrome.plan.${plan}`), count: perDay })}</p>
        )}
      </section>
      <section className="hidden flex-col gap-3 rounded-card border border-border bg-surface p-5 md:flex">
        <h2 className="text-body font-semibold text-ink">{t('settings.shortcuts')}</h2>
        <ShortcutList />
      </section>
    </>
  );
}
