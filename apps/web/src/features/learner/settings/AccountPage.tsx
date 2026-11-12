'use client';

import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import { BackLink } from '@/app-chrome/BackLink';
import { PageTitle } from '@/ui/PageTitle';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useEntitlements, useAppConfig } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import type { Me } from '@/app-shell/session/session-store';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/ui/Button';
import { DateOfBirthField } from '@/ui/DateOfBirthField';
import { Tag } from '@/ui/Tag';
import { TextField } from '@/ui/TextField';
import { showToast } from '@/ui/Toast';
import { FormError } from '../auth/AuthHeading';
import { CurrentPlanCard } from './CurrentPlanCard';
import { useUpdateProfile, type ProfilePatch } from './settings-api';

const HEADING = 'font-wm-display text-xl font-bold text-wm-ink';

/**
 * K/91, K/92 (Figma 121:4297 / 121:4404): one 720 px column; a card with "Hồ sơ" (name, birth date, save) and "Email đăng nhập" (the email
 * as text, read-only), then the current-plan card. Saves only what changed.
 */
export function AccountPage() {
  const t = useTranslations('App.account');
  const locale = useLocale();
  const { state } = useSession();
  if (state.status !== 'signed-in') return null;
  const { me } = state;
  return (
    <>
      <BackLink href={`/${locale}/app/settings`} label={t('back')} />
      <PageTitle>{t('title')}</PageTitle>
      <div className="flex max-w-180 flex-col gap-4">
        <div className="flex flex-col gap-7 rounded-wm-card border border-wm-line bg-wm-surface p-4 shadow-wm-card md:p-6">
          {/* Keyed by profile so a save that reloads /me starts the form from the stored values. */}
          <ProfileForm key={`${me.given_name}|${me.family_name}|${me.birth_date}`} me={me} />
          <LoginEmail me={me} />
        </div>
        <PlanCard />
      </div>
    </>
  );
}

function ProfileForm({ me }: { me: Me }) {
  const t = useTranslations('App.account');
  const tSettings = useTranslations('App.settings');
  const headingId = useId();
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
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className={HEADING}>
        {t('profile')}
      </h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={t('givenName')} value={givenName} onChange={setGivenName} autoComplete="given-name" maxLength={50} />
          <TextField label={t('familyName')} value={familyName} onChange={setFamilyName} autoComplete="family-name" maxLength={50} />
        </div>
        <div className="sm:w-55">
          <DateOfBirthField
            label={t('birthDate')}
            initial={me.birth_date}
            description={t('ageHint')}
            onChange={(iso) => {
              setTooYoung(false);
              setBirthDate(iso);
            }}
            serverError={tooYoung ? 'tooYoung' : null}
          />
        </div>
        <FormError message={error} />
        <Button type="submit" className="self-start" isPending={busy} isDisabled={!changed || !valid}>
          {t('save')}
        </Button>
      </form>
    </section>
  );
}

/** The sign-in email is not editable here (K/91): shown as text, with "Đã xác minh" once verified. */
function LoginEmail({ me }: { me: Me }) {
  const t = useTranslations('App.account');
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className={HEADING}>
        {t('loginEmail')}
      </h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="min-w-0 break-all font-wm-sans text-wm-base-strong text-wm-ink">{me.email}</p>
        {me.email_verified && (
          <Tag tone="pass">
            <Check aria-hidden className="size-3.5" />
            {t('verified')}
          </Tag>
        )}
      </div>
    </section>
  );
}

/** Trial counts as Pro for the daily sessions, as the API grants it. Drawn once both the plan and the numbers are known. */
function PlanCard() {
  const t = useTranslations('App');
  const locale = useLocale();
  const { data: entitlements } = useEntitlements();
  const { data: config } = useAppConfig();
  if (!entitlements || !config) return null;
  const plan = entitlements.plan;
  const perDay = plan === 'free' ? config.plans.free.practice_sessions_per_day : config.plans.pro.practice_sessions_per_day;
  return (
    <CurrentPlanCard
      title={t('account.planTitle', { plan: t(`chrome.plan.${plan}`) })}
      line={t('account.planSessions', { count: perDay })}
      href={`/${locale}/app/plans`}
      linkLabel={t('account.seePlan')}
    />
  );
}
