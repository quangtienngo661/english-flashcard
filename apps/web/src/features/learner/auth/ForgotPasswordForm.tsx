'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { writePendingEmail } from '@/app-shell/session/pending-email';
import { useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { useTurnstile } from './use-turnstile';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { AuthHeading, FormError } from './AuthHeading';
import { CaptchaPending } from './CaptchaPending';
import { useFocusFirstInvalid } from './focus-first-invalid';

/** K/04 (Figma 36:417 / 37:656): ask for a reset code; the API answers the same whether the email has an account or not. */
export function ForgotPasswordForm() {
  const t = useTranslations('App.auth');
  const errorText = useErrorMessage();
  const locale = useLocale();
  const params = useSearchParams();
  const { store } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string | undefined>(undefined);
  const form = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(form);
  const bot = useTurnstile();

  const { submit, busy } = useSubmitOnce(async () => {
    try {
      await createApiClient({ send: store!.send }).post('/v1/auth/otp', { purpose: 'reset_password', email: email.trim(), turnstile_token: bot.token });
    } catch (failure) {
      bot.reset();
      throw failure;
    }
    // Session storage, not the URL: the address would sit in the browser history and in request logs (UW-1).
    writePendingEmail(email.trim());
    hardReplace(`/${locale}/app/reset-password`);
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (bot.token === null) return;
    setError(null);
    setMissing(email.trim() ? undefined : t('required.email'));
    if (!email.trim()) {
      focusFirstInvalid();
      return;
    }
    try {
      await submit();
    } catch (failure) {
      setError(errorText(failure));
    }
  }

  // Design §4.2: an account a staff member created must set a new password first.
  const intro = params.get('reason') === 'change-password' ? t('forgot.mustChange') : t('forgot.body');

  return (
    <AuthHeading title={t('forgot.title')} intro={intro} onBack={() => hardReplace(`/${locale}/app/login`)}>
      <form ref={form} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField label={t('email')} type="email" value={email} onChange={setEmail} autoComplete="email" spellCheck={false} error={missing} />
        {bot.widget}
        <FormError message={error} />
        <CaptchaPending show={bot.pending} />
        <Button type="submit" size="lg" isPending={busy} isDisabled={!store || bot.token === null}>
          {t('forgot.submit')}
        </Button>
      </form>
    </AuthHeading>
  );
}
