'use client';

import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { safeNext } from '@/app-shell/locale-prefix';
import { hardReplace } from '@/app-shell/navigate';
import { useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/ui/Button';
import { Flag } from '@/ui/Flag';
import { Select } from '@/ui/Select';
import type { AppLocale } from '@/i18n/routing';
import { AuthHeading, FormError } from './AuthHeading';

/** K/06, K/06b: the language of meanings and of the app, chosen once (E9); then back to `?next` under that language. */
export function WelcomeLanguage() {
  const t = useTranslations('App.auth.welcome');
  const errorText = useErrorMessage();
  const locale = useLocale() as AppLocale;
  const params = useSearchParams();
  const { store } = useSession();
  const [language, setLanguage] = useState<AppLocale>(locale);
  const [error, setError] = useState<string | null>(null);

  const { submit, busy } = useSubmitOnce(async () => {
    await createApiClient({ send: store!.send }).patch('/v1/me', { native_language: language });
    await store!.recheck();
    hardReplace(safeNext(params.get('next'), language));
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
    <AuthHeading title={t('title')} intro={t('body')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 md:gap-5">
        <Select
          label={t('language')}
          value={language}
          onChange={(id) => setLanguage(id as AppLocale)}
          items={(['vi', 'en'] as const).map((code) => ({ id: code, label: t(code), icon: <Flag code={code} /> }))}
        />
        <FormError message={error} />
        <Button type="submit" size="lg" isPending={busy} isDisabled={!store}>
          {t('submit')}
          <ArrowRight aria-hidden className="size-4" />
        </Button>
      </form>
    </AuthHeading>
  );
}
