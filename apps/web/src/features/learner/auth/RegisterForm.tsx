'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { setPendingPassword, writePendingEmail } from '@/app-shell/session/pending-email';
import { useSession } from '@/app-shell/session/session-context';
import { deviceTimezone } from '@/app-shell/timezone-sync';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { useTurnstile } from '@/app-shell/use-turnstile';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { DateOfBirthField } from '@/ui/DateOfBirthField';
import { PasswordField } from '@/ui/PasswordField';
import { TextField } from '@/ui/TextField';
import { AuthHeading, ConsentLink, FormError, OrDivider, passwordViolations, PasswordRules, SwitchAuthLink, type PasswordRule } from './AuthHeading';
import { GoogleSignIn } from './GoogleSignIn';

/**
 * K/01, K/01b: sign-up (Figma 35:405 / 37:533). The button stays off until the consent box is ticked and the birth date is 13+.
 * "Nhập lại mật khẩu" is checked here only: a mismatch sends nothing, and the request body is the same as without the field.
 */
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
  const [confirm, setConfirm] = useState('');
  const confirmBox = useRef<HTMLDivElement>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ givenName?: string; email?: string; age?: boolean; password?: PasswordRule[]; confirm?: string; form?: string }>({});

  const bot = useTurnstile();

  const { submit, busy } = useSubmitOnce(async () => {
    let registered: { email: string };
    try {
      registered = await store!.register({
        given_name: givenName.trim(),
        ...(familyName.trim() ? { family_name: familyName.trim() } : {}),
        birth_date: birthDate!,
        email: email.trim(),
        password,
        timezone: deviceTimezone(),
        accept_terms: true,
        turnstile_token: bot.token!,
      });
    } catch (failure) {
      // The token is spent whatever the answer was (email taken, weak password, ...): a new one for the next press.
      bot.reset();
      throw failure;
    }
    writePendingEmail(registered.email);
    setPendingPassword(password);
    router.replace(`/${locale}/app/verify-email`);
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (bot.token === null) return;
    if (!givenName.trim()) {
      setErrors({ givenName: t('register.givenNameRequired') });
      return;
    }
    if (confirm !== password) {
      setErrors({ confirm: t('passwordMismatch') });
      confirmBox.current?.querySelector('input')?.focus();
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

  return (
    <AuthHeading title={t('register.title')} size="page">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <TextField
            label={t('register.givenName')}
            value={givenName}
            onChange={setGivenName}
            autoComplete="given-name"
            maxLength={50}
            error={errors.givenName}
          />
          <TextField
            label={t('register.familyName')}
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
            error={errors.email}
          />
          {errors.email && <ConsentLink href={`/${locale}/app/forgot-password`}>{t('login.forgot')}</ConsentLink>}
        </div>
        <PasswordField
          label={t('password')}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          description={errors.password?.length ? undefined : t('register.passwordHint')}
        />
        <PasswordRules rules={errors.password ?? []} />
        <div ref={confirmBox}>
          <PasswordField
            label={t('register.confirmPassword')}
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              if (errors.confirm) setErrors((current) => ({ ...current, confirm: undefined }));
            }}
            autoComplete="new-password"
            error={errors.confirm}
          />
        </div>
        <Checkbox isSelected={consent} onChange={setConsent}>
          {t.rich('register.consent', {
            terms: (chunks) => <ConsentLink href={`/${locale}/terms`} newTab>{chunks}</ConsentLink>,
            privacy: (chunks) => <ConsentLink href={`/${locale}/privacy`} newTab>{chunks}</ConsentLink>,
          })}
        </Checkbox>
        {bot.widget}
        <FormError message={errors.form ?? null} />
        <Button type="submit" size="lg" isPending={busy} isDisabled={!consent || birthDate === null || !store || bot.token === null}>
          {t('register.submit')}
        </Button>
        <OrDivider />
        <GoogleSignIn next={`/${locale}/app`} />
        <SwitchAuthLink question={t('register.haveAccount')} label={t('register.login')} href={`/${locale}/app/login`} />
      </form>
    </AuthHeading>
  );
}
