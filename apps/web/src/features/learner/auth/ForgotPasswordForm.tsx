'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { TextField } from '@/app-ui/TextField';
import { AuthCard, FormError } from './AuthCard';

/** K/04: ask for a reset code; the API answers the same whether the email has an account or not. */
export function ForgotPasswordForm() {
  const t = useTranslations('App.auth');
  const errorText = useErrorMessage();
  const locale = useLocale();
  const params = useSearchParams();
  const { store } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { submit, busy } = useSubmitOnce(async () => {
    await createApiClient({ send: store!.send }).post('/v1/auth/otp', { purpose: 'reset_password', email: email.trim() });
    hardReplace(`/${locale}/app/reset-password?email=${encodeURIComponent(email.trim())}`);
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await submit();
    } catch (failure) {
      setError(errorText(failure));
    }
  }

  // Design §4.2: an account a staff member created must set a new password first.
  const intro = params.get('reason') === 'change-password' ? t('forgot.mustChange') : t('forgot.body');

  return (
    <AuthCard title={t('forgot.title')} intro={intro} onBack={() => hardReplace(`/${locale}/app/login`)}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField label={t('email')} type="email" value={email} onChange={setEmail} autoComplete="email" spellCheck={false} />
        <FormError message={error} />
        <Button type="submit" variant="sticker" size="lg" isPending={busy} isDisabled={!store || !email.trim()}>
          {t('forgot.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
