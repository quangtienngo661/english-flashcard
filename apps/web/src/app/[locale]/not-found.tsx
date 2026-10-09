import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';

export default async function NotFound() {
  const t = await getTranslations('NotFound');
  return (
    <Container className="flex flex-col items-start gap-4 py-24">
      <h1 className="text-h2 font-extrabold text-ink">{t('title')}</h1>
      <p className="max-w-prose text-subtitle text-muted">{t('body')}</p>
      <ButtonLink href="/">{t('home')}</ButtonLink>
    </Container>
  );
}
