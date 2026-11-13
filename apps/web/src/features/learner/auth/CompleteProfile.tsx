'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { safeNext } from '@/app-shell/locale-prefix';
import { hardReplace } from '@/app-shell/navigate';
import { useSession } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { DateOfBirthField } from '@/ui/DateOfBirthField';
import type { AppLocale } from '@/i18n/routing';
import { AuthHeading, ConsentLink, FormError } from './AuthHeading';
import { useFocusFirstInvalid } from './focus-first-invalid';

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
  // A first consent, or the terms an admin updated since (legal documents).
  const termsUpdated = me?.terms_outdated === true && me.terms_accepted_at !== null;
  const needsTerms = me?.terms_accepted_at === null || me?.terms_outdated === true;
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ birthDate?: string; consent?: string }>({});
  const form = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(form);

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
    const empty = {
      ...(needsBirth && birthDate === null ? { birthDate: t('required.birthDate') } : {}),
      ...(needsTerms && !consent ? { consent: t('required.consent') } : {}),
    };
    setMissing(empty);
    if (empty.birthDate || empty.consent) {
      focusFirstInvalid();
      return;
    }
    try {
      await submit();
    } catch (failure) {
      if (failure instanceof ApiError && failure.problem.slug === 'age-below-minimum') {
        setTooYoung(true);
        focusFirstInvalid();
      }
      else setError(errorText(failure));
    }
  }

  return (
    <AuthHeading title={termsUpdated ? t('complete.updatedTitle') : t('complete.title')} intro={termsUpdated ? t('complete.updatedBody') : t('complete.body')}>
      <form ref={form} onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-5">
        {needsBirth && (
          <DateOfBirthField
            label={t('register.birthDate')}
            description={t('register.birthDateHint')}
            onChange={setBirthDate}
            serverError={tooYoung ? 'tooYoung' : null}
            requiredError={missing.birthDate}
            today={today}
          />
        )}
        {needsTerms && (
          <Checkbox isSelected={consent} onChange={setConsent} error={missing.consent}>
            {t.rich('register.consent', {
              terms: (chunks) => <ConsentLink href={`/${locale}/terms`} newTab>{chunks}</ConsentLink>,
              privacy: (chunks) => <ConsentLink href={`/${locale}/privacy`} newTab>{chunks}</ConsentLink>,
            })}
          </Checkbox>
        )}
        <FormError message={error} />
        {/* `!me`: the account is not loaded yet, so which fields it lacks is not known. */}
        <Button type="submit" size="lg" isPending={busy} isDisabled={!store || !me}>
          {t('complete.submit')}
        </Button>
      </form>
    </AuthHeading>
  );
}
