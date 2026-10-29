'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { setPendingPassword, writePendingEmail } from '@/app-shell/session/pending-email';
import { useSession } from '@/app-shell/session/session-context';
import { deviceTimezone } from '@/app-shell/timezone-sync';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Checkbox } from '@/app-ui/Checkbox';
import { DateOfBirthField } from '@/app-ui/DateOfBirthField';
import { TextField } from '@/app-ui/TextField';
import { AuthCard, FormError, GoogleButton, passwordViolations, PasswordRules, type PasswordRule } from './AuthCard';

/** K/01, K/01b: sign-up. The button stays off until the consent box is ticked and the birth date is 13+. */
export function RegisterForm({ today }: { today?: string }) {
  const t = useTranslations('App.auth');
  const errorText = useErrorMessage();
  const locale = useLocale();
  const router = useRouter();
  const { store } = useSession();
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ givenName?: string; email?: string; age?: boolean; password?: PasswordRule[]; form?: string }>({});

  const { submit, busy } = useSubmitOnce(async () => {
    const registered = await store!.register({
      given_name: givenName.trim(),
      ...(familyName.trim() ? { family_name: familyName.trim() } : {}),
      birth_date: birthDate!,
      email: email.trim(),
      password,
      timezone: deviceTimezone(),
      accept_terms: true,
    });
    writePendingEmail(registered.email);
    setPendingPassword(password);
    router.replace(`/${locale}/app/verify-email`);
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!givenName.trim()) {
      setErrors({ givenName: t('register.givenNameRequired') });
      return;
    }
    setErrors({});
    try {
      await submit();
    } catch (error) {
      const slug = error instanceof ApiError ? error.problem.slug : '';
      const rules = passwordViolations(error);
      // A deleting account still holds the address (design §6.2): say so instead of the "already registered" hint.
      if (slug === 'email-taken' && error instanceof ApiError && error.problem.extensions?.reason === 'account-deleting') setErrors({ email: t('register.accountDeleting') });
      else if (slug === 'email-taken') setErrors({ email: errorText(error) });
      else if (slug === 'age-below-minimum') setErrors({ age: true });
      else if (rules.length) setErrors({ password: rules });
      else setErrors({ form: errorText(error) });
    }
  }

  const link = (href: string) =>
    function ConsentLink(chunks: ReactNode) {
      return (
        <Link href={href} target="_blank" className="font-semibold text-primary underline underline-offset-2">
          {chunks}
        </Link>
      );
    };

  return (
    <AuthCard title={t('register.title')} intro={t('register.subtitle')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t('register.givenName')}
            placeholder={t('register.givenNamePlaceholder')}
            value={givenName}
            onChange={setGivenName}
            autoComplete="given-name"
            maxLength={50}
            error={errors.givenName}
          />
          <TextField
            label={t('register.familyName')}
            placeholder={t('register.familyNamePlaceholder')}
            value={familyName}
            onChange={setFamilyName}
            autoComplete="family-name"
            maxLength={50}
          />
        </div>
        <DateOfBirthField
          label={t('register.birthDate')}
          description={t('register.birthDateHint')}
          onChange={setBirthDate}
          serverError={errors.age ? 'tooYoung' : null}
          today={today}
        />
        <div className="flex flex-col gap-1.5">
          <TextField
            label={t('email')}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            spellCheck={false}
            placeholder="lan@example.com"
            error={errors.email}
          />
          {errors.email && (
            <Link href={`/${locale}/app/forgot-password`} className="w-fit text-caption font-semibold text-primary underline underline-offset-2">
              {t('login.forgot')}
            </Link>
          )}
        </div>
        <TextField
          label={t('password')}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          description={errors.password?.length ? undefined : t('register.passwordHint')}
        />
        <PasswordRules rules={errors.password ?? []} />
        <Checkbox isSelected={consent} onChange={setConsent}>
          {t.rich('register.consent', { terms: link(`/${locale}/terms`), privacy: link(`/${locale}/privacy`) })}
        </Checkbox>
        <FormError message={errors.form ?? null} />
        <Button type="submit" variant="sticker" size="lg" isPending={busy} isDisabled={!consent || birthDate === null || !store}>
          {t('register.submit')}
        </Button>
        <p className="text-center text-caption text-muted">{t('or')}</p>
        <GoogleButton next={`/${locale}/app`} />
        <p className="text-ui text-muted">
          {t('register.haveAccount')}{' '}
          <Link href={`/${locale}/app/login`} className="font-semibold text-primary underline underline-offset-2">
            {t('register.login')}
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
