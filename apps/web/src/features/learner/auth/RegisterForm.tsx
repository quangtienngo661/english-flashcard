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
import { useTurnstile } from './use-turnstile';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { DateOfBirthField } from '@/ui/DateOfBirthField';
import { PasswordField } from '@/ui/PasswordField';
import { TextField } from '@/ui/TextField';
import { AuthHeading, ConsentLink, FormError, OrDivider, passwordViolations, PasswordRules, SwitchAuthLink, type PasswordRule } from './AuthHeading';
import { CaptchaPending } from './CaptchaPending';
import { useFocusFirstInvalid } from './focus-first-invalid';
import { GoogleSignIn } from './GoogleSignIn';

/**
 * K/01, K/01b: sign-up (Figma 35:405 / 37:533). The button stays on (QA5): a press checks every field first, shows what is wrong
 * under each one and focuses the first; only a pending bot check keeps it off. "Nhập lại mật khẩu" is checked here only: a mismatch
 * sends nothing, and the request body is the same as without the field.
 */
type Errors = {
  givenName?: string;
  birthDate?: string;
  email?: string;
  age?: boolean;
  /** "Nhập mật khẩu." for an empty field; `password` is the rules the API named. */
  passwordMissing?: string;
  password?: PasswordRule[];
  confirm?: string;
  consent?: string;
  form?: string;
};

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
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const form = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(form);
  const showErrors = (next: Errors) => {
    setErrors(next);
    focusFirstInvalid();
  };

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
    // Field order. An under-13 date is already marked by the field itself (birthDate null); only an empty one gets "Chọn ngày sinh.".
    const local: Errors = {
      ...(givenName.trim() ? {} : { givenName: t('register.givenNameRequired') }),
      ...(birthDate === null ? { birthDate: t('required.birthDate') } : {}),
      ...(email.trim() ? {} : { email: t('required.email') }),
      ...(password ? {} : { passwordMissing: t('required.password') }),
      ...(password && confirm !== password ? { confirm: t('passwordMismatch') } : {}),
      ...(consent ? {} : { consent: t('required.consent') }),
    };
    if (Object.keys(local).length > 0) return showErrors(local);
    setErrors({});
    try {
      await submit();
    } catch (error) {
      const slug = error instanceof ApiError ? error.problem.slug : '';
      const rules = passwordViolations(error);
      // A deleting account still holds the address (design §6.2): say so instead of the "already registered" hint.
      if (slug === 'email-taken' && error instanceof ApiError && error.problem.extensions?.reason === 'account-deleting') showErrors({ email: t('register.accountDeleting') });
      else if (slug === 'email-taken') showErrors({ email: errorText(error) });
      else if (slug === 'age-below-minimum') showErrors({ age: true });
      else if (rules.length) showErrors({ password: rules });
      else setErrors({ form: errorText(error) });
    }
  }

  return (
    <AuthHeading title={t('register.title')} size="page">
      <form ref={form} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
          requiredError={errors.birthDate}
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
          error={errors.passwordMissing}
          isInvalid={Boolean(errors.password?.length)}
          description={errors.password?.length || errors.passwordMissing ? undefined : t('register.passwordHint')}
        />
        <PasswordRules rules={errors.password ?? []} />
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
        <Checkbox isSelected={consent} onChange={setConsent} error={errors.consent}>
          {t.rich('register.consent', {
            terms: (chunks) => <ConsentLink href={`/${locale}/terms`} newTab>{chunks}</ConsentLink>,
            privacy: (chunks) => <ConsentLink href={`/${locale}/privacy`} newTab>{chunks}</ConsentLink>,
          })}
        </Checkbox>
        {bot.widget}
        <FormError message={errors.form ?? null} />
        <CaptchaPending show={bot.pending} />
        <Button type="submit" size="lg" isPending={busy} isDisabled={!store || bot.token === null}>
          {t('register.submit')}
        </Button>
        <OrDivider />
        <GoogleSignIn next={`/${locale}/app`} />
        <SwitchAuthLink question={t('register.haveAccount')} label={t('register.login')} href={`/${locale}/app/login`} />
      </form>
    </AuthHeading>
  );
}
