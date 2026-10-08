import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/ui/Container';

// Draft only (spec §12): the legal text must be written and reviewed before launch.
export async function LegalDraft({ titleKey }: { titleKey: 'privacyTitle' | 'termsTitle' }) {
  const t = await getTranslations('Legal');
  return (
    <Container className="flex flex-col gap-4 py-16 md:py-24">
      <h1 className="text-h2 font-extrabold text-ink">{t(titleKey)}</h1>
      <p className="max-w-prose text-subtitle text-muted">{t('draftNotice')}</p>
    </Container>
  );
}
