import { getTranslations } from 'next-intl/server';
import type { WaitlistLabels } from '@/components/interactive/WaitlistForm';

// Keep the policy text visible while navigation to the draft policy is disabled.
export async function getWaitlistLabels(): Promise<WaitlistLabels> {
  const t = await getTranslations('Waitlist');
  return {
    emailLabel: t('emailLabel'),
    emailPlaceholder: t('emailPlaceholder'),
    submit: t('submit'),
    submitting: t('submitting'),
    invalidEmail: t('invalidEmail'),
    missingConsent: t('missingConsent'),
    error: t('error'),
    success: t('success'),
    consent: t.rich('consent', {
      link: (chunks) => (
        <span role="link" aria-disabled="true" className="cursor-default font-semibold underline underline-offset-2">
          {chunks}
        </span>
      ),
    }),
  };
}
