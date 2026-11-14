'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { clearPendingEmail, readPendingEmail } from '@/app-shell/session/pending-email';
import { useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/ui/Button';
import { OtpField } from '@/ui/OtpField';
import { PasswordField } from '@/ui/PasswordField';
import { TextField } from '@/ui/TextField';
import { AuthHeading, FormError, passwordViolations, PasswordRules, type PasswordRule } from './AuthHeading';
import { useFocusFirstInvalid } from './focus-first-invalid';
import { CaptchaPending } from './CaptchaPending';
import { useTurnstile } from './use-turnstile';

type Errors = {
  email?: string;
  code?: string;
  /** "Nhập mật khẩu." for an empty field; `password` is the rules the API named. */
  passwordMissing?: string;
  password?: PasswordRule[];
  confirm?: string;
  form?: string;
};

/**
 * K/05 (Figma 36:447 / 37:687): the code from the email in six boxes and a new password typed twice; other devices are signed out,
 * then the learner signs in. "Nhập lại mật khẩu mới" is checked here only: the request body is the same as without it.
 */
export function ResetPasswordForm() {
  const t = useTranslations('App.auth');
  const errorText = useErrorMessage();
  const locale = useLocale();
  const { store } = useSession();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const form = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(form);
  const showErrors = (next: Errors) => {
    setErrors(next);
    focusFirstInvalid();
  };
  // Written by the forgot-password page; absent when this page is opened on its own, then the learner types it (UW-1).
  const [pendingEmail] = useState(readPendingEmail);
  const [typedEmail, setTypedEmail] = useState('');
  const email = pendingEmail ?? typedEmail.trim();

  // Review 07/11 F7: the reset runs argon2 for anyone, so it needs a bot-check token.
  const bot = useTurnstile();
  const { submit, busy } = useSubmitOnce(async () => {
    try {
      await createApiClient({ send: store!.send }).post('/v1/auth/password/reset', {
        email,
        code: code.replace(/\s/g, ''),
        new_password: password,
        turnstile_token: bot.token,
      });
    } catch (failure) {
      // The form stays on the page after a failure, so the spent token is replaced; a success leaves the page.
      bot.reset();
      throw failure;
    }
    clearPendingEmail();
    hardReplace(`/${locale}/app/login?reset=1`);
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (bot.token === null) return;
    const local: Errors = {
      ...(email ? {} : { email: t('required.email') }),
      ...(/^\d{6}$/.test(code) ? {} : { code: t('required.code') }),
      ...(password ? {} : { passwordMissing: t('required.password') }),
      ...(password && confirm !== password ? { confirm: t('passwordMismatch') } : {}),
    };
    if (Object.keys(local).length > 0) return showErrors(local);
    setErrors({});
    try {
      await submit();
    } catch (failure) {
      const rules = passwordViolations(failure);
      if (failure instanceof ApiError && failure.problem.slug === 'invalid-otp') showErrors({ code: errorText(failure) });
      else if (rules.length) showErrors({ password: rules });
      else setErrors({ form: errorText(failure) });
    }
  }

  return (
    <AuthHeading title={t('reset.title')} onBack={() => hardReplace(`/${locale}/app/forgot-password`)}>
      <form ref={form} onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-5">
        {pendingEmail === null && (
          <TextField label={t('email')} type="email" value={typedEmail} onChange={setTypedEmail} autoComplete="email" spellCheck={false} error={errors.email} />
        )}
        <OtpField label={t('reset.code')} digitLabel={(n) => t('verify.digit', { n })} value={code} onChange={setCode} error={errors.code} />
        <PasswordField
          label={t('reset.newPassword')}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={errors.passwordMissing}
          isInvalid={Boolean(errors.password?.length)}
          description={errors.password?.length || errors.passwordMissing ? undefined : t('reset.hint')}
        />
        <PasswordRules rules={errors.password ?? []} />
        <PasswordField
          label={t('reset.confirmPassword')}
          value={confirm}
          onChange={(value) => {
            setConfirm(value);
            if (errors.confirm) setErrors((current) => ({ ...current, confirm: undefined }));
          }}
          autoComplete="new-password"
          error={errors.confirm}
        />
        <FormError message={errors.form ?? null} />
        {bot.widget}
        <CaptchaPending show={bot.pending} />
        <Button type="submit" size="lg" isPending={busy} isDisabled={!store || bot.token === null}>
          {t('reset.submit')}
        </Button>
      </form>
    </AuthHeading>
  );
}
