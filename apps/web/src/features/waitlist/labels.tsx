import { getTranslations } from 'next-intl/server';
import type { WaitlistLabels } from '@/components/interactive/WaitlistForm';
import { Link } from '@/i18n/navigation';

// Link the consent text to the published, localized privacy policy.
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
        <Link href="/privacy" className="font-semibold underline underline-offset-2">
          {chunks}
        </Link>
      ),
    }),
  };
}
