'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { safeNext } from '@/app-shell/locale-prefix';
import { hardReplace } from '@/app-shell/navigate';
import { useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Checkbox } from '@/app-ui/Checkbox';
import { DateOfBirthField } from '@/app-ui/DateOfBirthField';
import type { AppLocale } from '@/i18n/routing';
import { AuthCard, FormError } from './AuthCard';

/**
 * AD18: an account without a birth date or without consent (made by an admin, or older than those columns) gives them here
 * once, with the sign-up rules (13+, the terms box), before anything else in the app.
 */
export function CompleteProfile({ today }: { today?: string }) {
  const t = useTranslations('App.auth');
  const errorText = useErrorMessage();
  const locale = useLocale() as AppLocale;
  const params = useSearchParams();
  const { state, store } = useSession();
  const me = state.status === 'signed-in' ? state.me : null;
  const needsBirth = me?.birth_date === null;
  const needsTerms = me?.terms_accepted_at === null;
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { submit, busy } = useSubmitOnce(async () => {
    await createApiClient({ send: store!.send }).patch('/v1/me', {
      ...(needsBirth ? { birth_date: birthDate! } : {}),
      ...(needsTerms ? { accept_terms: true } : {}),
    });
    await store!.recheck();
    hardReplace(safeNext(params.get('next'), locale));
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setTooYoung(false);
    try {
      await submit();
    } catch (failure) {
      if (failure instanceof ApiError && failure.problem.slug === 'age-below-minimum') setTooYoung(true);
      else setError(errorText(failure));
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
    <AuthCard title={t('complete.title')} intro={t('complete.body')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {needsBirth && (
          <DateOfBirthField
            label={t('register.birthDate')}
            description={t('register.birthDateHint')}
            onChange={setBirthDate}
            serverError={tooYoung ? 'tooYoung' : null}
            today={today}
          />
        )}
        {needsTerms && (
          <Checkbox isSelected={consent} onChange={setConsent}>
            {t.rich('register.consent', { terms: link(`/${locale}/terms`), privacy: link(`/${locale}/privacy`) })}
          </Checkbox>
        )}
        <FormError message={error} />
        <Button
          type="submit"
          variant="sticker"
          size="lg"
          isPending={busy}
          isDisabled={!store || !me || (needsBirth && birthDate === null) || (needsTerms && !consent)}
        >
          {t('complete.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
