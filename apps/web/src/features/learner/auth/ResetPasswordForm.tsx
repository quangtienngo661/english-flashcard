'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { TextField } from '@/app-ui/TextField';
import { AuthCard, FormError, passwordViolations, PasswordRules, type PasswordRule } from './AuthCard';

/** K/05: the code from the email and a new password; other devices are signed out, then the learner signs in. */
export function ResetPasswordForm() {
  const t = useTranslations('App.auth');
  const errorText = useErrorMessage();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { store } = useSession();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ code?: string; password?: PasswordRule[]; form?: string }>({});
  const email = params.get('email') ?? '';

  const { submit, busy } = useSubmitOnce(async () => {
    await createApiClient({ send: store!.send }).post('/v1/auth/password/reset', {
      email,
      code: code.replace(/\s/g, ''),
      new_password: password,
    });
    router.replace(`/${locale}/app/login?reset=1`);
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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
    <AuthCard title={t('reset.title')} onBack={() => router.replace(`/${locale}/app/forgot-password`)}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField label={t('reset.code')} value={code} onChange={setCode} inputMode="numeric" autoComplete="one-time-code" error={errors.code} />
        <TextField
          label={t('reset.newPassword')}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          description={errors.password?.length ? undefined : t('reset.hint')}
        />
        <PasswordRules rules={errors.password ?? []} />
        <FormError message={errors.form ?? null} />
        <Button type="submit" variant="sticker" size="lg" isPending={busy} isDisabled={!store || !code || !password}>
          {t('reset.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
