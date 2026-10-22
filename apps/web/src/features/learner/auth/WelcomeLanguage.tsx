'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { safeNext } from '@/app-shell/locale-prefix';
import { useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Flag } from '@/app-ui/Flag';
import { Select } from '@/app-ui/Select';
import type { AppLocale } from '@/i18n/routing';
import { AuthCard, FormError } from './AuthCard';

/** K/06, K/06b: the language of meanings and of the app, chosen once (E9); then back to `?next` under that language. */
export function WelcomeLanguage() {
  const t = useTranslations('App.auth.welcome');
  const errorText = useErrorMessage();
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const params = useSearchParams();
  const { store } = useSession();
  const [language, setLanguage] = useState<AppLocale>(locale);
  const [error, setError] = useState<string | null>(null);

  const { submit, busy } = useSubmitOnce(async () => {
    await createApiClient({ send: store!.send }).patch('/v1/me', { native_language: language });
    await store!.recheck();
    router.replace(safeNext(params.get('next'), language));
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

  return (
    <AuthCard title={t('title')} intro={t('body')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Select
          label={t('language')}
          value={language}
          onChange={(id) => setLanguage(id as AppLocale)}
          items={(['vi', 'en'] as const).map((code) => ({ id: code, label: t(code), icon: <Flag code={code} /> }))}
        />
        <FormError message={error} />
        <Button type="submit" variant="sticker" size="lg" isPending={busy} isDisabled={!store}>
          {t('submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
