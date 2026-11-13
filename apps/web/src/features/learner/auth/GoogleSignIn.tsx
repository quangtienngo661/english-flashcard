'use client';

import { useLocale, useTranslations } from 'next-intl';
import { apiBaseUrl } from '@/app-shell/config';
import { GoogleButton } from '@/ui/GoogleButton';

/**
 * "Tiếp tục với Google" (design §9.1): a full page change to the API, which sends the browser to Google and back. It does not touch the
 * sign-out flag: if the trip fails the old session must not resume by itself (FE38, plan review P21).
 */
export function GoogleSignIn({ next }: { next: string }) {
  const t = useTranslations('App');
  const locale = useLocale();
  return (
    <GoogleButton
      onPress={() => {
        // The API is another origin: a full page change, not a Next route.
        const target = new URL('/v1/auth/google/start', apiBaseUrl());
        target.search = new URLSearchParams({ intent: 'login', locale, next }).toString();
        window.location.assign(target.toString());
      }}
    >
      {t('auth.google')}
    </GoogleButton>
  );
}
