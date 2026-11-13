'use client';

import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ButtonLink } from '@/ui/ButtonLink';
import { AuthHeading } from './AuthHeading';

/**
 * Design §9.4 step 5 (Figma 36:549 / 37:791): shown to someone who has no account (or no session) any more. `?pending=1`: the deletion
 * is being finished.
 */
export function AccountDeleted() {
  const t = useTranslations('App.deleteAccount');
  const locale = useLocale();
  const pending = useSearchParams().get('pending') === '1';
  return (
    <AuthHeading
      title={pending ? t('pendingTitle') : t('doneTitle')}
      intro={pending ? t('pendingBody') : t('doneBody')}
      size="small"
      centered
      above={
        <span aria-hidden className="flex size-14 items-center justify-center self-center rounded-wm-pill bg-wm-accent-soft text-wm-accent md:size-16">
          <Check className="size-6.5 md:size-7" />
        </span>
      }
    >
      <ButtonLink href={`/${locale}/app/login`} variant="secondary" className="self-center">
        {t('toLogin')}
      </ButtonLink>
    </AuthHeading>
  );
}
