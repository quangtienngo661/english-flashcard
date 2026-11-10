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
  const confirmBox = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<{ code?: string; password?: PasswordRule[]; confirm?: string; form?: string }>({});
  // Written by the forgot-password page; absent when this page is opened on its own, then the learner types it (UW-1).
  const [pendingEmail] = useState(readPendingEmail);
  const [typedEmail, setTypedEmail] = useState('');
  const email = pendingEmail ?? typedEmail.trim();

  const { submit, busy } = useSubmitOnce(async () => {
    await createApiClient({ send: store!.send }).post('/v1/auth/password/reset', {
      email,
      code: code.replace(/\s/g, ''),
      new_password: password,
    });
    clearPendingEmail();
    hardReplace(`/${locale}/app/login?reset=1`);
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (confirm !== password) {
      setErrors({ confirm: t('passwordMismatch') });
      confirmBox.current?.querySelector('input')?.focus();
      return;
    }
    setErrors({});
    try {
      await submit();
    } catch (failure) {
      const rules = passwordViolations(failure);
      if (failure instanceof ApiError && failure.problem.slug === 'invalid-otp') setErrors({ code: errorText(failure) });
      else if (rules.length) setErrors({ password: rules });
      else setErrors({ form: errorText(failure) });
    }
  }

  return (
    <AuthHeading title={t('reset.title')} onBack={() => hardReplace(`/${locale}/app/forgot-password`)}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-5">
        {pendingEmail === null && (
          <TextField label={t('email')} type="email" value={typedEmail} onChange={setTypedEmail} autoComplete="email" spellCheck={false} />
        )}
        <OtpField label={t('reset.code')} digitLabel={(n) => t('verify.digit', { n })} value={code} onChange={setCode} />
        <FormError message={errors.code ?? null} />
        <PasswordField
          label={t('reset.newPassword')}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          description={errors.password?.length ? undefined : t('reset.hint')}
        />
        <PasswordRules rules={errors.password ?? []} />
        <div ref={confirmBox}>
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
        </div>
        <FormError message={errors.form ?? null} />
        <Button type="submit" size="lg" isPending={busy} isDisabled={!store || !email || !/^\d{6}$/.test(code) || !password}>
          {t('reset.submit')}
        </Button>
      </form>
    </AuthHeading>
  );
}
