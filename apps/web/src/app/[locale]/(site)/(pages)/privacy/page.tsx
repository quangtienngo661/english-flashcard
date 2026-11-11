import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getLegal, pickLanguage } from '@/lib/legal';
import { LegalDraft } from '@/site/legal/LegalDraft';
import { LegalLayout } from '@/site/legal/LegalLayout';

// Read from the API at each request: an admin publishes a new version without a deploy.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Legal' });
  const legal = await getLegal();
  return {
    title: t('privacyTitle'),
    ...(legal ? {} : { description: t('draftNotice') }),
    alternates: { canonical: `/${locale}/privacy` },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [legal, t] = await Promise.all([getLegal(), getTranslations({ locale, namespace: 'Legal' })]);
  const title = t('privacyTitle');
  const lead = t('privacyLead');
  if (!legal) return <LegalDraft title={title} lead={lead} />;
  return (
    <LegalLayout
      kind="privacy"
      title={title}
      lead={lead}
      version={legal.version}
      effectiveDate={legal.effective_date}
      markdown={pickLanguage(legal.privacy, locale)}
    />
  );
}
