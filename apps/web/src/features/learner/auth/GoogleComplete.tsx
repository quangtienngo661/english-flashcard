'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { createApiClient } from '@/app-shell/api/client';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { apiBaseUrl } from '@/app-shell/config';
import { hardReplace } from '@/app-shell/navigate';
import { useSession } from '@/app-shell/session/session-context';
import { deviceTimezone } from '@/app-shell/timezone-sync';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Checkbox } from '@/app-ui/Checkbox';
import { DateOfBirthField } from '@/app-ui/DateOfBirthField';
import { TextField } from '@/app-ui/TextField';
import { AuthCard, FormError, GoogleButton } from './AuthCard';

type Info = { email: string; needs_name: boolean };
type Loaded = { kind: 'ready'; info: Info } | { kind: 'expired' } | { kind: 'error'; message: string } | { kind: 'loading' };

/**
 * Design §9.2: the person came back from Google with no account yet. The ticket is a cookie on the API host, so both calls go with a
 * plain `fetch` (credentials included) and not through the session transport, which would treat the expired-ticket 401 as an expired
 * session and sign the person out (plan review P19).
 */
export function GoogleComplete({ today }: { today?: string }) {
  const t = useTranslations('App.auth');
  const tg = useTranslations('App.auth.googleComplete');
  const locale = useLocale();
  const errorText = useErrorMessage();
  const { store } = useSession();
  const api = useMemo(
    () => createApiClient({
      send: (path, init) => fetch(`${apiBaseUrl()}${path}`, { ...init, headers: { ...(init.headers as Record<string, string>), 'X-CSRF-Protection': '1' } }),
    }),
    [],
  );
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.get<Info>('/v1/auth/google/complete').then(
      (info) => { if (alive) setLoaded({ kind: 'ready', info }); },
      (failure: unknown) => {
        if (!alive) return;
        setLoaded(failure instanceof ApiError && failure.problem.status === 401 ? { kind: 'expired' } : { kind: 'error', message: errorText(failure) });
      },
    );
    return () => { alive = false; };
    // errorText only formats; the ticket is read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const needsName = loaded.kind === 'ready' && loaded.info.needs_name;
  const { submit, busy } = useSubmitOnce(async () => {
    const session = await api.post<{ access_token: string }>('/v1/auth/google/complete', {
      birth_date: birthDate!, accept_terms: true, timezone: deviceTimezone(),
      ...(needsName ? { given_name: givenName.trim(), ...(familyName.trim() ? { family_name: familyName.trim() } : {}) } : {}),
    });
    await store!.startFromToken(session.access_token);
    hardReplace(`/${locale}/app`);
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setTooYoung(false);
    try {
      await submit();
    } catch (failure) {
      if (failure instanceof ApiError && failure.problem.slug === 'age-below-minimum') setTooYoung(true);
      else if (failure instanceof ApiError && failure.problem.status === 401) setLoaded({ kind: 'expired' });
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

  if (loaded.kind === 'loading') return <AuthCard title={tg('title')}><p className="text-ui text-muted">…</p></AuthCard>;
  if (loaded.kind === 'expired') {
    return (
      <AuthCard title={tg('expiredTitle')} intro={tg('expiredBody')}>
        <GoogleButton next={`/${locale}/app`} />
      </AuthCard>
    );
  }
  if (loaded.kind === 'error') return <AuthCard title={tg('title')}><FormError message={loaded.message} /></AuthCard>;

  return (
    <AuthCard title={tg('title')} intro={tg('intro', { email: loaded.info.email })}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {needsName && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t('register.givenName')} placeholder={t('register.givenNamePlaceholder')} value={givenName} onChange={setGivenName} autoComplete="given-name" maxLength={50} />
            <TextField label={t('register.familyName')} placeholder={t('register.familyNamePlaceholder')} value={familyName} onChange={setFamilyName} autoComplete="family-name" maxLength={50} />
          </div>
        )}
        <DateOfBirthField
          label={t('register.birthDate')}
          description={t('register.birthDateHint')}
          onChange={(iso) => { setTooYoung(false); setBirthDate(iso); }}
          serverError={tooYoung ? 'tooYoung' : null}
          today={today}
        />
        <Checkbox isSelected={consent} onChange={setConsent}>
          {t.rich('register.consent', { terms: link(`/${locale}/terms`), privacy: link(`/${locale}/privacy`) })}
        </Checkbox>
        <FormError message={error} />
        {tooYoung && (
          <Link href={`/${locale}/app/login`} className="w-fit text-ui font-semibold text-primary underline underline-offset-2">
            {tg('toLogin')}
          </Link>
        )}
        <Button type="submit" variant="sticker" size="lg" isPending={busy} isDisabled={!store || birthDate === null || !consent || (needsName && givenName.trim() === '')}>
          {tg('submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
