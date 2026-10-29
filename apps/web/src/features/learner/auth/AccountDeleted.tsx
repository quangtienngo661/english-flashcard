'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthCard } from './AuthCard';

/** Design §9.4 step 5: shown to someone who has no account (or no session) any more. `?pending=1`: the deletion is being finished. */
export function AccountDeleted() {
  const t = useTranslations('App.deleteAccount');
  const locale = useLocale();
  const pending = useSearchParams().get('pending') === '1';
  return (
    <AuthCard title={pending ? t('pendingTitle') : t('doneTitle')} intro={pending ? t('pendingBody') : t('doneBody')}>
      <Link href={`/${locale}/app/login`} className="w-fit text-ui font-semibold text-primary underline underline-offset-2">
        {t('toLogin')}
      </Link>
    </AuthCard>
  );
}
