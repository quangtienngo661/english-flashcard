import { getTranslations } from 'next-intl/server';
import type { WaitlistLabels } from '@/components/interactive/WaitlistForm';

// The policy name stays plain text while legal links are hidden until launch (owner, 09/10/2026).
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
        <span className="font-semibold">
          {chunks}
        </span>
      ),
    }),
  };
}
